import assert from 'node:assert';
import { extractFields } from '../lib/field-extractor';
import { runRuleEngine } from '../lib/rule-engine';
import { detectTampering } from '../lib/tamper-engine';

console.log('--- Running Test Suite: Imperfect Real-World Packaging Scans ---');

// Case 1: Imperfect OCR with noise, line breaks, and O instead of 0 in price
const noisyOcr1 = `
M.R.P. (incl of all taxes)
Rs. 5O.OO
Generic Name: Red Chilli Powder
Net Wt: 200 gm
Mfg Date: 08/2024
Mfd by: M/s ABC Spices Pvt Ltd
USP: Rs. 0.25 / gm
Consumer Care: 1800-111-2222
`;

const fields1 = extractFields(noisyOcr1);
console.log('Test 1 fields extracted:', fields1);
assert.strictEqual(fields1.generic_name, 'Red Chilli Powder');
assert.strictEqual(fields1.net_quantity, '200 gm');
// Price was normalized from 5O.OO to 50.00
assert.strictEqual(fields1.mrp, '50.00');
assert.strictEqual(fields1.mrp_has_tax_clause, true);
assert.strictEqual(fields1.unit_sale_price, '0.25 / gm');

const v1 = runRuleEngine(fields1);
assert.strictEqual(v1.overall, 'COMPLIANT');
console.log('✅ Case 1: Noisy OCR with O-for-0 digit healing passed');

// Case 2: Multi-line PKD date and broken currency notation
const noisyOcr2 = `
Item: Garam Masala
NET QTY: 100 g
M R P : Rs 82/-
PKD: 09/2024
Customer Care: 1800-22-9900
Mfd by: Everest Food Products Pvt Ltd
`;

const fields2 = extractFields(noisyOcr2);
console.log('Test 2 fields extracted:', fields2);
assert.strictEqual(fields2.generic_name, 'Garam Masala');
assert.strictEqual(fields2.net_quantity, '100 g');
assert.strictEqual(fields2.mrp, '82.00');
assert.strictEqual(fields2.month_year_of_mfg, '09/2024');

// Without USP, it should fail Rule 6(11)
const v2 = runRuleEngine(fields2);
const uspCheck = v2.checks.find(c => c.id === 'unit_sale_price');
assert.strictEqual(uspCheck?.status, 'FAIL');
console.log('✅ Case 2: Multi-line and broken PKD date parsing passed');

// Case 3: Dual-MRP Tampering detection on noisy scan
const noisyTamperOcr = `
AACHI SPICES
Product: Red Chilli Powder
Net Qty: 100 g
MRP: Rs 50.00
MRP: Rs. 500.00 (inclusive of all taxes)
Mfd: 09/2024
Mfd by: Aachi Spices & Foods Pvt Ltd
`;
const fields3 = extractFields(noisyTamperOcr);
const tamper3 = detectTampering(noisyTamperOcr, fields3);
assert.strictEqual(tamper3.isTampered, true);
assert(tamper3.confidence >= 80);
console.log('✅ Case 3: Tampering detected on noisy OCR text passed');

console.log('\n🎉 ALL IMPERFECT SCAN TESTS PASSED!');
