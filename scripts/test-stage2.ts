import assert from 'node:assert';
import { extractFields } from '../lib/field-extractor';
import { detectTampering } from '../lib/tamper-engine';
import { runRuleEngine } from '../lib/rule-engine';

// Test 1: Slide example - Conflicting MRP sticker (₹50 vs ₹500)
const tamperedMprText = `
Product: Chilli Powder
Mfd by: Aachi Spices Pvt Ltd
Net Weight: 200 g
MRP: Rs. 50.00
MRP: Rs. 500.00 (inclusive of all taxes)
USP: Rs. 0.25 / g
Date of Mfg: 05/2024
Consumer Helpline: 1800 123 456
`;

const fields1 = extractFields(tamperedMprText);
const tamper1 = detectTampering(tamperedMprText, fields1);
const verdict1 = runRuleEngine(fields1, tamper1);

assert.strictEqual(tamper1.isTampered, true, 'Must detect dual conflicting MRP');
assert.ok(tamper1.confidence >= 75, `Confidence must be >= 75% (was ${tamper1.confidence}%)`);
assert.strictEqual(verdict1.overall, 'TAMPER_SUSPECT', 'Overall verdict must be TAMPER_SUSPECT');
assert.ok(tamper1.anomalyReasons.some(r => r.includes('Conflicting MRP')), 'Must list conflicting MRP reason');

// Test 2: Mathematical discrepancy (Net Qty 100g, USP Rs. 0.50/g, Stated MRP Rs. 500.00)
const mathMismatchText = `
Product: Turmeric Powder
Mfd by: Everest Foods
Net Qty: 100 g
MRP: Rs. 500.00 (inclusive of all taxes)
USP: Rs. 0.50 / g
Date of Mfg: 06/2024
Consumer Care: 1800 223 344
`;

const fields2 = extractFields(mathMismatchText);
const tamper2 = detectTampering(mathMismatchText, fields2);

assert.strictEqual(tamper2.isTampered, true, 'Must detect mathematical mismatch between USP and MRP');
assert.ok(tamper2.anomalyReasons.some(r => r.includes('Mathematical price mismatch')));

// Test 3: Normal authentic packaging
const authenticText = `
Generic Name: Red Chilli Powder
Mfd by: Aachi Spices & Foods Pvt. Ltd.
Net Qty: 200 g
MRP: Rs. 54.00 (inclusive of all taxes)
USP: Rs. 0.27 / g
Date of Mfg: 10/2024
Consumer Care: 1800 425 2244
`;

const fields3 = extractFields(authenticText);
const tamper3 = detectTampering(authenticText, fields3);
const verdict3 = runRuleEngine(fields3, tamper3);

assert.strictEqual(tamper3.isTampered, false, 'Clean label should not flag tampering');
assert.strictEqual(verdict3.overall, 'COMPLIANT', 'Clean label should be COMPLIANT');

console.log('Stage 2 Tamper Engine Self-Check PASSED!');
