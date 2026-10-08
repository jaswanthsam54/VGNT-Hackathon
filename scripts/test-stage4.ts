import assert from 'node:assert';
import { extractFields } from '../lib/field-extractor';
import { detectTampering } from '../lib/tamper-engine';
import { runRuleEngine } from '../lib/rule-engine';
import { generateLegalExplanation } from '../lib/ai-explainer';

// 1. Tampered case
const tamperedText = `
Product: Chilli Powder
Mfd by: Aachi Spices Pvt Ltd
Net Weight: 200 g
MRP: Rs. 50.00
MRP: Rs. 500.00 (inclusive of all taxes)
USP: Rs. 0.25 / g
Mfg. Date: 10/2024
`;
const fields1 = extractFields(tamperedText);
const tamper1 = detectTampering(tamperedText, fields1);
const verdict1 = runRuleEngine(fields1, tamper1);
const expl1 = generateLegalExplanation(verdict1, fields1, tamper1);

assert.strictEqual(expl1.severityLevel, 'HIGH');
assert.ok(expl1.legalClauses.some(c => c.includes('Section 36')), 'Must cite Section 36 for tampering');
assert.ok(expl1.remediationAdvice.length > 0, 'Must provide remediation advice');

// 2. Non-compliant case (missing USP)
const missingUspText = `
Generic Name: Biscuits
Mfd by: Britannia Industries Ltd
Net Weight: 100 g
MRP: Rs. 20.00
Mfg. Date: 01/2025
Consumer Care: 1800 123 456
`;
const fields2 = extractFields(missingUspText);
const tamper2 = detectTampering(missingUspText, fields2);
const verdict2 = runRuleEngine(fields2, tamper2);
const expl2 = generateLegalExplanation(verdict2, fields2, tamper2);

assert.ok(expl2.legalClauses.some(c => c.includes('Rule 6(11)')), 'Must cite Rule 6(11) for missing USP');
assert.ok(expl2.remediationAdvice.some(a => a.includes('Unit Sale Price')), 'Must recommend adding USP');

// 3. Fully compliant case
const compliantText = `
Generic Name: Red Chilli Powder
Mfd by: Aachi Spices & Foods Pvt. Ltd.
Net Qty: 200 g
MRP: Rs. 54.00 (inclusive of all taxes)
USP: Rs. 0.27 / g
Date of Mfg: 10/2024
Consumer Care: 1800 425 2244
`;
const fields3 = extractFields(compliantText);
const tamper3 = detectTampering(compliantText, fields3);
const verdict3 = runRuleEngine(fields3, tamper3);
const expl3 = generateLegalExplanation(verdict3, fields3, tamper3);

assert.strictEqual(expl3.severityLevel, 'LOW');
assert.ok(expl3.headline.includes('Complies'));

console.log('Stage 4 GenAI Explainer Self-Check PASSED!');
