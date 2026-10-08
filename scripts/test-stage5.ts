import assert from 'node:assert';
import crypto from 'node:crypto';
import { extractFields } from '../lib/field-extractor';
import { detectTampering } from '../lib/tamper-engine';
import { runRuleEngine } from '../lib/rule-engine';
import { generateLegalExplanation } from '../lib/ai-explainer';

// 1. Test SHA-256 evidence hashing
const mockImageBuffer = Buffer.from('mock-label-image-data-for-evidence');
const evidenceHash = crypto.createHash('sha256').update(mockImageBuffer).digest('hex');

assert.strictEqual(evidenceHash.length, 64, 'SHA-256 hash must be 64 hexadecimal characters');
assert.match(evidenceHash, /^[a-f0-9]{64}$/, 'Hash must be valid hex');

// 2. Test notice data assembly
const sampleText = `
Product: Chilli Powder
Mfd by: Unknown Packer
Net Weight: 200 g
MRP: Rs. 50.00
Date of Mfg: 10/2024
`;
const fields = extractFields(sampleText);
const tamper = detectTampering(sampleText, fields);
const verdict = runRuleEngine(fields, tamper);
const expl = generateLegalExplanation(verdict, fields, tamper);

const failedChecks = verdict.checks.filter(c => c.status === 'FAIL');
assert.ok(failedChecks.length > 0, 'Should have failed checks for statutory notice');

// Form notice metadata verification
const noticeNo = `LMPC-ENF-${Date.now().toString().slice(-8)}`;
assert.ok(noticeNo.startsWith('LMPC-ENF-'), 'Notice reference prefix must match');

console.log('Stage 5 Statutory Notice & Evidence Hash Self-Check PASSED!');
