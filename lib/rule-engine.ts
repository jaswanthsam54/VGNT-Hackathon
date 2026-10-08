/**
 * Rule Engine — checks extracted fields against Legal Metrology Rules 2011, Rule 6.
 * Returns a structured compliance verdict.
 */

import type { ExtractedFields } from './field-extractor';

export type Severity = 'critical' | 'major' | 'minor';
export type RuleStatus = 'PASS' | 'FAIL' | 'WARN' | 'N/A';

export interface RuleCheck {
  id: string;
  label: string;
  rule_ref: string;
  status: RuleStatus;
  severity: Severity;
  found?: string;
  note?: string;
}

export interface ComplianceVerdict {
  overall: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL' | 'TAMPER_SUSPECT';
  score: number;           // 0–100
  total_checks: number;
  passed: number;
  failed: number;
  checks: RuleCheck[];
  summary: string;
}

export function runRuleEngine(
  fields: ExtractedFields,
  tamper?: { isTampered: boolean; confidence: number; anomalyReasons: string[] }
): ComplianceVerdict {
  const checks: RuleCheck[] = [];

  function check(
    id: string,
    label: string,
    rule_ref: string,
    severity: Severity,
    required: boolean,
    note?: string
  ) {
    const val = (fields as Record<string, unknown>)[id];
    let status: RuleStatus;

    if (val) {
      status = 'PASS';
    } else if (required) {
      status = 'FAIL';
    } else {
      status = 'N/A';  // optional and not found — inform only
    }

    checks.push({ id, label, rule_ref, status, severity, found: typeof val === 'string' ? val : undefined, note });
  }

  // Mandatory fields (Rule 6)
  check('manufacturer_name', 'Manufacturer / Packer Name & Address', 'Rule 6(1)(a)', 'critical', true);
  check('generic_name',      'Generic / Common Commodity Name',       'Rule 6(1)(b)', 'critical', true);
  check('net_quantity',      'Net Quantity',                          'Rule 6(1)(b)', 'critical', true);
  check('mrp',               'Maximum Retail Price (MRP)',            'Rule 6(1)(f)', 'critical', true);
  check('unit_sale_price',   'Unit Sale Price (USP)',                 'Rule 6(11)',   'major',    true, 'Mandatory per 2021 LMPC amendment');
  check('month_year_of_mfg', 'Month & Year of Manufacture',          'Rule 6(1)(d)', 'critical', true);
  check('consumer_care',     'Consumer Care / Helpline',              'Rule 6(1)(l)', 'major',    true);

  // MRP Tax Declaration Check (Rule 6(1)(f))
  if (fields.mrp) {
    if (fields.mrp_has_tax_clause) {
      checks.push({
        id: 'mrp_tax_declaration',
        label: "Tax Clause ('Inclusive of all taxes')",
        rule_ref: 'Rule 6(1)(f)',
        status: 'PASS',
        severity: 'major',
        found: 'Declared',
      });
    } else {
      checks.push({
        id: 'mrp_tax_declaration',
        label: "Tax Clause ('Inclusive of all taxes')",
        rule_ref: 'Rule 6(1)(f)',
        status: 'WARN',
        severity: 'major',
        found: 'Not detected',
        note: "MRP must explicitly declare 'inclusive of all taxes'",
      });
    }
  }

  // Conditional / optional
  check('country_of_origin', 'Country of Origin',      'Rule 6(1)(m)',         'major', false, 'Mandatory for imported goods');
  check('fssai_lic',         'FSSAI Licence Number',   'FSS Act 2006',         'major', false, 'Mandatory for food products');
  check('batch_lot',         'Batch / Lot Number',     'Rule 6(1)(e)',         'minor', false);
  check('expiry_date',       'Best Before / Expiry',   'Rule 6(1)(d) Sch. II', 'major', false, 'Mandatory for perishable goods');

  const required = checks.filter(c => c.status !== 'N/A');
  const passed   = required.filter(c => c.status === 'PASS').length;
  const failed   = required.filter(c => c.status === 'FAIL').length;
  const score    = required.length > 0 ? Math.round((passed / required.length) * 100) : 0;

  const criticalFails = checks.filter(c => c.status === 'FAIL' && c.severity === 'critical').length;

  let overall: ComplianceVerdict['overall'];
  if (tamper?.isTampered) {
    overall = 'TAMPER_SUSPECT';
  } else if (criticalFails > 0 || score < 60) {
    overall = 'NON_COMPLIANT';
  } else if (score < 100) {
    overall = 'PARTIAL';
  } else {
    overall = 'COMPLIANT';
  }

  const summary =
    overall === 'TAMPER_SUSPECT'
      ? `Possible label tampering detected (${tamper?.confidence}% confidence): ${tamper?.anomalyReasons[0] || 'Inconsistent declarations detected'}.`
      : overall === 'COMPLIANT'
      ? 'All mandatory declarations found. The label appears compliant with Legal Metrology (PC) Rules, 2011.'
      : overall === 'NON_COMPLIANT'
      ? `${failed} mandatory declaration(s) missing. The label is NON-COMPLIANT with Rule 6 of Legal Metrology (PC) Rules, 2011.`
      : `${failed} optional/conditional field(s) not detected. Review may be required depending on product category.`;

  return {
    overall,
    score,
    total_checks: required.length,
    passed,
    failed,
    checks,
    summary,
  };
}
