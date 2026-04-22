// Improvements: #6 PDF export, #16 decision record, #19 feedback
import React, { useState } from 'react';
import DiscrepancyTable from './DiscrepancyTable.jsx';
import ExtractedFields from './ExtractedFields.jsx';
import { submitDecision } from '../api.js';

const REC = {
  ACCEPT:                 { bg: '#eafaf1', border: '#27ae60', color: '#1e8449', icon: '✅' },
  REJECT:                 { bg: '#fdecea', border: '#e74c3c', color: '#c0392b', icon: '❌' },
  CONDITIONAL_ACCEPTANCE: { bg: '#fef9e7', border: '#f39c12', color: '#d68910', icon: '⚠️'  }
};
const CHECK_LABELS = {
  invoice_vs_lc: 'Invoice vs LC', bl_vs_lc: 'BL vs LC', insurance_vs_lc: 'Insurance vs LC',
  cross_document_consistency: 'Cross-Doc Consistency', document_set_completeness: 'Doc Set Completeness', dates_compliance: 'Dates Compliance'
};

function StatusPill({ s }) {
  const c = s === 'PASS' ? '#27ae60' : s === 'FAIL' ? '#e74c3c' : s === 'PARTIAL' ? '#f39c12' : '#888';
  return <span style={{ background: c + '18', color: c, padding: '3px 10px', borderRadius: 12, fontWeight: 700, fontSize: 11 }}>{s || 'N/A'}</span>;
}

// #16 Decision panel
function DecisionPanel({ submissionId }) {
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!decision) return;
    setSaving(true);
    try {
      const rec = await submitDecision(submissionId, decision, reason);
      setSaved(rec.record);
    } catch (err) { alert('Failed to save decision: ' + err.message); }
    finally { setSaving(false); }
  };

  if (saved) {
    return (
      <div style={{ background: '#eafaf1', border: '1px solid #27ae60', borderRadius: 8, padding: '14px 18px', fontSize: 14 }}>
        ✅ Decision recorded: <strong>{saved.decision}</strong> by {saved.decidedBy} at {new Date(saved.decidedAt).toLocaleString()}
      </div>
    );
  }

  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e0e8f0', borderRadius: 8, padding: '16px 20px' }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a2a3a', marginBottom: 12 }}>Record Checker Decision</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        {['ACCEPT', 'REFER', 'REJECT'].map(d => (
          <button key={d} onClick={() => setDecision(d)}
            style={{ padding: '8px 18px', border: `2px solid ${decision === d ? '#1a5276' : '#c8d6e5'}`, background: decision === d ? '#1a5276' : '#fff', color: decision === d ? '#fff' : '#5a6a7e', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            {d}
          </button>
        ))}
      </div>
      <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason / notes (optional)…"
        style={{ width: '100%', height: 72, padding: '8px 12px', border: '1px solid #c8d6e5', borderRadius: 6, fontSize: 13, resize: 'vertical', marginBottom: 10 }} />
      <button onClick={submit} disabled={!decision || saving}
        style={{ padding: '9px 22px', background: '#1a5276', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer', opacity: !decision || saving ? 0.5 : 1 }}>
        {saving ? 'Saving…' : 'Save Decision'}
      </button>
    </div>
  );
}

export default function ValidationReport({ result, onReset }) {
  const { submissionId, processedAt, durationMs, documentTypes = [], extractedFields = {}, validation = {}, docsNeedingManualEntry = [] } = result;
  const { validation_result, recommendation, discrepancies = [], compliance_checks = {}, summary_notes, checker_recommendation, summary = {} } = validation;
  const [localValidation, setLocalValidation] = useState(validation);
  const rec = REC[recommendation] || REC.CONDITIONAL_ACCEPTANCE;

  // #6 PDF export via browser print
  const handleExport = () => window.print();

  const handleRevalidate = (newResult) => {
    setLocalValidation(newResult.validation);
  };

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>

      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 16 }} className="no-print">
        <button onClick={handleExport} style={{ padding: '8px 18px', border: '1px solid #c5d8e8', borderRadius: 6, background: '#fff', color: '#1a5276', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ⬇ Export PDF
        </button>
        <button onClick={onReset} style={{ padding: '8px 18px', border: 'none', borderRadius: 6, background: '#1a5276', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          ← New Validation
        </button>
      </div>

      {/* Summary banner */}
      <div className="print-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, padding: '20px 24px', borderRadius: 10, background: rec.bg, border: `2px solid ${rec.border}`, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 36 }}>{rec.icon}</span>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: rec.color }}>{recommendation?.replace(/_/g, ' ')}</div>
            <div style={{ fontSize: 12, color: '#5a6a7e', marginTop: 2 }}>{validation_result}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          {[['Fatal', summary.fatalCount, '#c0392b'], ['Minor', summary.minorCount, '#d68910'], ['Advisory', summary.advisoryCount, '#7f8c8d']].map(([label, count, color]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{count ?? 0}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Metadata */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: '#5a6a7e', background: '#f8fafc', padding: '10px 16px', borderRadius: 8, border: '1px solid #e0e8f0', marginBottom: 24 }}>
        <span>ID: <strong>{submissionId}</strong></span>
        <span>Processed: <strong>{new Date(processedAt).toLocaleString()}</strong></span>
        <span>Duration: <strong>{durationMs}ms</strong></span>
        <span>Docs: <strong>{documentTypes.join(', ').toUpperCase()}</strong></span>
        {summary.guardrailFlagCount > 0 && <span style={{ color: '#f39c12' }}>⚠️ {summary.guardrailFlagCount} guardrail flag(s) — review manually</span>}
      </div>

      {/* Compliance checks */}
      <div className="print-section" style={{ marginBottom: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a2a3a', marginBottom: 12 }}>Compliance Checks</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {Object.entries(CHECK_LABELS).map(([key, label]) => (
            <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e0e8f0', borderRadius: 8, padding: '11px 14px' }}>
              <span style={{ fontSize: 13, color: '#2c3e50' }}>{label}</span>
              <StatusPill s={localValidation.compliance_checks?.[key]} />
            </div>
          ))}
        </div>
      </div>

      {/* Discrepancies */}
      <div className="print-section" style={{ marginBottom: 28 }}>
        <DiscrepancyTable discrepancies={localValidation.discrepancies || []} submissionId={submissionId} />
      </div>

      {/* Extracted fields with edit/re-validate */}
      <div className="print-section" style={{ marginBottom: 28 }}>
        <ExtractedFields extractedFields={extractedFields} discrepancies={localValidation.discrepancies || []} onRevalidate={handleRevalidate} />
      </div>

      {/* Summary notes */}
      {localValidation.summary_notes && (
        <div className="print-section" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a2a3a', marginBottom: 10 }}>Summary Notes</h3>
          <div style={{ background: '#fafafa', border: '1px solid #e0e8f0', borderRadius: 8, padding: '14px 18px', fontSize: 14, color: '#2c3e50', lineHeight: 1.7 }}>{localValidation.summary_notes}</div>
        </div>
      )}

      {/* Checker recommendation */}
      {localValidation.checker_recommendation && (
        <div className="print-section" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a2a3a', marginBottom: 10 }}>Checker Recommendation</h3>
          <div style={{ background: '#eaf2fb', border: '1px solid #aed6f1', borderRadius: 8, padding: '14px 18px', fontSize: 14, color: '#2c3e50', lineHeight: 1.7 }}>{localValidation.checker_recommendation}</div>
        </div>
      )}

      {/* Decision panel (#16) */}
      <div className="print-section no-print" style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a2a3a', marginBottom: 10 }}>Checker Decision</h3>
        <DecisionPanel submissionId={submissionId} />
      </div>
    </div>
  );
}
