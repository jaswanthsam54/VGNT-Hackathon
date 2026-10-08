/**
 * Generative AI Legal Explanation & Remediation Engine.
 * Translates deterministic compliance findings and tamper flags
 * into plain-English legal advice citing exact statutory clauses.
 */

import type { ComplianceVerdict } from './rule-engine';
import type { ExtractedFields } from './field-extractor';
import type { TamperDetectionResult } from './tamper-engine';

export interface AiLegalExplanation {
  headline: string;
  summary: string;
  legalClauses: string[];
  remediationAdvice: string[];
  severityLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export function generateLegalExplanation(
  verdict: ComplianceVerdict,
  fields: ExtractedFields,
  tamper?: TamperDetectionResult
): AiLegalExplanation {
  const legalClauses: string[] = [];
  const remediationAdvice: string[] = [];
  let severityLevel: AiLegalExplanation['severityLevel'] = 'LOW';

  // 1. Tamper / Alteration Analysis
  if (tamper?.isTampered) {
    severityLevel = 'HIGH';
    legalClauses.push('LMA 2009 - Section 36 (Penalty for altered declarations & non-standard packaging)');
    legalClauses.push('LMPC 2011 - Rule 6 (Declarations must be clearly and indelibly printed)');
    
    remediationAdvice.push('Immediately withdraw batch from circulation for forensic packaging audit.');
    remediationAdvice.push('Ensure price markings are part of the original flexographic/gravure cylinder plate rather than manual adhesive stickers.');
    
    return {
      headline: `Suspicious Label Alteration Flagged (${tamper.confidence}% Confidence)`,
      summary: `The product label shows significant indicators of manipulation: ${tamper.anomalyReasons.join('; ')}. Under Section 36 of the Legal Metrology Act, 2009, selling pre-packaged commodities with altered or superimposed declarations attracts statutory fines and product seizure.`,
      legalClauses,
      remediationAdvice,
      severityLevel,
    };
  }

  // 2. Non-Compliant Missing Declarations
  const failedChecks = verdict.checks.filter(c => c.status === 'FAIL');
  const warnChecks = verdict.checks.filter(c => c.status === 'WARN');

  if (failedChecks.length > 0 || warnChecks.length > 0) {
    severityLevel = failedChecks.some(c => c.severity === 'critical') ? 'HIGH' : 'MEDIUM';

    for (const check of failedChecks) {
      if (!legalClauses.includes(check.rule_ref)) {
        legalClauses.push(`${check.rule_ref} (${check.label})`);
      }

      if (check.id === 'unit_sale_price') {
        remediationAdvice.push('Add Unit Sale Price (USP) formatted as ₹/g or ₹/ml directly adjacent to the MRP declaration.');
      } else if (check.id === 'generic_name') {
        remediationAdvice.push('Add the generic commodity name (e.g. "Chilli Powder", "Wheat Flour") on the Principal Display Panel.');
      } else if (check.id === 'manufacturer_name') {
        remediationAdvice.push('Print complete name and street address of the manufacturing or packaging unit.');
      } else if (check.id === 'consumer_care') {
        remediationAdvice.push('Provide complete consumer grievance contact details: telephone helpline, email, and postal address.');
      } else {
        remediationAdvice.push(`Incorporate mandatory declaration for ${check.label}.`);
      }
    }

    for (const check of warnChecks) {
      if (check.id === 'mrp_tax_declaration') {
        legalClauses.push('Rule 6(1)(f) (Tax Declaration)');
        remediationAdvice.push("Append statutory suffix '(Inclusive of all taxes)' alongside MRP.");
      }
    }

    return {
      headline: `Regulatory Gaps Identified (${failedChecks.length} Missing Mandatory Declarations)`,
      summary: `The scanned packaging fails compliance with Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011. Key required disclosures are absent or incomplete, exposing the packer and distributor to statutory notice.`,
      legalClauses,
      remediationAdvice,
      severityLevel,
    };
  }

  // 3. Fully Compliant
  legalClauses.push('Legal Metrology Act, 2009');
  legalClauses.push('LMPC Rules 2011 - Rule 6 & Rule 11');
  remediationAdvice.push('Current artwork complies with pre-packaged commodity standards. Safe for distribution.');

  return {
    headline: 'Packaging Complies with LMPC Standards',
    summary: 'All mandatory declarations including commodity identity, net content, manufacturer, MRP, USP, and consumer grievance contacts are verified and present.',
    legalClauses,
    remediationAdvice,
    severityLevel: 'LOW',
  };
}
