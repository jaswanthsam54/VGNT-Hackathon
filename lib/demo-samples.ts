/**
 * Pre-calibrated packaging samples for instantaneous demonstration
 * and testing without requiring external camera uploads.
 */

import type { ExtractedFields } from './field-extractor';
import type { DetectedRegion } from './region-mapper';

export interface DemoSample {
  id: string;
  name: string;
  category: string;
  badge: string;
  badgeColor: string;
  description: string;
  imageSvg: string;
  ocrText: string;
  fields: ExtractedFields;
  regions: DetectedRegion[];
}

export const DEMO_SAMPLES: DemoSample[] = [
  {
    id: 'sample-amul',
    name: 'Amul Taaza Milk 1000ml',
    category: 'Dairy FMCG',
    badge: '100% Compliant',
    badgeColor: '#1A6B0A',
    description: 'Fully compliant package with all Rule 6 statutory declarations and Unit Sale Price.',
    imageSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="420" viewBox="0 0 400 420"><rect width="400" height="420" fill="%23FFFFFF" rx="8" stroke="%23003087" stroke-width="3"/><rect width="380" height="70" x="10" y="10" fill="%23003087" rx="4"/><text x="20" y="45" font-family="Arial" font-size="24" font-weight="bold" fill="%23FFFFFF">Amul</text><text x="20" y="66" font-family="Arial" font-size="13" fill="%23E0E8F5">The Taste of India &bull; Taaza Toned Milk</text><rect x="15" y="90" width="370" height="315" fill="%23F8FAFD" rx="6" stroke="%23E0E8F5"/><text x="30" y="120" font-family="Arial" font-size="14" font-weight="bold" fill="%23111">Generic Name: Standardised Toned Milk</text><text x="30" y="148" font-family="Arial" font-size="14" font-weight="bold" fill="%23111">Net Qty: 1000 ml</text><text x="30" y="176" font-family="Arial" font-size="14" font-weight="bold" fill="%23111">MRP: Rs. 54.00 (incl. of all taxes)</text><text x="30" y="204" font-family="Arial" font-size="14" font-weight="bold" fill="%23111">USP: Rs. 0.054 / ml</text><text x="30" y="232" font-family="Arial" font-size="13" fill="%23333">Mfd Date: 10/2024 &bull; Batch: B104A</text><text x="30" y="258" font-family="Arial" font-size="13" fill="%23333">Country of Origin: India</text><text x="30" y="284" font-family="Arial" font-size="12" fill="%23444">Mfd by: Gujarat Co-operative Milk Marketing Federation Ltd, Anand</text><text x="30" y="310" font-family="Arial" font-size="12" fill="%23444">FSSAI Lic. No: 10012021000071</text><text x="30" y="336" font-family="Arial" font-size="12" fill="%23444">Consumer Care: 1800-258-3333 | care@amul.coop</text><rect x="30" y="355" width="220" height="30" fill="%232E7D32" rx="4"/><text x="40" y="375" font-family="Arial" font-size="12" font-weight="bold" fill="%23FFFFFF">&check; LMPC COMPLIANT DECLARATION</text></svg>`,
    ocrText: `Amul Taaza Homogenised Toned Milk\nGeneric Name: Standardised Toned Milk\nNet Qty: 1000 ml\nMRP: Rs. 54.00 (incl. of all taxes)\nUSP: Rs. 0.054 / ml\nMfd Date: 10/2024\nBatch No: B104A\nCountry of Origin: India\nMfd by: Gujarat Co-operative Milk Marketing Federation Ltd, Anand - 388001\nFSSAI Lic. No: 10012021000071\nConsumer Care: 1800-258-3333`,
    fields: {
      generic_name: 'Standardised Toned Milk',
      net_quantity: '1000 ml',
      mrp: '54.00',
      mrp_has_tax_clause: true,
      unit_sale_price: '0.054 / ml',
      month_year_of_mfg: '10/2024',
      batch_lot: 'B104A',
      country_of_origin: 'India',
      manufacturer_name: 'Gujarat Co-operative Milk Marketing Federation Ltd, Anand',
      fssai_lic: '10012021000071',
      consumer_care: '1800-258-3333',
    },
    regions: [
      { id: 'reg-amul-gen', label: 'Generic Name', value: 'Standardised Toned Milk', confidence: 98, status: 'COMPLIANT', normalized: { top: 25, left: 6, width: 85, height: 7 } },
      { id: 'reg-amul-qty', label: 'Net Quantity', value: '1000 ml', confidence: 99, status: 'COMPLIANT', normalized: { top: 32, left: 6, width: 50, height: 7 } },
      { id: 'reg-amul-mrp', label: 'MRP (Inclusive of Taxes)', value: 'Rs. 54.00', confidence: 97, status: 'COMPLIANT', normalized: { top: 39, left: 6, width: 75, height: 7 } },
      { id: 'reg-amul-usp', label: 'Unit Sale Price', value: 'Rs. 0.054 / ml', confidence: 96, status: 'COMPLIANT', normalized: { top: 46, left: 6, width: 65, height: 7 } },
      { id: 'reg-amul-mfg', label: 'Mfg Date', value: '10/2024', confidence: 95, status: 'COMPLIANT', normalized: { top: 53, left: 6, width: 55, height: 7 } },
    ],
  },
  {
    id: 'sample-aachi',
    name: 'Aachi Chilli Powder 100g',
    category: 'Spices / Food',
    badge: '🚨 Tamper Suspect',
    badgeColor: '#D84315',
    description: 'Dual-MRP sticker detected: Base package printed ₹50, altered secondary sticker ₹500.',
    imageSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="420" viewBox="0 0 400 420"><rect width="400" height="420" fill="%23FFF5F2" rx="8" stroke="%23D84315" stroke-width="3"/><rect width="380" height="65" x="10" y="10" fill="%23D84315" rx="4"/><text x="20" y="42" font-family="Arial" font-size="22" font-weight="bold" fill="%23FFFFFF">AACHI SPICES</text><text x="20" y="60" font-family="Arial" font-size="12" fill="%23FFE5DF">Premium Red Chilli Powder</text><rect x="15" y="85" width="370" height="320" fill="%23FFFFFF" rx="6" stroke="%23E0E0E0"/><text x="30" y="115" font-family="Arial" font-size="13" font-weight="bold" fill="%23111">Generic Name: Red Chilli Powder</text><text x="30" y="140" font-family="Arial" font-size="13" font-weight="bold" fill="%23111">Net Qty: 100 g</text><rect x="25" y="152" width="160" height="26" fill="%23EEEEEE" stroke="%23999"/><text x="30" y="170" font-family="Arial" font-size="13" text-decoration="line-through" fill="%23777">MRP: Rs. 50.00</text><rect x="195" y="148" width="185" height="34" fill="%23FFF9C4" stroke="%23D84315" stroke-width="2"/><text x="205" y="171" font-family="Arial" font-size="15" font-weight="bold" fill="%23D84315">&bull; MRP: Rs. 500.00</text><text x="30" y="208" font-family="Arial" font-size="13" font-weight="bold" fill="%23111">USP: Rs. 0.50 / g</text><text x="30" y="235" font-family="Arial" font-size="13" fill="%23333">Mfg Date: 09/2024 &bull; Batch: ACH88</text><text x="30" y="262" font-family="Arial" font-size="12" fill="%23444">Mfd by: Aachi Spices &amp; Foods Pvt Ltd, Chennai - 600040</text><text x="30" y="288" font-family="Arial" font-size="12" fill="%23444">FSSAI Lic. No: 10014042001556</text><text x="30" y="314" font-family="Arial" font-size="12" fill="%23444">Consumer Care: 1800-425-4555</text><rect x="25" y="335" width="350" height="55" fill="%23FFEBEE" rx="4" stroke="%23C62828"/><text x="35" y="355" font-family="Arial" font-size="12" font-weight="bold" fill="%23C62828">&bull; TAMPER DETECTED: Multi-layer sticker detected</text><text x="35" y="375" font-family="Arial" font-size="11" fill="%23B71C1C">Section 36 Penalty: ₹50 vs ₹500 price distortion (900% mark-up)</text></svg>`,
    ocrText: `AACHI SPICES\nGeneric Name: Red Chilli Powder\nNet Qty: 100 g\nMRP: Rs. 50.00\nMRP: Rs. 500.00 (incl of all taxes)\nUSP: Rs. 0.50 / g\nMfg Date: 09/2024\nBatch: ACH88\nMfd by: Aachi Spices & Foods Pvt Ltd, Chennai - 600040\nFSSAI Lic. No: 10014042001556\nConsumer Care: 1800-425-4555`,
    fields: {
      generic_name: 'Red Chilli Powder',
      net_quantity: '100 g',
      mrp: '500.00',
      mrp_has_tax_clause: true,
      unit_sale_price: '0.50 / g',
      month_year_of_mfg: '09/2024',
      batch_lot: 'ACH88',
      country_of_origin: 'India',
      manufacturer_name: 'Aachi Spices & Foods Pvt Ltd, Chennai',
      fssai_lic: '10014042001556',
      consumer_care: '1800-425-4555',
    },
    regions: [
      { id: 'reg-aachi-base', label: 'Base MRP', value: 'Rs. 50.00', confidence: 92, status: 'TAMPER', normalized: { top: 37, left: 6, width: 40, height: 7 } },
      { id: 'reg-aachi-stk', label: 'Overprinted Sticker', value: 'Rs. 500.00', confidence: 96, status: 'TAMPER', normalized: { top: 36, left: 49, width: 46, height: 9 } },
      { id: 'reg-aachi-qty', label: 'Net Quantity', value: '100 g', confidence: 98, status: 'COMPLIANT', normalized: { top: 31, left: 6, width: 45, height: 7 } },
      { id: 'reg-aachi-usp', label: 'Unit Sale Price', value: 'Rs. 0.50 / g', confidence: 93, status: 'COMPLIANT', normalized: { top: 48, left: 6, width: 50, height: 7 } },
    ],
  },
  {
    id: 'sample-everest',
    name: 'Everest Garam Masala 100g',
    category: 'Spices / Food',
    badge: '⚠️ Missing USP',
    badgeColor: '#C0392B',
    description: 'Non-compliant: Omits mandatory Unit Sale Price required under Rule 6(11) of LMPC Rules.',
    imageSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="420" viewBox="0 0 400 420"><rect width="400" height="420" fill="%23FFFDF5" rx="8" stroke="%23D97706" stroke-width="3"/><rect width="380" height="65" x="10" y="10" fill="%23D97706" rx="4"/><text x="20" y="42" font-family="Arial" font-size="22" font-weight="bold" fill="%23FFFFFF">EVEREST MASALA</text><text x="20" y="60" font-family="Arial" font-size="12" fill="%23FEF3C7">Pure Spices &bull; Garam Masala</text><rect x="15" y="85" width="370" height="320" fill="%23FFFFFF" rx="6" stroke="%23E0E0E0"/><text x="30" y="115" font-family="Arial" font-size="13" font-weight="bold" fill="%23111">Generic Name: Garam Masala</text><text x="30" y="145" font-family="Arial" font-size="13" font-weight="bold" fill="%23111">Net Qty: 100 g</text><text x="30" y="175" font-family="Arial" font-size="13" font-weight="bold" fill="%23111">MRP: Rs. 82.00 (incl. of all taxes)</text><rect x="25" y="195" width="350" height="32" fill="%23FEF2F2" stroke="%23DC2626" rx="3"/><text x="35" y="216" font-family="Arial" font-size="12" font-weight="bold" fill="%23DC2626">&cross; VIOLATION: Unit Sale Price (USP) OMITTED</text><text x="30" y="252" font-family="Arial" font-size="13" fill="%23333">Mfg Date: 08/2024 &bull; Batch: EV449</text><text x="30" y="278" font-family="Arial" font-size="12" fill="%23444">Mfd by: Everest Food Products Pvt Ltd, Mumbai - 400053</text><text x="30" y="304" font-family="Arial" font-size="12" fill="%23444">FSSAI Lic. No: 10016022005432</text><text x="30" y="330" font-family="Arial" font-size="12" fill="%23444">Consumer Care: 1800-22-9900 | care@everest.in</text><text x="30" y="375" font-family="Arial" font-size="11" font-style="italic" fill="%23666">Form VII Notice triggered under Rule 6(11) of LMPC Rules, 2011</text></svg>`,
    ocrText: `EVEREST MASALA\nGeneric Name: Garam Masala\nNet Qty: 100 g\nMRP: Rs. 82.00 (incl. of all taxes)\nMfg Date: 08/2024\nBatch: EV449\nMfd by: Everest Food Products Pvt Ltd, Mumbai - 400053\nFSSAI Lic. No: 10016022005432\nConsumer Care: 1800-22-9900`,
    fields: {
      generic_name: 'Garam Masala',
      net_quantity: '100 g',
      mrp: '82.00',
      mrp_has_tax_clause: true,
      unit_sale_price: undefined,
      month_year_of_mfg: '08/2024',
      batch_lot: 'EV449',
      country_of_origin: 'India',
      manufacturer_name: 'Everest Food Products Pvt Ltd, Mumbai',
      fssai_lic: '10016022005432',
      consumer_care: '1800-22-9900',
    },
    regions: [
      { id: 'reg-ev-gen', label: 'Generic Name', value: 'Garam Masala', confidence: 97, status: 'COMPLIANT', normalized: { top: 25, left: 6, width: 60, height: 7 } },
      { id: 'reg-ev-qty', label: 'Net Quantity', value: '100 g', confidence: 98, status: 'COMPLIANT', normalized: { top: 32, left: 6, width: 45, height: 7 } },
      { id: 'reg-ev-mrp', label: 'MRP (Inclusive of Taxes)', value: 'Rs. 82.00', confidence: 96, status: 'COMPLIANT', normalized: { top: 39, left: 6, width: 75, height: 7 } },
      { id: 'reg-ev-mfg', label: 'Mfg Date', value: '08/2024', confidence: 94, status: 'COMPLIANT', normalized: { top: 57, left: 6, width: 50, height: 7 } },
    ],
  },
];
