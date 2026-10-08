/**
 * Regex-based field extractor for Legal Metrology label scanning.
 * No LLM / external API required.
 */

export interface ExtractedFields {
  manufacturer_name?: string;
  generic_name?: string;
  net_quantity?: string;
  mrp?: string;
  mrp_has_tax_clause?: boolean;
  unit_sale_price?: string;
  month_year_of_mfg?: string;
  consumer_care?: string;
  country_of_origin?: string;
  fssai_lic?: string;
  batch_lot?: string;
  expiry_date?: string;
}

function normalizeText(text: string): string {
  let cleaned = text
    // Normalize newlines and excess whitespace
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    // Normalize OCR misreadings of MRP & currency
    .replace(/M[\s.]*R[\s.]*P[\s.:]*/gi, 'MRP: ')
    .replace(/U[\s.]*S[\s.]*P[\s.:]*/gi, 'USP: ')
    .replace(/₹|INR|Rs\.?|RS\.?|R\s*s\s*\.?/gi, 'Rs. ')
    // Normalize PKD / Packed to Mfg
    .replace(/(?:P[\s.]*K[\s.]*D|Packed\s+(?:on|dt|date)?|Date\s+of\s+Pk[gd]|Pkg\s+Date)[:\s.]*/gi, 'Mfg Date: ')
    // Normalize Net Wt / Net Content variations
    .replace(/N[\s.]*E[\s.]*T[\s.]*(?:W[\s.]*T|Q[\s.]*T[\s.]*Y|Weight|Quantity)[:\s.]*/gi, 'Net Qty: ')
    // Normalize price endings like 54/- to 54.00
    .replace(/([0-9]+)\s*\/-(\s|$)/g, '$1.00$2');

  // Fix common OCR digit confusions in currency context (e.g. "MRP: Rs. 5O.OO" -> "MRP: Rs. 50.00")
  cleaned = cleaned.replace(/(?:MRP|USP|Rs\.)[:\s]*([0-9.OoIlB]+)/gi, (m) => {
    return m.replace(/[Oo]/g, '0').replace(/[Il]/g, '1').replace(/B/g, '8');
  });

  return cleaned;
}

function first(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      const val = m[1]?.trim() || m[0]?.trim();
      if (val && val.length > 0) return val;
    }
  }
  return undefined;
}

export function extractFields(ocrText: string): ExtractedFields {
  const t = normalizeText(ocrText);

  // ── Generic / Common Name (Rule 6(1)(b)) ───────────────────────────────
  const generic_name = first(t, [
    /(?:Generic\s+Name|Common\s+Name|Product\s+Name|Commodity|Product|Item)[:\s]+([^\n,]{3,60})/i,
    /(?:Red\s+Chilli\s+Powder|Chilli\s+Powder|Turmeric\s+Powder|Coriander\s+Powder|Garam\s+Masala|Atta|Wheat\s+Flour|Basmati\s+Rice|Refined\s+Sunflower\s+Oil|Mustard\s+Oil|Edible\s+Oil|Tea|Coffee|Biscuits|Wafers|Namkeen|Detergent\s+Powder|Toilet\s+Soap|Toothpaste|Shampoo|Milk|Standardised\s+Milk|Cashews?|Almonds?)/i,
    // Fallback: Check first non-empty line
    /^[ \t]*([A-Z][A-Za-z\s]{3,35})(?:\n|$)/m,
  ]);

  // ── Manufacturer / Packer name & address (Rule 6(1)(a)) ────────────────
  const manufacturer_name = first(t, [
    /(?:Mfd\.?\s*by|Manufactured\s+by|Packed\s+by|Mfg\.?\s*by|Marketed\s+by|Pkd\s+by)[:\s]+([^\n,]{5,90})/i,
    /(?:M\/s\.?\s*)([A-Z][A-Za-z\s&.]{4,60}(?:Ltd\.?|Pvt\.?|Inc\.?|LLP|Foods?|Industries|Enterprises|Corp\.?))/i,
    /([A-Z][A-Za-z\s&.]{3,50}(?:Foods?|Spices?|Industries|Beverages?|Products?)\s+(?:Pvt\.?|Ltd\.?))/i,
  ]);

  // ── Net Quantity (Rule 6(1)(b)) ────────────────────────────────────────
  const net_quantity = first(t, [
    /(?:Net\s*(?:Qty|Wt|Weight|Quantity|Content|Contents?)|Quantity|Net)[:\s]*(?:\([^)]*\)\s*)?([0-9]+(?:\.[0-9]+)?\s*(?:g|gm|gms|kg|kgs|ml|mls|l|lt|ltr|litres?|mg|pieces?|pcs?|nos?|tabs?|units?))\b/i,
    /\b([0-9]+(?:\.[0-9]+)?\s*(?:g|gm|gms|kg|kgs|ml|mls|l|lt|ltr|litres?|mg))\b(?!\s*(?:per|of|\/))/i,
  ]);

  // ── MRP & Tax Clause (Rule 6(1)(f)) ────────────────────────────────────
  const mrp = first(t, [
    /(?:MRP|M\.R\.P|Maximum\s+Retail\s+Price)(?:[^\d]{0,50})?(?:Rs\.?)?\s*([0-9]+(?:[.,][0-9]{1,2})?)/i,
    /MRP[:\s.]*(?:Rs\.?)?\s*([0-9]+(?:[.,][0-9]{1,2})?)/i,
    /(?:Maximum\s+Retail\s+Price|M\.R\.P)[:\s.]*(?:Rs\.?)?\s*([0-9]+(?:[.,][0-9]{1,2})?)/i,
    /(?:Rs\.?)\s*([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:\(?incl\.?\s*of\s*all\s*taxes?\)?)?/i,
    /\b([0-9]{2,5}(?:\.[0-9]{2})?)\s*(?:\(?(?:incl\.?|inclusive)\s*(?:of)?\s*all\s*taxes\)?)/i,
  ]);
  const mrp_has_tax_clause = /(?:incl\.?\s*(?:of)?\s*all\s*taxes|inclusive\s*of\s*all\s*taxes)/i.test(t);

  // ── Unit Sale Price (USP - Rule 6(11)) ────────────────────────────────
  const unit_sale_price = first(t, [
    /(?:USP|Unit\s*Sale\s*Price|Unit\s*Price)[:\s.]*(?:Rs\.?)?\s*([0-9.]+\s*(?:\/|per)\s*(?:100\s*gm|100\s*g|100\s*ml|10\s*gm|10\s*g|gms|gm|g|kg|mls|ml|ltr|lt|l|piece|pc|unit|no|nos))/i,
    /(?:Rs\.?)\s*([0-9.]+\s*(?:\/|per)\s*(?:100\s*gm|100\s*g|100\s*ml|10\s*gm|10\s*g|gms|gm|g|kg|mls|ml|ltr|lt|l|piece|pc|unit))/i,
  ]);

  // ── Month / Year of Manufacture / Packing (Rule 6(1)(d)) ───────────────
  const month_year_of_mfg = first(t, [
    /(?:Mfg\s*Date|Manufactured|Mfd|Packed|Date\s+of\s+Mfg)[:\s.]*([A-Za-z]{3,9}\.?\s*[0-9]{4}|[0-9]{1,2}[\/\-][0-9]{2,4})/i,
    /\b(?:Mfg|Pkd)\b[:\s.]*([A-Za-z]{3,9}\.?\s*[0-9]{4}|[0-9]{1,2}[\/\-][0-9]{2,4})/i,
    /\b([0-9]{1,2}[\/\-](?:20[2-3][0-9]|[2-3][0-9]))\b/,
  ]);

  // ── Consumer Care (Rule 6(1)(l)) ───────────────────────────────────────
  const consumer_care = first(t, [
    /(?:Consumer\s+(?:Care|Helpline|Service|Affairs)|Toll\s*[‐-]?\s*Free|Help\s*line|Customer\s+(?:Care|Service))[:\s]*([0-9\-+() ]{8,20})/i,
    /(?:1800|1860|1900)[0-9\- ]{4,15}/,
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
  ]);

  // ── Country of Origin (Rule 6(1)(m)) ───────────────────────────────────
  const country_of_origin = first(t, [
    /Country\s+of\s+Origin[:\s]*([A-Za-z ]{2,30})/i,
    /(?:Imported\s+(?:from|by))[:\s]*([A-Za-z ]{2,30})/i,
    /(?:Made\s+in|Product\s+of)[:\s]*([A-Za-z ]{2,30})/i,
    /\b(India|China|USA|Thailand|Vietnam|Sri\s+Lanka|Germany)\b/i,
  ]);

  // ── FSSAI Licence ─────────────────────────────────────────────────────
  const fssai_lic = first(t, [
    /FSSAI[:\s#No.]*([0-9]{13,14})/i,
    /Lic\.?\s*No\.?[:\s]*([0-9]{13,14})/i,
    /(?:Licence|License)\s+No\.?[:\s]*([0-9]{13,14})/i,
    /\b(1[0-9]{13})\b/,
  ]);

  // ── Batch / Lot (Rule 6(1)(e)) ─────────────────────────────────────────
  const batch_lot = first(t, [
    /(?:Batch\s*(?:No\.?|Code|#)|Lot\s*(?:No\.?|Code|#)|B\.?\s*No\.?)[:\s]*([A-Z0-9\/\-]{2,20})/i,
    /\bBatch[:\s]+([A-Z0-9\/\-]{2,20})/i,
  ]);

  // ── Expiry / Best Before (Rule 6(1)(d)) ────────────────────────────────
  const expiry_date = first(t, [
    /(?:Best\s+Before|Exp(?:iry)?\.?\s*(?:Date)?|Use\s+(?:By|Before)|BB)[:\s.]*([A-Za-z0-9\/\-. ]{3,30})/i,
    /(?:Expiry|Exp\.?)[:\s]*([0-9]{1,2}[\/\-][0-9]{2,4})/i,
  ]);

  return {
    manufacturer_name,
    generic_name,
    net_quantity,
    mrp,
    mrp_has_tax_clause,
    unit_sale_price,
    month_year_of_mfg,
    consumer_care,
    country_of_origin,
    fssai_lic,
    batch_lot,
    expiry_date,
  };
}
