/**
 * POST /api/scan
 * Accepts multipart/form-data with field "image".
 * Returns JSON: { ocrText, fields, verdict }
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createWorker } from 'tesseract.js';
import { extractFields } from '@/lib/field-extractor';
import { runRuleEngine } from '@/lib/rule-engine';
import { detectTampering } from '@/lib/tamper-engine';
import { mapDetectedRegions } from '@/lib/region-mapper';
import { generateLegalExplanation } from '@/lib/ai-explainer';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image uploaded' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported image format. Please upload JPG, PNG, WEBP, BMP or TIFF.' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image too large (max 10 MB).' }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run OCR
    const worker = await createWorker('eng', 1, {
      logger: () => {},  // suppress verbose logs
    });
    const { data } = await worker.recognize(buffer);
    await worker.terminate();

    const ocrText = data.text || '';
    const fields  = extractFields(ocrText);
    const tamper  = detectTampering(ocrText, fields);
    const verdict = runRuleEngine(fields, tamper);

    const lines: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number }; confidence: number }> = [];
    if (data.blocks) {
      for (const block of data.blocks) {
        for (const paragraph of block.paragraphs) {
          for (const line of paragraph.lines) {
            lines.push({
              text: line.text,
              bbox: line.bbox,
              confidence: line.confidence,
            });
          }
        }
      }
    }
    const imgWidth = lines.length > 0 ? Math.max(...lines.map(l => l.bbox.x1), 100) : 1000;
    const imgHeight = lines.length > 0 ? Math.max(...lines.map(l => l.bbox.y1), 100) : 1000;
    const regions = mapDetectedRegions(lines, fields, tamper, imgWidth, imgHeight);
    const explanation = generateLegalExplanation(verdict, fields, tamper);
    const evidenceHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const timestamp = new Date().toISOString();

    return NextResponse.json({
      ocrText,
      fields,
      verdict,
      tamper,
      regions,
      explanation,
      evidenceHash,
      timestamp,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[scan] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
