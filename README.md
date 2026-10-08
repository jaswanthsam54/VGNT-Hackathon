# AI-Powered LMPC Compliance Analysis Platform

> **Legal Metrology (Packaged Commodities) Compliance Platform**  
> AI & Computer Vision system for real-time verification of mandatory statutory declarations, label tamper detection, and legal enforcement memos under Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011 and Section 36 of The Legal Metrology Act, 2009.

---

## 🚀 Key Features

1. **Multilingual OCR & Field Extraction**
   - High-precision optical character recognition with digit/character healing (`5O` $\rightarrow$ `50`, multi-line tolerance).
   - Extracts all Rule 6 statutory declarations: Generic Commodity Name, Net Quantity, MRP, Unit Sale Price (USP), Month/Year of Manufacture, Batch/Lot, FSSAI, Consumer Care helpline, and Country of Origin.

2. **Tamper & Manipulation Detection**
   - Dual-MRP price distortion detection (e.g., base ₹50 vs altered ₹500 sticker).
   - Spacing/kerning anomaly detection and price-per-quantity mathematical verification.
   - Calculates visual manipulation score (0–100) and triggers `TAMPER_SUSPECT` warnings.

3. **Neural Vision & Bounding Box Mapping**
   - Responsive normalized percentage bounding boxes overlaid directly onto the packaging image.
   - Interactive field chips for highlighting detected declarations and confidence scores.

4. **Deterministic LMPC Rule Engine**
   - Rule checks mapped to statutory clauses: Rule 6(1)(a), 6(1)(b), 6(1)(d), 6(1)(f), 6(11) (USP amendment), and Section 36.
   - Standardized verdicts: `COMPLIANT`, `NON_COMPLIANT`, `PARTIAL`, and `TAMPER_SUSPECT`.

5. **Generative AI Legal Explainer & Remediation**
   - Plain-English legal interpretation citing exact statutory provisions.
   - Prescribes corrective packaging remediation steps and penalty risk analysis.

6. **Assisted Human-in-the-Loop (HITL) Verification**
   - Live in-UI field correction for physical packages with creases, glare, or camera blur.
   - 1-click re-calculation of compliance scores and legal notices.

7. **Legal Chain of Custody & Form VII Statutory Notice**
   - SHA-256 cryptographic evidence hashing for admissibility under Section 65B of the Bharatiya Sakshya Adhiniyam (BSA).
   - Printable **Form VII Statutory Notice & Inspection Memo** ready for export / PDF printing.

8. **Pre-Calibrated Test Benchmarks**
   - 1-click instant test packages (Compliant Dairy FMCG, Tampered Dual-MRP Sachet, and Missing USP Violation).

---

## 🛠️ Tech Stack

- **Frontend & App Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript
- **Styling:** Vanilla CSS (Gov-Tech Design System, dark/light compliance tokens, `@media print`)
- **Computer Vision & OCR:** Tesseract.js, responsive coordinate mapping, regex normalizer
- **Rule & Tamper Engines:** Deterministic TypeScript engines with zero heavy external cloud dependencies
- **Evidence & Audit:** SHA-256 crypto hashing (Sec. 65B BSA), in-memory inspection history ledger

---

## 🏃 Getting Started

### Prerequisites
- Node.js 18+ installed

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/jaswanthsam54/VGNT-Hackathon.git
cd VGNT-Hackathon

# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

Run the included verification test suites:

```bash
# Test rule engine, tamper detection, region mapping, and GenAI explainer
npx tsx scripts/test-stage1.ts
npx tsx scripts/test-stage2.ts
npx tsx scripts/test-stage3.ts
npx tsx scripts/test-stage4.ts
npx tsx scripts/test-stage5.ts
npx tsx scripts/test-imperfect-scans.ts
```

---

## ⚖️ Statutory Legal References
- **The Legal Metrology Act, 2009** (Section 18 & Section 36)
- **The Legal Metrology (Packaged Commodities) Rules, 2011** (Rule 6, Rule 6(11) USP Amendment)
- **Food Safety and Standards Act, 2006** (FSSAI Licencing)
- **Bharatiya Sakshya Adhiniyam, 2023** (Section 65B Electronic Records Admissibility)