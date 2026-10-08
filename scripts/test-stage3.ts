import assert from 'node:assert';
import { extractFields } from '../lib/field-extractor';
import { detectTampering } from '../lib/tamper-engine';
import { mapDetectedRegions, type OcrLine } from '../lib/region-mapper';

const sampleLines: OcrLine[] = [
  { text: 'AACHI CHILLI POWDER', bbox: { x0: 50, y0: 20, x1: 450, y1: 70 }, confidence: 95 },
  { text: 'Generic Name: Chilli Powder', bbox: { x0: 50, y0: 80, x1: 350, y1: 110 }, confidence: 92 },
  { text: 'Mfd. by: Aachi Spices Pvt Ltd', bbox: { x0: 50, y0: 120, x1: 500, y1: 160 }, confidence: 90 },
  { text: 'Net Quantity: 200 g', bbox: { x0: 50, y0: 180, x1: 300, y1: 220 }, confidence: 94 },
  { text: 'MRP: Rs. 50.00 (inclusive of all taxes)', bbox: { x0: 50, y0: 240, x1: 420, y1: 280 }, confidence: 93 },
  { text: 'USP: Rs. 0.25 / g', bbox: { x0: 50, y0: 290, x1: 280, y1: 330 }, confidence: 91 },
  { text: 'Mfg. Date: 10/2024', bbox: { x0: 50, y0: 340, x1: 260, y1: 375 }, confidence: 89 },
];

const fullText = sampleLines.map(l => l.text).join('\n');
const fields = extractFields(fullText);
const tamper = detectTampering(fullText, fields);

const regions = mapDetectedRegions(sampleLines, fields, tamper, 600, 500);

assert.ok(regions.length >= 4, `Expected at least 4 regions, got ${regions.length}`);

const mrpRegion = regions.find(r => r.id === 'mrp');
assert.ok(mrpRegion, 'MRP region must be found');
assert.strictEqual(mrpRegion?.status, 'COMPLIANT', 'MRP region status must be COMPLIANT');
assert.ok(mrpRegion?.normalized.left >= 0 && mrpRegion?.normalized.left <= 100, 'Normalized left within 0-100%');
assert.ok(mrpRegion?.normalized.top >= 0 && mrpRegion?.normalized.top <= 100, 'Normalized top within 0-100%');

const netQtyRegion = regions.find(r => r.id === 'net_quantity');
assert.ok(netQtyRegion, 'Net Qty region must be found');
assert.strictEqual(netQtyRegion?.value, '200 g');

// Test tamper status propagation to bounding box
const tamperedLines: OcrLine[] = [
  { text: 'MRP: Rs. 50.00', bbox: { x0: 50, y0: 50, x1: 200, y1: 90 }, confidence: 90 },
  { text: 'MRP: Rs. 500.00', bbox: { x0: 50, y0: 100, x1: 220, y1: 140 }, confidence: 88 },
];
const tamperedText = tamperedLines.map(l => l.text).join('\n');
const tFields = extractFields(tamperedText);
const tTamper = detectTampering(tamperedText, tFields);
const tRegions = mapDetectedRegions(tamperedLines, tFields, tTamper, 500, 500);

const tamperedMrpRegion = tRegions.find(r => r.id === 'mrp');
assert.strictEqual(tamperedMrpRegion?.status, 'TAMPER', 'Tampered field must have TAMPER region status');

console.log('Stage 3 Region Mapper Self-Check PASSED!');
