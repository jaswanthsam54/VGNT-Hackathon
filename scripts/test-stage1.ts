import assert from 'node:assert';
import { extractFields } from '../lib/field-extractor';
import { runRuleEngine } from '../lib/rule-engine';

const sampleText = `
AACHI RED CHILLI POWDER
Generic Name: Chilli Powder
Mfd. by: Aachi Spices & Foods Pvt. Ltd., Plot No. 1926, 34th Street, Chennai - 600040
Net Qty: 200 g
MRP: Rs. 54.00 (inclusive of all taxes)
USP: Rs. 0.27 / g
Mfg. Date: 10/2024
Consumer Care: 1800 425 2244
Country of Origin: India
FSSAI Lic. No.: 10015042000000
Batch No: ACH202410
Best Before: 10/2025
`;

const fields = extractFields(sampleText);

assert.strictEqual(fields.generic_name, 'Chilli Powder', 'Generic name must be extracted');
assert.strictEqual(fields.net_quantity, '200 g', 'Net quantity must be extracted');
assert.strictEqual(fields.mrp, '54.00', 'MRP must be extracted');
assert.strictEqual(fields.mrp_has_tax_clause, true, 'Tax inclusive clause must be detected');
assert.strictEqual(fields.unit_sale_price, '0.27 / g', 'USP must be extracted');

const verdict = runRuleEngine(fields);
const uspCheck = verdict.checks.find(c => c.id === 'unit_sale_price');
const genericCheck = verdict.checks.find(c => c.id === 'generic_name');
const taxCheck = verdict.checks.find(c => c.id === 'mrp_tax_declaration');

assert.strictEqual(uspCheck?.status, 'PASS', 'USP must PASS');
assert.strictEqual(genericCheck?.status, 'PASS', 'Generic name must PASS');
assert.strictEqual(taxCheck?.status, 'PASS', 'Tax declaration must PASS');
assert.strictEqual(verdict.overall, 'COMPLIANT', 'Full compliant label should have COMPLIANT verdict');

// Test non-compliant case where USP & tax suffix are missing
const sampleMissingUSP = `
Product: Biscuits
Mfd. by: Britannia Industries Ltd.
Net Wt: 100 g
MRP: Rs. 20.00
Mfg Date: 01/2025
Consumer Care: 1800 123 456
`;
const fieldsMissing = extractFields(sampleMissingUSP);
assert.strictEqual(fieldsMissing.mrp_has_tax_clause, false, 'Tax clause should be false');
assert.strictEqual(fieldsMissing.unit_sale_price, undefined, 'USP should be undefined');

const verdictMissing = runRuleEngine(fieldsMissing);
const uspCheckMissing = verdictMissing.checks.find(c => c.id === 'unit_sale_price');
const taxCheckMissing = verdictMissing.checks.find(c => c.id === 'mrp_tax_declaration');

assert.strictEqual(uspCheckMissing?.status, 'FAIL', 'Missing USP must FAIL under Rule 6(11)');
assert.strictEqual(taxCheckMissing?.status, 'WARN', 'Missing tax clause must WARN under Rule 6(1)(f)');

console.log('Stage 1 Self-Check PASSED!');
