/**
 * Tamper & Authenticity Detection Engine.
 * Detects manipulated labels, conflicting declarations, price tampering,
 * and mathematical inconsistencies between Net Qty, MRP, and USP.
 */

import type { ExtractedFields } from './field-extractor';

export interface FlaggedRegion {
  field: string;
  description: string;
  suspicionLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface TamperDetectionResult {
  isTampered: boolean;
  tamperScore: number;       // 0 to 100 visual/semantic anomaly score
  confidence: number;        // Confidence % of tampering assessment
  anomalyReasons: string[];
  flaggedRegions: FlaggedRegion[];
}

export function detectTampering(ocrText: string, fields: ExtractedFields): TamperDetectionResult {
  const anomalyReasons: string[] = [];
  const flaggedRegions: FlaggedRegion[] = [];
  let anomalyWeight = 0;

  const t = ocrText;

  // 1. Dual / Conflicting MRP Detection (e.g., ₹50.00 vs ₹500.00 pasted over)
  const mrpRegex = /(?:MRP|M\.R\.P|Maximum\s+Retail\s+Price)[:\s.]*(?:Rs\.?|INR|₹)?\s*([0-9]+(?:[.,][0-9]{1,2})?)/gi;
  const foundPrices: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = mrpRegex.exec(t)) !== null) {
    const val = parseFloat(match[1].replace(',', '.'));
    if (!isNaN(val) && !foundPrices.includes(val)) {
      foundPrices.push(val);
    }
  }

  if (foundPrices.length > 1) {
    const minP = Math.min(...foundPrices);
    const maxP = Math.max(...foundPrices);
    // Flag if prices differ significantly
    if (maxP / minP >= 1.3) {
      anomalyReasons.push(`Conflicting MRP declarations detected: ₹${minP.toFixed(2)} vs ₹${maxP.toFixed(2)} (possible sticker overwrite)`);
      flaggedRegions.push({
        field: 'mrp',
        description: `MRP sticker overwrite detected: dual declarations ₹${minP} vs ₹${maxP}`,
        suspicionLevel: 'HIGH',
      });
      anomalyWeight += 55;
    }
  }

  // 2. Mathematical Consistency: Net Quantity x USP vs MRP
  if (fields.net_quantity && fields.mrp && fields.unit_sale_price) {
    const qtyMatch = fields.net_quantity.match(/([0-9]+(?:\.[0-9]+)?)\s*(g|kg|ml|l|piece|unit)/i);
    const uspMatch = fields.unit_sale_price.match(/([0-9.]+)\s*(?:\/|per)\s*(100g|100ml|10g|g|kg|ml|l|piece|unit)/i);
    const statedMrp = parseFloat(fields.mrp.replace(',', '.'));

    if (qtyMatch && uspMatch && !isNaN(statedMrp)) {
      let qtyVal = parseFloat(qtyMatch[1]);
      const qtyUnit = qtyMatch[2].toLowerCase();
      let uspRate = parseFloat(uspMatch[1]);
      const uspUnit = uspMatch[2].toLowerCase();

      // Normalize standard metric grams & milliliters
      if (qtyUnit === 'kg') qtyVal *= 1000;
      if (qtyUnit === 'l') qtyVal *= 1000;

      let expectedPrice: number | null = null;
      if (uspUnit === 'g' || uspUnit === 'ml' || uspUnit === 'piece' || uspUnit === 'unit') {
        expectedPrice = qtyVal * uspRate;
      } else if (uspUnit === '100g' || uspUnit === '100ml') {
        expectedPrice = (qtyVal / 100) * uspRate;
      } else if (uspUnit === '10g') {
        expectedPrice = (qtyVal / 10) * uspRate;
      } else if (uspUnit === 'kg' || uspUnit === 'l') {
        expectedPrice = (qtyVal / 1000) * uspRate;
      }

      if (expectedPrice !== null && expectedPrice > 0) {
        const ratio = statedMrp / expectedPrice;
        if (ratio > 1.8 || ratio < 0.5) {
          anomalyReasons.push(
            `Mathematical price mismatch: Stated MRP ₹${statedMrp} does not match Unit Sale Price of ₹${uspRate}/${uspUnit} for ${fields.net_quantity} (Expected ~₹${expectedPrice.toFixed(2)})`
          );
          flaggedRegions.push({
            field: 'mrp',
            description: `Price tampering suspected: Declared MRP (₹${statedMrp}) conflicts with USP calculation (~₹${expectedPrice.toFixed(2)})`,
            suspicionLevel: 'HIGH',
          });
          anomalyWeight += 45;
        }
      }
    }
  }

  // 3. Irregular Digit Kerning / Digit Patching (e.g. "₹ 5  00" or double currency marks)
  if (/(?:MRP|Rs\.?|₹)\s*[0-9]\s{2,}[0-9]/i.test(t)) {
    anomalyReasons.push('Abnormal digit spacing detected in price field (indicates cut-and-paste manipulation)');
    flaggedRegions.push({
      field: 'mrp',
      description: 'Splicing/kerning anomaly: uneven spaces between price digits',
      suspicionLevel: 'MEDIUM',
    });
    anomalyWeight += 30;
  }

  // 4. Temporal Sequence Anomaly (Expiry precedes Manufacturing Date)
  if (fields.month_year_of_mfg && fields.expiry_date) {
    const parseDate = (s: string): { month: number; year: number } | null => {
      const parts = s.match(/([0-9]{1,2})[\/\-]([0-9]{2,4})/);
      if (parts) {
        let y = parseInt(parts[2], 10);
        if (y < 100) y += 2000;
        return { month: parseInt(parts[1], 10), year: y };
      }
      return null;
    };

    const mfgD = parseDate(fields.month_year_of_mfg);
    const expD = parseDate(fields.expiry_date);
    if (mfgD && expD) {
      if (expD.year < mfgD.year || (expD.year === mfgD.year && expD.month < mfgD.month)) {
        anomalyReasons.push(`Impossible date sequence: Expiry date (${fields.expiry_date}) is prior to manufacturing date (${fields.month_year_of_mfg})`);
        flaggedRegions.push({
          field: 'expiry_date',
          description: 'Date tampering: Expiry date precedes manufacturing date',
          suspicionLevel: 'HIGH',
        });
        anomalyWeight += 50;
      }
    }
  }

  const isTampered = anomalyWeight >= 40;
  const confidence = isTampered ? Math.min(95, 60 + Math.round(anomalyWeight * 0.4)) : 0;
  const tamperScore = Math.min(100, anomalyWeight);

  return {
    isTampered,
    tamperScore,
    confidence,
    anomalyReasons,
    flaggedRegions,
  };
}
