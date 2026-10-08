/**
 * Maps OCR extracted lines/words to LMPC field bounding boxes.
 * Generates normalized percentages (0-100%) for responsive image overlays.
 */

import type { ExtractedFields } from './field-extractor';
import type { TamperDetectionResult } from './tamper-engine';

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrLine {
  text: string;
  bbox: BoundingBox;
  confidence: number;
}

export interface DetectedRegion {
  id: string;
  label: string;
  value: string;
  confidence: number;
  status: 'COMPLIANT' | 'TAMPER' | 'WARNING';
  normalized: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export function mapDetectedRegions(
  lines: OcrLine[],
  fields: ExtractedFields,
  tamper: TamperDetectionResult,
  imgWidth = 1000,
  imgHeight = 1000
): DetectedRegion[] {
  const regions: DetectedRegion[] = [];
  const safeW = Math.max(imgWidth, 100);
  const safeH = Math.max(imgHeight, 100);

  const fieldDefs: Array<{
    id: keyof ExtractedFields;
    label: string;
    matcher: RegExp;
  }> = [
    { id: 'mrp', label: 'MRP', matcher: /(?:MRP|M\.R\.P|₹|Rs\.?)/i },
    { id: 'net_quantity', label: 'Net Quantity', matcher: /(?:Net\s+Wt|Net\s+Qty|Quantity|Content)/i },
    { id: 'unit_sale_price', label: 'Unit Sale Price (USP)', matcher: /(?:USP|Unit\s+Sale|per\s+g|per\s+ml)/i },
    { id: 'month_year_of_mfg', label: 'Mfg. Date', matcher: /(?:Mfg|Manufactured|Date\s+of)/i },
    { id: 'expiry_date', label: 'Best Before / Expiry', matcher: /(?:Best\s+Before|Expiry|Exp|Use\s+By)/i },
    { id: 'manufacturer_name', label: 'Manufacturer', matcher: /(?:Mfd|Packed|Manufactured\s+by)/i },
    { id: 'fssai_lic', label: 'FSSAI Licence', matcher: /(?:FSSAI|Lic\.?\s*No)/i },
  ];

  for (const def of fieldDefs) {
    const val = fields[def.id];
    if (!val || typeof val !== 'string') continue;

    // Find the OCR line matching this field
    const matchedLine = lines.find(l => def.matcher.test(l.text) || l.text.includes(val));

    let status: DetectedRegion['status'] = 'COMPLIANT';
    if (tamper.isTampered && tamper.flaggedRegions.some(r => r.field === def.id)) {
      status = 'TAMPER';
    }

    if (matchedLine && matchedLine.bbox) {
      const b = matchedLine.bbox;
      const left = Math.max(0, Math.min(100, (b.x0 / safeW) * 100));
      const top = Math.max(0, Math.min(100, (b.y0 / safeH) * 100));
      const width = Math.max(2, Math.min(100 - left, ((b.x1 - b.x0) / safeW) * 100));
      const height = Math.max(2, Math.min(100 - top, ((b.y1 - b.y0) / safeH) * 100));

      regions.push({
        id: def.id,
        label: def.label,
        value: val,
        confidence: Math.round(matchedLine.confidence || 88),
        status,
        normalized: {
          left: Number(left.toFixed(2)),
          top: Number(top.toFixed(2)),
          width: Number(width.toFixed(2)),
          height: Number(height.toFixed(2)),
        },
      });
    } else {
      // Proportional fallback position so visual regions always render
      const idx = regions.length;
      regions.push({
        id: def.id,
        label: def.label,
        value: val,
        confidence: 85,
        status,
        normalized: {
          left: 10,
          top: 15 + idx * 12,
          width: 80,
          height: 8,
        },
      });
    }
  }

  return regions;
}
