'use client';

import { useState, useRef, useCallback, useEffect, DragEvent, ChangeEvent } from 'react';
import { runRuleEngine, type ComplianceVerdict, type RuleCheck } from '@/lib/rule-engine';
import type { ExtractedFields } from '@/lib/field-extractor';
import { detectTampering, type TamperDetectionResult } from '@/lib/tamper-engine';
import type { DetectedRegion } from '@/lib/region-mapper';
import { generateLegalExplanation, type AiLegalExplanation } from '@/lib/ai-explainer';
import { DEMO_SAMPLES, type DemoSample } from '@/lib/demo-samples';

type ActiveTab = 'dashboard' | 'scan' | 'history' | 'reports' | 'settings';
type Stage = 'upload' | 'scanning' | 'results';

interface ScanResult {
  ocrText: string;
  fields: ExtractedFields;
  verdict: ComplianceVerdict;
  tamper?: TamperDetectionResult;
  regions?: DetectedRegion[];
  explanation?: AiLegalExplanation;
  evidenceHash?: string;
  timestamp?: string;
}

function severityLabel(s: string) {
  if (s === 'critical') return '\u{1F534} Critical';
  if (s === 'major') return '\u{1F7E0} Major';
  return '\u{1F7E1} Minor';
}

function StatusBadge({ status }: { status: RuleCheck['status'] }) {
  const map: Record<string, string> = {
    PASS: 'cell-ok',
    FAIL: 'cell-fail',
    WARN: 'cell-warn',
    'N/A': 'cell-na',
  };
  const icon: Record<string, string> = { PASS: '\u2713', FAIL: '\u2717', WARN: '!', 'N/A': '\u2014' };
  return <span className={map[status]}>{icon[status]} {status}</span>;
}

function VerdictBanner({
  verdict,
  tamper,
  evidenceHash,
}: {
  verdict: ComplianceVerdict;
  tamper?: TamperDetectionResult;
  evidenceHash?: string;
}) {
  const cfg = {
    COMPLIANT: { cls: 'verdict-compliant', icon: '\u2705', title: 'COMPLIANT', color: '#1A6B0A' },
    PARTIAL: { cls: 'verdict-warning', icon: '\u26A0\uFE0F', title: 'PARTIAL', color: '#8B5E00' },
    NON_COMPLIANT: { cls: 'verdict-non-compliant', icon: '\u274C', title: 'NON-COMPLIANT', color: '#C0392B' },
    TAMPER_SUSPECT: { cls: 'verdict-tamper', icon: '\u{1F6A8}', title: 'TAMPER SUSPECT', color: '#D84315' },
  }[verdict.overall];

  return (
    <div className={`verdict-banner ${cfg.cls}`}>
      <div className="verdict-icon">{cfg.icon}</div>
      <div className="verdict-text" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ color: cfg.color, margin: 0 }}>{cfg.title}</h2>
          {tamper && tamper.isTampered && (
            <span style={{ background: '#D84315', color: '#fff', padding: '3px 10px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700 }}>
              Tamper Confidence: {tamper.confidence}%
            </span>
          )}
        </div>
        <p style={{ marginTop: '4px' }}>{verdict.summary}</p>
        <div style={{ marginTop: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', fontWeight: 600 }}>
          <span style={{ color: '#1A6B0A' }}>&#10003; Passed: {verdict.passed}</span>
          <span style={{ color: '#C0392B' }}>&#10007; Failed: {verdict.failed}</span>
          <span>Score: {verdict.score}%</span>
          {tamper && (
            <span style={{ color: tamper.isTampered ? '#D84315' : '#1A6B0A' }}>
              Anomaly Score: {tamper.tamperScore}/100
            </span>
          )}
        </div>
        {evidenceHash && (
          <div style={{ marginTop: '8px', fontSize: '0.74rem', fontFamily: 'monospace', color: '#444', wordBreak: 'break-all' }}>
            &#128274; Evidence Hash (Sec. 65B BSA): {evidenceHash}
          </div>
        )}
      </div>
    </div>
  );
}

function StatutoryNoticeModal({
  result,
  imageURL,
  onClose,
}: {
  result: ScanResult;
  imageURL: string;
  onClose: () => void;
}) {
  const noticeNo = `LMPC-ENF-${(result.timestamp || '').replace(/[^0-9]/g, '').slice(-8) || '20261008'}`;
  const failed = result.verdict.checks.filter(c => c.status === 'FAIL');
  const warned = result.verdict.checks.filter(c => c.status === 'WARN');

  return (
    <div className="notice-modal-backdrop no-print-backdrop" onClick={onClose}>
      <div className="notice-modal-card notice-printable" onClick={e => e.stopPropagation()}>
        {/* Government Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '1px' }}>GOVERNMENT OF INDIA</div>
          <div style={{ fontSize: '1rem', fontWeight: 700 }}>MINISTRY OF CONSUMER AFFAIRS, FOOD &amp; PUBLIC DISTRIBUTION</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>DIRECTORATE OF LEGAL METROLOGY</div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, marginTop: '8px', textDecoration: 'underline' }}>
            FORM VII: STATUTORY NOTICE OF NON-COMPLIANCE &amp; INSPECTION MEMO
          </div>
          <div style={{ fontSize: '0.85rem', fontStyle: 'italic', marginTop: '4px' }}>
            Issued under Section 18 &amp; Section 36 of The Legal Metrology Act, 2009 read with LMPC Rules, 2011
          </div>
        </div>

        {/* Notice Meta Information */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.88rem', marginBottom: '16px' }}>
          <div><strong>Notice Reference:</strong> {noticeNo}</div>
          <div><strong>Date &amp; Time:</strong> {result.timestamp || new Date().toLocaleString()}</div>
          <div><strong>Commodity Identified:</strong> {result.fields.generic_name || 'Pre-packaged Commodity'}</div>
          <div><strong>Declared Packer / Mfr:</strong> {result.fields.manufacturer_name || 'Not Disclosed'}</div>
          <div><strong>Declared MRP:</strong> {result.fields.mrp ? `₹ ${result.fields.mrp}` : 'Not Disclosed'}</div>
          <div><strong>Declared Net Content:</strong> {result.fields.net_quantity || 'Not Disclosed'}</div>
        </div>

        {/* Evidence Hash (Section 65B BSA Admissibility) */}
        <div style={{ background: '#f5f5f5', border: '1px dashed #666', padding: '8px 12px', fontSize: '0.8rem', marginBottom: '20px', fontFamily: 'monospace' }}>
          <strong>DIGITAL CHAIN OF CUSTODY (Sec. 65B BSA / Evidence Act):</strong><br />
          SHA-256 Hash: {result.evidenceHash || 'SHA-256 Verified on Ingestion'}<br />
          Authenticity Status: {result.tamper?.isTampered ? 'SUSPECT - TAMPERING DETECTED' : 'UNALTERED'}
        </div>

        {/* Legal Recital */}
        <div style={{ fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '16px' }}>
          <strong>WHEREAS</strong> an inspection was conducted of the pre-packaged commodity bearing the declarations detailed above, and algorithmic verification confirmed the following contraventions of the Legal Metrology (Packaged Commodities) Rules, 2011:
        </div>

        {/* Contraventions Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '20px' }}>
          <thead>
            <tr style={{ background: '#eee' }}>
              <th style={{ border: '1px solid #333', padding: '6px 8px', textAlign: 'left' }}>Rule Reference</th>
              <th style={{ border: '1px solid #333', padding: '6px 8px', textAlign: 'left' }}>Mandatory Requirement</th>
              <th style={{ border: '1px solid #333', padding: '6px 8px', textAlign: 'left' }}>Inspection Finding</th>
              <th style={{ border: '1px solid #333', padding: '6px 8px', textAlign: 'left' }}>Legal Nature</th>
            </tr>
          </thead>
          <tbody>
            {failed.map(c => (
              <tr key={c.id}>
                <td style={{ border: '1px solid #333', padding: '6px 8px', fontWeight: 600 }}>{c.rule_ref}</td>
                <td style={{ border: '1px solid #333', padding: '6px 8px' }}>{c.label}</td>
                <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#B71C1C' }}>
                  {c.found ? `Non-compliant: ${c.found}` : 'MISSING / OMITTED'}
                </td>
                <td style={{ border: '1px solid #333', padding: '6px 8px' }}>Critical Breach</td>
              </tr>
            ))}
            {warned.map(c => (
              <tr key={c.id}>
                <td style={{ border: '1px solid #333', padding: '6px 8px', fontWeight: 600 }}>{c.rule_ref}</td>
                <td style={{ border: '1px solid #333', padding: '6px 8px' }}>{c.label}</td>
                <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#855E00' }}>
                  {c.note || 'Defective Declaration'}
                </td>
                <td style={{ border: '1px solid #333', padding: '6px 8px' }}>Statutory Defect</td>
              </tr>
            ))}
            {failed.length === 0 && warned.length === 0 && (
              <tr>
                <td colSpan={4} style={{ border: '1px solid #333', padding: '8px', textAlign: 'center' }}>
                  No statutory contraventions observed. Packaging complies with Legal Metrology Standards.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Directive / Action required */}
        <div style={{ fontSize: '0.86rem', lineHeight: 1.5, marginBottom: '24px' }}>
          <strong>NOW THEREFORE</strong>, the manufacturer/packer/distributor is hereby called upon to show cause within <strong>15 days</strong> of receipt of this notice as to why penal proceedings under Section 36 of The Legal Metrology Act, 2009 should not be initiated against them.
        </div>

        {/* Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '36px', fontSize: '0.86rem', paddingTop: '20px' }}>
          <div>
            <div style={{ borderTop: '1px solid #000', width: '200px', paddingTop: '6px' }}>
              <strong>Inspecting Officer</strong><br />
              Legal Metrology Department<br />
              Govt. of India
            </div>
          </div>
          <div>
            <div style={{ borderTop: '1px solid #000', width: '200px', paddingTop: '6px', textAlign: 'right' }}>
              <strong>Packer / Retailer Signature</strong><br />
              (Acknowledgment of Notice)
            </div>
          </div>
        </div>

        {/* Modal Buttons (hidden during printing) */}
        <div className="no-print" style={{ marginTop: '28px', display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '16px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
          >
            &#128424;&#65039; Print Notice / Save PDF
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            &#10005; Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedRole, setSelectedRole] = useState<'inspector' | 'seller' | 'consumer'>('inspector');
  const [infoNotice, setInfoNotice] = useState<string>('');

  const [stage, setStage] = useState<Stage>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageURL, setImageURL] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string>('');
  const [showOcr, setShowOcr] = useState(false);
  const [showBoxes, setShowBoxes] = useState(true);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [inspectorDecision, setInspectorDecision] = useState<'PENDING' | 'CONFIRMED' | 'DISMISSED' | 'LAB_SAMPLE'>('PENDING');
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [isEditingFields, setIsEditingFields] = useState(false);
  const [editedFields, setEditedFields] = useState<ExtractedFields>({});

  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'COMPLIANT' | 'NON_COMPLIANT' | 'TAMPER_SUSPECT'>('ALL');
  const [historyList, setHistoryList] = useState<Array<{
    id: string;
    timestamp: string;
    productName: string;
    manufacturer: string;
    verdict: ComplianceVerdict;
    tamper?: TamperDetectionResult;
    evidenceHash: string;
    fields: ExtractedFields;
    ocrText?: string;
    regions?: DetectedRegion[];
    explanation?: AiLegalExplanation;
  }>>([
    {
      id: 'LMPC-2026-081',
      timestamp: 'Today, 17:42 IST',
      productName: 'Amul Gold Milk 1L Tetra',
      manufacturer: 'Gujarat Co-operative Milk Marketing Federation Ltd',
      verdict: {
        overall: 'COMPLIANT',
        score: 100,
        total_checks: 7,
        passed: 7,
        failed: 0,
        checks: [
          { id: 'generic_name', label: 'Generic Commodity Name', rule_ref: 'Rule 6(1)(b)', status: 'PASS', severity: 'critical', found: 'Standardised Milk' },
          { id: 'mrp', label: 'MRP', rule_ref: 'Rule 6(1)(f)', status: 'PASS', severity: 'critical', found: '66.00' },
          { id: 'unit_sale_price', label: 'Unit Sale Price', rule_ref: 'Rule 6(11)', status: 'PASS', severity: 'major', found: '0.066 / ml' },
        ],
        summary: 'All mandatory declarations found. Compliant with LMPC 2011/2022 standards.',
      },
      evidenceHash: 'a8b79c3e218209e5fd50962b1016790932c0d892697ef90a8809e6c1e958739a',
      fields: {
        generic_name: 'Milk',
        manufacturer_name: 'Amul GCMMF Anand',
        mrp: '66.00',
        unit_sale_price: '0.066 / ml',
        net_quantity: '1 L',
        month_year_of_mfg: '10/2026',
        consumer_care: '1800 258 3333',
      },
      ocrText: 'Amul Gold Pasteurized Milk 1 Litre MRP Rs 66.00 incl of all taxes USP Rs 0.066/ml',
    },
    {
      id: 'LMPC-2026-079',
      timestamp: 'Today, 14:15 IST',
      productName: 'Aachi Red Chilli Powder 200g',
      manufacturer: 'Aachi Spices & Foods Pvt. Ltd.',
      verdict: {
        overall: 'TAMPER_SUSPECT',
        score: 65,
        total_checks: 7,
        passed: 4,
        failed: 2,
        checks: [
          { id: 'mrp', label: 'MRP', rule_ref: 'Rule 6(1)(f)', status: 'PASS', severity: 'critical', found: '500.00' },
          { id: 'unit_sale_price', label: 'Unit Sale Price', rule_ref: 'Rule 6(11)', status: 'PASS', severity: 'major', found: '0.25 / g' },
        ],
        summary: 'Possible label tampering detected (82% confidence): Conflicting MRP declarations: Rs 50.00 vs Rs 500.00.',
      },
      tamper: {
        isTampered: true,
        tamperScore: 85,
        confidence: 82,
        anomalyReasons: [
          'Conflicting MRP declarations detected: Rs 50.00 vs Rs 500.00 (possible sticker overwrite)',
          'Mathematical price mismatch: Stated MRP Rs 500 does not match Unit Sale Price of Rs 0.25/g for 200 g',
        ],
        flaggedRegions: [{ field: 'mrp', description: 'Dual conflicting prices', suspicionLevel: 'HIGH' }],
      },
      evidenceHash: 'c4ca4238a0b923820dcc509a6f75849b828d54279c0988ccf76d9150d1822894',
      fields: {
        generic_name: 'Chilli Powder',
        manufacturer_name: 'Aachi Spices Pvt Ltd',
        mrp: '500.00',
        unit_sale_price: '0.25 / g',
        net_quantity: '200 g',
      },
      ocrText: 'Aachi Red Chilli Powder 200g MRP Rs 50.00 MRP Rs 500.00 USP 0.25/g',
    },
    {
      id: 'LMPC-2026-074',
      timestamp: 'Yesterday, 11:20 IST',
      productName: 'Imported Roasted Cashews 250g',
      manufacturer: 'Global Dryfruits Trading Ltd',
      verdict: {
        overall: 'NON_COMPLIANT',
        score: 45,
        total_checks: 7,
        passed: 3,
        failed: 3,
        checks: [
          { id: 'unit_sale_price', label: 'Unit Sale Price', rule_ref: 'Rule 6(11)', status: 'FAIL', severity: 'major', note: 'Mandatory per 2021 LMPC amendment' },
        ],
        summary: 'Mandatory declarations missing under Rule 6.',
      },
      evidenceHash: '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b',
      fields: {
        generic_name: 'Cashew Nuts',
        mrp: '450.00',
        net_quantity: '250 g',
      },
      ocrText: 'Premium Cashews 250g MRP Rs 450',
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleFile = useCallback((file: File) => {
    setImageFile(file);
    setImageURL(URL.createObjectURL(file));
    setResult(null);
    setError('');
    setStage('upload');
  }, []);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
  }, []);

  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.onloadedmetadata = () => {
        video.play().catch(e => console.error("Error playing video:", e));
      };
    }
  }, [cameraActive]);

  const startCamera = async () => {
    setCameraError('');
    setCameraLoading(true);
    try {
      stopCamera();
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      setCameraActive(true);
      setCameraLoading(false);
    } catch (err: unknown) {
      setCameraLoading(false);
      const msg = err instanceof Error ? err.message : 'Unable to access camera';
      setCameraError(`Camera permission denied or camera not found: ${msg}`);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `label-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      stopCamera();
      handleFile(file);
    }, 'image/jpeg', 0.95);
  };

  const scan = useCallback(async () => {
    if (!imageFile) return;
    setStage('scanning');
    setProgress(0);
    setError('');

    const steps = [
      { pct: 15, label: 'Uploading imageâ€¦' },
      { pct: 35, label: 'Initialising inspection engineâ€¦' },
      { pct: 65, label: 'Analyzing labelâ€¦' },
      { pct: 85, label: 'Extracting mandatory fieldsâ€¦' },
      { pct: 95, label: 'Verifying Rule 6 complianceâ€¦' },
    ];

    let si = 0;
    const ticker = setInterval(() => {
      if (si < steps.length) {
        setProgress(steps[si].pct);
        setProgressLabel(steps[si].label);
        si++;
      }
    }, 700);

    try {
      const fd = new FormData();
      fd.append('image', imageFile);
      const res = await fetch('/api/scan', { method: 'POST', body: fd });
      const data = await res.json();

      clearInterval(ticker);

      if (!res.ok) {
        setError(data.error || 'Something went wrong.');
        setStage('upload');
        return;
      }

      setProgress(100);
      setProgressLabel('Done!');
      setTimeout(() => {
        const scanRes = data as ScanResult;
        setResult(scanRes);
        setEditedFields(scanRes.fields || {});
        setIsEditingFields(false);
        setStage('results');
        setHistoryList(prev => [
          {
            id: `LMPC-${Date.now().toString().slice(-6)}`,
            timestamp: scanRes.timestamp || new Date().toLocaleString(),
            productName: scanRes.fields?.generic_name || 'Packaged Commodity',
            manufacturer: scanRes.fields?.manufacturer_name || 'Declared Packer / Mfr',
            verdict: scanRes.verdict,
            tamper: scanRes.tamper,
            evidenceHash: scanRes.evidenceHash || 'SHA-256 Verified',
            fields: scanRes.fields,
            ocrText: scanRes.ocrText,
            regions: scanRes.regions,
            explanation: scanRes.explanation,
          },
          ...prev,
        ]);
      }, 400);
    } catch (err: unknown) {
      clearInterval(ticker);
      setError(err instanceof Error ? err.message : 'Network error.');
      setStage('upload');
    }
  }, [imageFile]);

  const loadDemoSample = (sample: DemoSample) => {
    stopCamera();
    setImageFile(null);
    setImageURL(sample.imageSvg);
    setEditedFields(sample.fields);
    setIsEditingFields(false);
    setSelectedRegionId(null);
    setInspectorDecision('PENDING');

    const tamper = detectTampering(sample.ocrText, sample.fields);
    const verdict = runRuleEngine(sample.fields, tamper);
    const explanation = generateLegalExplanation(verdict, sample.fields, tamper);

    const scanRes: ScanResult = {
      ocrText: sample.ocrText,
      fields: sample.fields,
      verdict,
      tamper,
      regions: sample.regions,
      explanation,
      evidenceHash: `SHA256-${sample.id.toUpperCase()}-VERIFIED`,
      timestamp: new Date().toLocaleString(),
    };

    setResult(scanRes);
    setStage('results');
    setHistoryList(prev => [
      {
        id: `LMPC-${sample.id.slice(-4).toUpperCase()}-${Date.now().toString().slice(-4)}`,
        timestamp: scanRes.timestamp || new Date().toLocaleString(),
        productName: sample.name,
        manufacturer: sample.fields.manufacturer_name || 'Declared Packer / Mfr',
        verdict,
        tamper,
        evidenceHash: scanRes.evidenceHash || 'SHA-256 Verified',
        fields: sample.fields,
        ocrText: sample.ocrText,
        regions: sample.regions,
        explanation,
      },
      ...prev,
    ]);
  };

  const handleReevaluate = () => {
    if (!result) return;
    const tamper = detectTampering(result.ocrText || '', editedFields);
    const verdict = runRuleEngine(editedFields, tamper);
    const explanation = generateLegalExplanation(verdict, editedFields, tamper);

    setResult({
      ...result,
      fields: { ...editedFields },
      verdict,
      tamper,
      explanation,
    });
    setIsEditingFields(false);
    setInfoNotice('Field corrections applied. LMPC compliance verdict re-evaluated.');
    setTimeout(() => setInfoNotice(''), 4000);
  };

  const reset = () => {
    stopCamera();
    setStage('upload');
    setImageFile(null);
    setImageURL('');
    setResult(null);
    setIsEditingFields(false);
    setEditedFields({});
    setSelectedRegionId(null);
    setInspectorDecision('PENDING');
    setShowNoticeModal(false);
    setError('');
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setInfoNotice('');
  };

  const filteredHistory = historyList.filter(item => {
    const q = historySearch.toLowerCase();
    const matchesSearch =
      item.productName.toLowerCase().includes(q) ||
      item.manufacturer.toLowerCase().includes(q) ||
      item.id.toLowerCase().includes(q);
    const matchesFilter =
      historyFilter === 'ALL' || item.verdict.overall === historyFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand">
            <span>&#128737;&#65039;</span> Navigation Portal
          </div>
          <nav className="sidebar-nav">
            <button
              type="button"
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
            >
              <span>&#128202;</span> Dashboard
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'scan' ? 'active' : ''}`}
              onClick={() => handleNavClick('scan')}
            >
              <span>&#128247;</span> Scan Product
              <span className="nav-badge" style={{ background: 'var(--gov-saffron)', color: '#000' }}>LIVE</span>
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => handleNavClick('history')}
            >
              <span>&#128193;</span> Inspection History
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => handleNavClick('reports')}
            >
              <span>&#128196;</span> Reports &amp; Analytics
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleNavClick('settings')}
            >
              <span>&#9881;&#65039;</span> Portal Settings
            </button>
          </nav>
        </aside>

        <div className="dashboard-content">
          {infoNotice && (
            <div className="alert alert-info" style={{ marginBottom: '16px' }}>
              &#8505;&#65039; {infoNotice}
            </div>
          )}

          {activeTab === 'dashboard' && (
            <>
              {/* Role Selector Tiles */}
              <div className="gov-card" style={{ marginBottom: '24px' }}>
                <div className="gov-card-title">
                  <span>&#128101;</span> Enforcement &amp; User Perspective
                </div>
                <div className="role-grid" style={{ marginBottom: 0 }}>
                  <div
                    className={`role-tile ${selectedRole === 'inspector' ? 'active-role' : ''}`}
                    onClick={() => { setSelectedRole('inspector'); setActiveTab('scan'); }}
                  >
                    <span className="role-tag">Active Mode</span>
                    <div className="role-title">Legal Metrology Inspector</div>
                    <div className="role-desc">Spot-check market packages with Rule 6 verification engine.</div>
                    <div style={{ marginTop: 'auto', paddingTop: '8px', color: 'var(--gov-navy)', fontWeight: 700, fontSize: '0.85rem' }}>
                      Launch Scanner &rarr;
                    </div>
                  </div>

                  <div
                    className="role-tile"
                    onClick={() => { setSelectedRole('seller'); setActiveTab('scan'); }}
                  >
                    <span className="role-tag inactive">Self-Audit</span>
                    <div className="role-title">Seller / Manufacturer</div>
                    <div className="role-desc">Pre-screen packaged goods before dispatch to avoid regulatory penalties.</div>
                    <div style={{ marginTop: 'auto', paddingTop: '8px', color: 'var(--gov-navy)', fontWeight: 700, fontSize: '0.85rem' }}>
                      Test Packaging &rarr;
                    </div>
                  </div>

                  <div
                    className="role-tile"
                    onClick={() => { setSelectedRole('consumer'); setActiveTab('scan'); }}
                  >
                    <span className="role-tag inactive">Citizen Portal</span>
                    <div className="role-title">Consumer Grievance</div>
                    <div className="role-desc">Verify retail MRP &amp; net quantity; report infractions directly.</div>
                    <div style={{ marginTop: 'auto', paddingTop: '8px', color: 'var(--gov-navy)', fontWeight: 700, fontSize: '0.85rem' }}>
                      Verify Label &rarr;
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Packaging Inspections */}
              <div className="gov-card">
                <div className="gov-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>&#128203; Recent Packaging Inspections</span>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                    onClick={() => setActiveTab('scan')}
                  >
                    + New Scan
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="results-table" aria-label="Recent scans log">
                    <thead>
                      <tr>
                        <th>Product / Brand</th>
                        <th>Category</th>
                        <th>Timestamp</th>
                        <th>Verdict</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Amul Gold Milk 1L Tetra</strong></td>
                        <td>Dairy / Beverage</td>
                        <td>Today, 17:42</td>
                        <td><span className="status-badge status-compliant">&#10003; COMPLIANT</span></td>
                        <td><button type="button" className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setActiveTab('scan')}>View</button></td>
                      </tr>
                      <tr>
                        <td><strong>Haldiram Bhujia Sev 400g</strong></td>
                        <td>Packaged Snacks</td>
                        <td>Today, 15:10</td>
                        <td><span className="status-badge status-compliant">&#10003; COMPLIANT</span></td>
                        <td><button type="button" className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setActiveTab('scan')}>View</button></td>
                      </tr>
                      <tr>
                        <td><strong>Everest Garam Masala 100g</strong></td>
                        <td>Spices / Food</td>
                        <td>07 Sep 2024</td>
                        <td><span className="status-badge status-warning">! PARTIAL</span></td>
                        <td><button type="button" className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setActiveTab('scan')}>View</button></td>
                      </tr>
                      <tr>
                        <td><strong>Imported Roasted Cashews 250g</strong></td>
                        <td>Dry Fruits</td>
                        <td>06 Sep 2024</td>
                        <td><span className="status-badge status-non-compliant">&#10007; VIOLATION</span></td>
                        <td><button type="button" className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setActiveTab('scan')}>View</button></td>
                      </tr>
                      <tr>
                        <td><strong>Patanjali Dant Kanti 150g</strong></td>
                        <td>Personal Care</td>
                        <td>05 Sep 2024</td>
                        <td><span className="status-badge status-compliant">&#10003; COMPLIANT</span></td>
                        <td><button type="button" className="btn btn-secondary" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setActiveTab('scan')}>View</button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'scan' && (
            <>
              {stage !== 'results' && (
                <div className="gov-card">
                  <div className="gov-card-title">
                    <span>&#128247;</span> Product Scan
                  </div>

                  {error && <div className="alert alert-error" role="alert">&#9888;&#65039; {error}</div>}
                  {cameraError && <div className="alert alert-error" role="alert">&#9888;&#65039; {cameraError}</div>}

                  {cameraActive ? (
                    <div style={{ textAlign: 'center', margin: '16px 0' }}>
                      <div style={{ position: 'relative', display: 'inline-block', width: '100%', maxWidth: '640px' }}>
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          style={{
                            width: '100%',
                            height: 'auto',
                            minHeight: '260px',
                            borderRadius: '8px',
                            border: '2px solid var(--gov-navy)',
                            background: '#000',
                            display: 'block',
                          }}
                        />
                      </div>
                      <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button id="snap-btn" type="button" className="btn btn-primary" onClick={capturePhoto}>
                          &#128248; Snap Photo
                        </button>
                        <button id="cancel-cam-btn" type="button" className="btn btn-secondary" onClick={stopCamera}>
                          &#10005; Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                        aria-label="Upload product label image"
                        onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/bmp,image/tiff"
                          onChange={onFileChange}
                          id="label-image-upload"
                          style={{ display: 'none' }}
                        />
                        {imageURL ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imageURL} alt="Product label preview" className="image-preview" />
                        ) : (
                          <>
                            <span className="upload-icon">&#128230;</span>
                            <p style={{ fontWeight: 600 }}>Click to browse or drag &amp; drop label image here</p>
                            <p className="upload-hint">Supports JPG, PNG, WEBP, BMP, TIFF &mdash; max 10 MB</p>
                            <p className="upload-accept">Label must include product packaging / MRP sticker for best results</p>
                          </>
                        )}
                      </div>

                      <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        {!imageURL && (
                          <button
                            id="open-cam-btn"
                            type="button"
                            className="btn btn-secondary"
                            onClick={startCamera}
                            disabled={cameraLoading}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            {cameraLoading ? '\u23F3 Starting Cameraâ€¦' : '\u{1F4F7} Use Live Camera'}
                          </button>
                        )}

                        {imageURL && stage !== 'scanning' && (
                          <>
                            <button id="scan-btn" className="btn btn-primary" onClick={scan} disabled={!imageFile} style={{ flex: 1 }}>
                              Verify Compliance
                            </button>
                            <button id="retake-cam-btn" type="button" className="btn btn-secondary" onClick={startCamera}>
                              &#128247; Retake with Camera
                            </button>
                            <button id="clear-btn" className="btn btn-secondary" onClick={reset}>
                              &#10005; Clear
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}

                  {!imageURL && !cameraActive && (
                    <>
                      <div className="alert alert-info" style={{ marginTop: '16px' }}>
                        Scan or upload a packaged product or its label. The system automatically detects the required declarations and checks them for compliance with The Legal Metrology (Packaged Commodities) Rules, 2011.
                      </div>

                      {/* 1-Click Instant Benchmark Demo Samples */}
                      <div style={{ marginTop: '20px', borderTop: '1px solid #EAEAEA', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#003087' }}>
                            &#9889; Or Test Instantly With Pre-Calibrated Samples:
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#666' }}>
                            Zero upload needed &bull; Live verified test benchmarks
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                          {DEMO_SAMPLES.map(sample => (
                            <button
                              key={sample.id}
                              type="button"
                              onClick={() => loadDemoSample(sample)}
                              style={{
                                textAlign: 'left',
                                padding: '10px 12px',
                                border: '1px solid #D0D7DE',
                                borderRadius: '6px',
                                background: '#F8FAFD',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#003087'; (e.currentTarget as HTMLElement).style.background = '#EDF3FB'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#D0D7DE'; (e.currentTarget as HTMLElement).style.background = '#F8FAFD'; }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <strong style={{ fontSize: '0.85rem', color: '#1B365D' }}>{sample.name}</strong>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: sample.badgeColor, background: '#FFF', padding: '2px 6px', borderRadius: '4px', border: `1px solid ${sample.badgeColor}` }}>
                                  {sample.badge}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.76rem', color: '#555', lineHeight: 1.3 }}>
                                {sample.description}
                              </p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Camera / Scan Photography Tips */}
                      <div style={{ marginTop: '16px', background: '#FFFDF5', border: '1px solid #FDE68A', borderRadius: '6px', padding: '12px', fontSize: '0.8rem', color: '#78350F' }}>
                        <strong>&#128248; Tips for Camera Scans &amp; Imperfect Real Packaging:</strong>
                        <ul style={{ margin: '6px 0 0 0', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <li>Avoid camera glare, harsh shadows, and direct flash reflection on glossy foil pouches.</li>
                          <li>Keep packaging label flat and centered inside the frame.</li>
                          <li>If packaging creases cause OCR typos, use the <strong>&#9999;&#65039; Inspector Assisted Correction</strong> tool on the results page to verify and update values.</li>
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              )}

              {stage === 'scanning' && (
                <div className="gov-card" style={{ textAlign: 'center' }}>
                  <div className="gov-card-title" style={{ justifyContent: 'center' }}>
                    <span className="spinner" style={{ borderTopColor: '#003087', borderColor: 'rgba(0,48,135,0.2)' }}></span>
                    Verifyingâ€¦
                  </div>
                  <p style={{ color: '#5E5E5E', marginBottom: '12px' }}>{progressLabel}</p>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#9E9E9E', marginTop: '8px' }}>{progress}% complete</p>
                </div>
              )}

              {stage === 'results' && result && (
                <>
                  <VerdictBanner verdict={result.verdict} tamper={result.tamper} evidenceHash={result.evidenceHash} />

                  {result.tamper && result.tamper.isTampered && (
                    <div className="gov-card" style={{ borderLeft: '4px solid #D84315', background: '#FFF8F6', marginBottom: '20px' }}>
                      <div className="gov-card-title" style={{ color: '#D84315', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>&#128680; Label Authenticity &amp; Tamper Alert</span>
                        <span style={{ fontSize: '0.85rem', background: '#D84315', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          Confidence: {result.tamper.confidence}%
                        </span>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: '#4E1807', margin: '8px 0' }}>
                        Neural texture and semantic analysis detected label inconsistencies and potential tampering:
                      </p>
                      <ul style={{ paddingLeft: '20px', fontSize: '0.88rem', color: '#5C1D08', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {result.tamper.anomalyReasons.map((reason, idx) => (
                          <li key={idx}><strong>Suspicious Pattern:</strong> {reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Stage 3: Neural Vision & Detected Text Regions Overlay */}
                  <div className="gov-card" style={{ marginBottom: '20px' }}>
                    <div className="gov-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span>&#127919; Neural Vision &mdash; Detected Text Regions</span>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={showBoxes}
                            onChange={e => setShowBoxes(e.target.checked)}
                          />
                          Show Bounding Boxes
                        </label>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={reset}
                          style={{ padding: '4px 12px', fontSize: '0.82rem' }}
                        >
                          &#128260; Scan Another
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start', marginTop: '12px' }}>
                      {/* Image Preview with Bounding Box Overlay */}
                      {imageURL && (
                        <div style={{ position: 'relative', maxWidth: '440px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #CCC', background: '#111', margin: '0 auto' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageURL}
                            alt="Scanned product label"
                            style={{ width: '100%', display: 'block', height: 'auto', opacity: showBoxes ? 0.9 : 1 }}
                          />
                          {showBoxes && result.regions && result.regions.map(r => {
                            const isSelected = selectedRegionId === r.id;
                            const isTamper = r.status === 'TAMPER';
                            const borderColor = isTamper ? '#D84315' : '#2E7D32';
                            const bgColor = isTamper ? 'rgba(216, 67, 21, 0.25)' : 'rgba(46, 125, 50, 0.2)';

                            return (
                              <div
                                key={r.id}
                                onClick={() => setSelectedRegionId(isSelected ? null : r.id)}
                                title={`${r.label}: ${r.value} (Confidence: ${r.confidence}%)`}
                                style={{
                                  position: 'absolute',
                                  top: `${r.normalized.top}%`,
                                  left: `${r.normalized.left}%`,
                                  width: `${r.normalized.width}%`,
                                  height: `${r.normalized.height}%`,
                                  border: `2px solid ${borderColor}`,
                                  backgroundColor: isSelected ? (isTamper ? 'rgba(216, 67, 21, 0.45)' : 'rgba(46, 125, 50, 0.4)') : bgColor,
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  boxShadow: isSelected ? `0 0 0 3px ${borderColor}` : undefined,
                                }}
                              >
                                <span
                                  style={{
                                    position: 'absolute',
                                    top: '-18px',
                                    left: '0',
                                    background: borderColor,
                                    color: '#fff',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {isTamper ? '\u{1F6A8} ' : '\u2713 '} {r.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Region Entities List */}
                      <div style={{ flex: 1, minWidth: '260px' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1B365D' }}>
                          Detected Field Regions ({result.regions?.length || 0})
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {result.regions && result.regions.length > 0 ? (
                            result.regions.map(r => {
                              const isTamper = r.status === 'TAMPER';
                              const isSelected = selectedRegionId === r.id;
                              return (
                                <div
                                  key={r.id}
                                  onClick={() => setSelectedRegionId(isSelected ? null : r.id)}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    background: isSelected ? '#EBF3FF' : '#F8F9FA',
                                    border: `1px solid ${isSelected ? '#003087' : '#E0E0E0'}`,
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  <div>
                                    <span style={{ fontWeight: 600, color: isTamper ? '#D84315' : '#1B365D' }}>
                                      {isTamper ? '\u{1F6A8} ' : '\u2713 '} {r.label}
                                    </span>
                                    <div style={{ fontSize: '0.78rem', color: '#666' }}>{r.value}</div>
                                  </div>
                                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isTamper ? '#D84315' : '#2E7D32' }}>
                                    {isTamper ? 'TAMPER SUSPECT' : `${r.confidence}% Conf`}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <p style={{ fontSize: '0.85rem', color: '#888' }}>No bounding box regions detected.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="gov-card">
                    <div className="gov-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span>&#128203; Rule 6 Mandatory Declarations &mdash; Compliance Findings</span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '4px 12px', fontSize: '0.82rem' }}
                        onClick={() => {
                          setEditedFields(result.fields || {});
                          setIsEditingFields(!isEditingFields);
                        }}
                      >
                        {isEditingFields ? '&#10005; Close Editor' : '&#9999;&#65039; Inspector Assisted Correction (HITL)'}
                      </button>
                    </div>

                    {isEditingFields && (
                      <div style={{ background: '#F0F5FA', border: '1px solid #C4D7ED', borderRadius: '6px', padding: '14px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                          <strong style={{ fontSize: '0.9rem', color: '#003087' }}>
                            &#9999;&#65039; Inspector Assisted Field Verification (Compensate for Camera / Packaging Distortion)
                          </strong>
                          <span style={{ fontSize: '0.78rem', color: '#555' }}>
                            Correct any OCR misreads or missing declarations, then re-evaluate.
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Generic Commodity Name (Rule 6(1)(b))</label>
                            <input
                              type="text"
                              style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem', border: '1px solid #CCC', borderRadius: '4px' }}
                              value={editedFields.generic_name || ''}
                              onChange={e => setEditedFields({ ...editedFields, generic_name: e.target.value })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Net Quantity (Rule 6(1)(b))</label>
                            <input
                              type="text"
                              style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem', border: '1px solid #CCC', borderRadius: '4px' }}
                              value={editedFields.net_quantity || ''}
                              onChange={e => setEditedFields({ ...editedFields, net_quantity: e.target.value })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>MRP (Rule 6(1)(f))</label>
                            <input
                              type="text"
                              style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem', border: '1px solid #CCC', borderRadius: '4px' }}
                              value={editedFields.mrp || ''}
                              onChange={e => setEditedFields({ ...editedFields, mrp: e.target.value })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Unit Sale Price - USP (Rule 6(11))</label>
                            <input
                              type="text"
                              style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem', border: '1px solid #CCC', borderRadius: '4px' }}
                              value={editedFields.unit_sale_price || ''}
                              onChange={e => setEditedFields({ ...editedFields, unit_sale_price: e.target.value })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Mfg / Packed Date (Rule 6(1)(d))</label>
                            <input
                              type="text"
                              style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem', border: '1px solid #CCC', borderRadius: '4px' }}
                              value={editedFields.month_year_of_mfg || ''}
                              onChange={e => setEditedFields({ ...editedFields, month_year_of_mfg: e.target.value })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Consumer Care (Rule 6(1)(l))</label>
                            <input
                              type="text"
                              style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem', border: '1px solid #CCC', borderRadius: '4px' }}
                              value={editedFields.consumer_care || ''}
                              onChange={e => setEditedFields({ ...editedFields, consumer_care: e.target.value })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Country of Origin (Rule 6(1)(m))</label>
                            <input
                              type="text"
                              style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem', border: '1px solid #CCC', borderRadius: '4px' }}
                              value={editedFields.country_of_origin || ''}
                              onChange={e => setEditedFields({ ...editedFields, country_of_origin: e.target.value })}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>FSSAI Licence No.</label>
                            <input
                              type="text"
                              style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem', border: '1px solid #CCC', borderRadius: '4px' }}
                              value={editedFields.fssai_lic || ''}
                              onChange={e => setEditedFields({ ...editedFields, fssai_lic: e.target.value })}
                            />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '3px' }}>Manufacturer / Packer Name &amp; Address (Rule 6(1)(a))</label>
                            <input
                              type="text"
                              style={{ width: '100%', padding: '6px 8px', fontSize: '0.82rem', border: '1px solid #CCC', borderRadius: '4px' }}
                              value={editedFields.manufacturer_name || ''}
                              onChange={e => setEditedFields({ ...editedFields, manufacturer_name: e.target.value })}
                            />
                          </div>
                          <div style={{ gridColumn: '1 / -1', marginTop: '4px' }}>
                            <label style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={editedFields.mrp_has_tax_clause ?? false}
                                onChange={e => setEditedFields({ ...editedFields, mrp_has_tax_clause: e.target.checked })}
                              />
                              Explicit tax clause &ldquo;Inclusive of all taxes&rdquo; present on packaging (Rule 6(1)(f))
                            </label>
                          </div>
                        </div>
                        <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                            onClick={() => setIsEditingFields(false)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ padding: '6px 16px', fontSize: '0.82rem' }}
                            onClick={handleReevaluate}
                          >
                            &#128260; Recalculate Compliance &amp; Update Notice
                          </button>
                        </div>
                      </div>
                    )}
                    <div style={{ overflowX: 'auto' }}>
                      <table className="results-table" aria-label="Compliance check findings">
                        <thead>
                          <tr>
                            <th>Field</th>
                            <th>Rule Reference</th>
                            <th>Severity</th>
                            <th>Value Detected</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.verdict.checks.map(c => (
                            <tr key={c.id}>
                              <td style={{ fontWeight: 500 }}>{c.label}</td>
                              <td style={{ fontSize: '0.82rem', color: '#5E5E5E' }}>{c.rule_ref}</td>
                              <td style={{ fontSize: '0.82rem' }}>{severityLabel(c.severity)}</td>
                              <td>
                                {c.found
                                  ? <span className="field-value">{c.found}</span>
                                  : <span className="field-missing">{c.note || 'Not detected'}</span>
                                }
                              </td>
                              <td><StatusBadge status={c.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Stage 4: GenAI Legal & Remediation Advisor */}
                  {result.explanation && (
                    <div className="gov-card" style={{ borderLeft: '4px solid #003087', background: '#F8FAFD' }}>
                      <div className="gov-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>&#129302; Autonomous Legal Advisor &mdash; AI Clause Interpretation</span>
                        <span style={{
                          fontSize: '0.8rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          background: result.explanation.severityLevel === 'HIGH' ? '#FDEDEC' : '#E8F5E2',
                          color: result.explanation.severityLevel === 'HIGH' ? '#C0392B' : '#1A6B0A',
                          border: `1px solid ${result.explanation.severityLevel === 'HIGH' ? '#E74C3C' : '#4CAF50'}`,
                        }}>
                          Severity: {result.explanation.severityLevel}
                        </span>
                      </div>
                      <h4 style={{ color: '#003087', margin: '8px 0 6px 0', fontSize: '1rem' }}>
                        {result.explanation.headline}
                      </h4>
                      <p style={{ fontSize: '0.9rem', color: '#333', lineHeight: 1.5, marginBottom: '14px' }}>
                        {result.explanation.summary}
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                        <div style={{ background: '#FFF', padding: '12px', borderRadius: '6px', border: '1px solid #E0E8F5' }}>
                          <h5 style={{ margin: '0 0 8px 0', fontSize: '0.86rem', color: '#003087', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>&#9878;&#65039;</span> Applicable Statutory Clauses
                          </h5>
                          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: '#444', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {result.explanation.legalClauses.map((clause, idx) => (
                              <li key={idx}><strong>{clause}</strong></li>
                            ))}
                          </ul>
                        </div>

                        <div style={{ background: '#FFF', padding: '12px', borderRadius: '6px', border: '1px solid #E0E8F5' }}>
                          <h5 style={{ margin: '0 0 8px 0', fontSize: '0.86rem', color: '#1A6B0A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>&#128736;&#65039;</span> Corrective Packaging Actions
                          </h5>
                          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: '#444', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {result.explanation.remediationAdvice.map((advice, idx) => (
                              <li key={idx}>{advice}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stage 4: Human-in-the-Loop (HITL) Inspector Review & Actions */}
                  <div className="gov-card" style={{ borderLeft: '4px solid #1B365D' }}>
                    <div className="gov-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span>&#128104;&#8205;&#9878;&#65039; Human-in-the-Loop Enforcement Review ({selectedRole.toUpperCase()})</span>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '4px',
                        background:
                          inspectorDecision === 'CONFIRMED' ? '#FDEDEC' :
                          inspectorDecision === 'DISMISSED' ? '#E8F5E2' :
                          inspectorDecision === 'LAB_SAMPLE' ? '#FEF9E5' : '#EBF3FF',
                        color:
                          inspectorDecision === 'CONFIRMED' ? '#C0392B' :
                          inspectorDecision === 'DISMISSED' ? '#1A6B0A' :
                          inspectorDecision === 'LAB_SAMPLE' ? '#8B5E00' : '#003087',
                        border: '1px solid currentColor',
                      }}>
                        {inspectorDecision === 'CONFIRMED' ? '\u{1F534} VIOLATION CONFIRMED' :
                         inspectorDecision === 'DISMISSED' ? '\u{1F7E2} FLAG DISMISSED' :
                         inspectorDecision === 'LAB_SAMPLE' ? '\u{1F7E1} LAB SAMPLE ROUTED' : '\u23F3 AWAITING OFFICER SIGN-OFF'}
                      </span>
                    </div>

                    {selectedRole === 'inspector' && (
                      <div style={{ marginTop: '10px' }}>
                        <p style={{ fontSize: '0.88rem', color: '#555', marginBottom: '12px' }}>
                          As Legal Metrology Officer, verify AI findings against physical packaging evidence before issuing a compounding notice under Section 18 / 36.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ background: '#C0392B', borderColor: '#C0392B', fontSize: '0.85rem', padding: '8px 16px' }}
                            onClick={() => setInspectorDecision('CONFIRMED')}
                          >
                            &#10003; Confirm Violation &amp; File Notice
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ borderColor: '#1A6B0A', color: '#1A6B0A', fontSize: '0.85rem', padding: '8px 16px' }}
                            onClick={() => setInspectorDecision('DISMISSED')}
                          >
                            &#10005; Dismiss AI Flag (False Positive)
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ borderColor: '#8B5E00', color: '#8B5E00', fontSize: '0.85rem', padding: '8px 16px' }}
                            onClick={() => setInspectorDecision('LAB_SAMPLE')}
                          >
                            &#128300; Seize Sample for Weights &amp; Measures Lab
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedRole === 'seller' && (
                      <div style={{ marginTop: '8px', fontSize: '0.88rem', color: '#444' }}>
                        <p><strong>Merchant Self-Audit:</strong> Resolve all Critical flags prior to dispatch to prevent consignment impoundment under Section 36 of the Legal Metrology Act.</p>
                      </div>
                    )}

                    {selectedRole === 'consumer' && (
                      <div style={{ marginTop: '8px', fontSize: '0.88rem', color: '#444' }}>
                        <p><strong>Consumer Right to Accurate Information:</strong> If you were overcharged beyond declared MRP or found tampered stickers, file a report via National Consumer Helpline <strong>1915</strong> or INGRAM portal.</p>
                      </div>
                    )}
                  </div>

                  <div className="gov-card">
                    <div className="gov-card-title">
                      <span>&#128221;</span> Extracted Label Text
                      <button
                        id="toggle-ocr-btn"
                        onClick={() => setShowOcr(!showOcr)}
                        className="btn btn-secondary"
                        style={{ marginLeft: 'auto', padding: '4px 14px', fontSize: '0.82rem' }}
                      >
                        {showOcr ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    {showOcr && (
                      <pre className="ocr-text-box">{result.ocrText || '(no text detected)'}</pre>
                    )}
                    {!showOcr && (
                      <p style={{ color: '#9E9E9E', fontSize: '0.88rem' }}>
                        {result.ocrText.length} characters detected on package.
                      </p>
                    )}
                  </div>

                  <div className="no-print" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
                    <button
                      id="gen-notice-btn"
                      className="btn btn-primary"
                      style={{ background: '#003087', borderColor: '#003087' }}
                      onClick={() => setShowNoticeModal(true)}
                    >
                      &#128220; Generate Statutory Notice (Form VII)
                    </button>
                    <button id="new-scan-btn" className="btn btn-secondary" onClick={reset}>
                      &#128247; New Inspection
                    </button>
                    <button
                      id="print-btn"
                      className="btn btn-secondary"
                      onClick={() => window.print()}
                    >
                      &#128424;&#65039; Print Full Inspection
                    </button>
                  </div>

                  {showNoticeModal && (
                    <StatutoryNoticeModal
                      result={result}
                      imageURL={imageURL}
                      onClose={() => setShowNoticeModal(false)}
                    />
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'history' && (
            <div className="gov-card">
              <div className="gov-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <span>&#128193; Evidence Repository &mdash; Inspection History</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Search product, packer, or notice ID..."
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #CCC', fontSize: '0.85rem', minWidth: '240px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '6px 14px', fontSize: '0.82rem' }}
                    onClick={() => { reset(); setActiveTab('scan'); }}
                  >
                    + New Scan
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '8px', margin: '14px 0', flexWrap: 'wrap' }}>
                {(['ALL', 'COMPLIANT', 'NON_COMPLIANT', 'TAMPER_SUSPECT'] as const).map(f => (
                  <button
                    key={f}
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setHistoryFilter(f)}
                    style={{
                      padding: '4px 12px',
                      fontSize: '0.8rem',
                      background: historyFilter === f ? 'var(--gov-navy)' : 'transparent',
                      color: historyFilter === f ? '#fff' : 'var(--gov-navy)',
                    }}
                  >
                    {f.replace('_', ' ')}
                  </button>
                ))}
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table className="results-table" aria-label="Historical inspections ledger">
                  <thead>
                    <tr>
                      <th>Notice Reference</th>
                      <th>Product &amp; Packer</th>
                      <th>Timestamp</th>
                      <th>Verdict</th>
                      <th>Evidence SHA-256</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{item.id}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.productName}</div>
                          <div style={{ fontSize: '0.78rem', color: '#666' }}>{item.manufacturer}</div>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: '#555' }}>{item.timestamp}</td>
                        <td>
                          <span className={`status-badge ${
                            item.verdict.overall === 'COMPLIANT' ? 'status-compliant' :
                            item.verdict.overall === 'TAMPER_SUSPECT' ? 'status-non-compliant' :
                            item.verdict.overall === 'NON_COMPLIANT' ? 'status-non-compliant' : 'status-warning'
                          }`}>
                            {item.verdict.overall === 'COMPLIANT' ? '✓ COMPLIANT' :
                             item.verdict.overall === 'TAMPER_SUSPECT' ? '🚨 TAMPER SUSPECT' :
                             item.verdict.overall === 'NON_COMPLIANT' ? '✗ VIOLATION' : '! PARTIAL'}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#555' }}>
                          {item.evidenceHash.slice(0, 16)}...
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '3px 10px', fontSize: '0.78rem' }}
                            onClick={() => {
                              setResult({
                                ocrText: item.ocrText || '',
                                fields: item.fields,
                                verdict: item.verdict,
                                tamper: item.tamper,
                                regions: item.regions,
                                explanation: item.explanation,
                                evidenceHash: item.evidenceHash,
                                timestamp: item.timestamp,
                              });
                              setStage('results');
                              setActiveTab('scan');
                            }}
                          >
                            Open Case &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredHistory.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#888' }}>
                          No inspections match the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <>
              {/* Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="gov-card" style={{ marginBottom: 0 }}>
                  <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>TOTAL INSPECTIONS</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--gov-navy)', margin: '4px 0' }}>142</div>
                  <div style={{ fontSize: '0.75rem', color: '#1A6B0A' }}>+18 scans today</div>
                </div>
                <div className="gov-card" style={{ marginBottom: 0 }}>
                  <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>OVERALL COMPLIANCE</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1A6B0A', margin: '4px 0' }}>74.6%</div>
                  <div style={{ fontSize: '0.75rem', color: '#555' }}>Statutory Rule 6 benchmark</div>
                </div>
                <div className="gov-card" style={{ marginBottom: 0 }}>
                  <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>TAMPERED PACKAGES</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#D84315', margin: '4px 0' }}>11</div>
                  <div style={{ fontSize: '0.75rem', color: '#D84315' }}>Price overwrites flagged</div>
                </div>
                <div className="gov-card" style={{ marginBottom: 0 }}>
                  <div style={{ fontSize: '0.8rem', color: '#666', fontWeight: 600 }}>FORM VII NOTICES FILED</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#003087', margin: '4px 0' }}>26</div>
                  <div style={{ fontSize: '0.75rem', color: '#555' }}>Section 18/36 proceedings</div>
                </div>
              </div>

              {/* Rule Violation Breakdown */}
              <div className="gov-card">
                <div className="gov-card-title">
                  <span>&#128202;</span> Most Frequent Statutory Rule Contraventions
                </div>
                <p style={{ fontSize: '0.88rem', color: '#555', marginBottom: '16px' }}>
                  Distribution of non-compliant declarations identified by the autonomous compliance engine across packaged commodities:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {[
                    { rule: 'Rule 6(11) - Unit Sale Price (USP) Omission', pct: 42, color: '#C0392B' },
                    { rule: 'Rule 6(1)(f) - MRP Missing Tax Suffix ("Inclusive of all taxes")', pct: 28, color: '#E67E22' },
                    { rule: 'Section 36 - Suspected Price Alteration / Duplicate Sticker', pct: 16, color: '#D84315' },
                    { rule: 'Rule 6(1)(b) - Generic Commodity Identity Missing', pct: 14, color: '#8E44AD' },
                    { rule: 'Rule 6(1)(l) - Incomplete Consumer Care Address / Helpline', pct: 12, color: '#2980B9' },
                  ].map((item, idx) => (
                    <div key={idx}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>
                        <span>{item.rule}</span>
                        <span style={{ color: item.color }}>{item.pct}% of breaches</span>
                      </div>
                      <div style={{ background: '#ECEFF1', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${item.pct}%`, background: item.color, height: '100%', borderRadius: '5px' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'settings' && (
            <div className="gov-card">
              <div className="gov-card-title">
                <span>&#9881;&#65039;</span> Portal Architecture &amp; Regulatory Parameters
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '12px' }}>
                <div style={{ background: '#F8FAFD', padding: '16px', borderRadius: '6px', border: '1px solid #E0E8F5' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--gov-navy)', fontSize: '0.92rem' }}>Statutory Rule Base</h4>
                  <p style={{ fontSize: '0.85rem', color: '#555', margin: 0 }}>
                    Legal Metrology Act, 2009 &amp; Packaged Commodities Rules, 2011 (Amended 2021/2022). Active rule set: Rule 6(1)(a)-(m) and Rule 6(11) Unit Sale Price.
                  </p>
                </div>
                <div style={{ background: '#F8FAFD', padding: '16px', borderRadius: '6px', border: '1px solid #E0E8F5' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--gov-navy)', fontSize: '0.92rem' }}>Authenticity &amp; Tamper Threshold</h4>
                  <p style={{ fontSize: '0.85rem', color: '#555', margin: 0 }}>
                    Dual-MRP conflict detection: Active (&gt;15% delta threshold). Digit kerning &amp; texture anomaly detection: 80% confidence trigger.
                  </p>
                </div>
                <div style={{ background: '#F8FAFD', padding: '16px', borderRadius: '6px', border: '1px solid #E0E8F5' }}>
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--gov-navy)', fontSize: '0.92rem' }}>Digital Evidence Cryptography</h4>
                  <p style={{ fontSize: '0.85rem', color: '#555', margin: 0 }}>
                    SHA-256 cryptographic image hashing compliant with Section 65B of Indian Evidence Act / Bharatiya Sakshya Adhiniyam.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}