// Improvements: #7 expandable rows, #9 sort by severity, #19 feedback buttons, #20 guardrail flag
import React, { useState } from 'react';
import { submitFeedback } from '../api.js';

const SEV = {
  FATAL:    { bg: '#fdecea', badge: '#e74c3c', text: '#fff' },
  MINOR:    { bg: '#fff8e1', badge: '#f39c12', text: '#fff' },
  ADVISORY: { bg: '#f5f5f5', badge: '#7f8c8d', text: '#fff' }
};

const SEV_ORDER = { FATAL: 0, MINOR: 1, ADVISORY: 2 };

// #19 Feedback buttons per discrepancy row
function FeedbackButtons({ submissionId, discrepancyId }) {
  const [verdict, setVerdict] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (v) => {
    setSaving(true);
    try {
      await submitFeedback(submissionId, discrepancyId, v);
      setVerdict(v);
    } catch { /* swallow — feedback is best-effort */ }
    finally { setSaving(false); }
  };

  if (verdict) return <span style={{ fontSize: 11, color: '#27ae60', fontWeight: 600 }}>✓ {verdict}</span>;
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {['CORRECT', 'INCORRECT', 'PARTIAL'].map(v => (
        <button key={v} disabled={saving} onClick={() => submit(v)}
          style={{ fontSize: 10, padding: '2px 7px', border: '1px solid #c8d6e5', borderRadius: 4, background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#5a6a7e' }}>
          {v === 'CORRECT' ? '👍' : v === 'INCORRECT' ? '👎' : '~'} {v}
        </button>
      ))}
    </div>
  );
}

export default function DiscrepancyTable({ discrepancies = [], submissionId }) {
  const [expanded, setExpanded] = useState(new Set());

  if (!discrepancies.length) {
    return <div style={{ padding: 16, background: '#f0faf4', border: '1px solid #a9dfbf', borderRadius: 8, color: '#27ae60', fontWeight: 600 }}>No discrepancies found.</div>;
  }

  // #9 Sort FATAL → MINOR → ADVISORY
  const sorted = [...discrepancies].sort((a, b) => (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3));

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a2a3a', marginBottom: 12 }}>
        Discrepancies ({discrepancies.length})
      </h3>
      <div style={{ border: '1px solid #e0e8f0', borderRadius: 8, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '90px 80px 130px 140px 1fr', background: '#1a5276', color: '#fff', fontSize: 11, fontWeight: 700, padding: '10px 14px', gap: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Severity</span><span>Doc</span><span>Field</span><span>UCP Rule</span><span>Summary</span>
        </div>
        {sorted.map((d) => {
          const colors = SEV[d.severity] || SEV.ADVISORY;
          const isOpen = expanded.has(d.id);
          return (
            <div key={d.id} style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              {/* Summary row — click to expand (#7) */}
              <div onClick={() => toggle(d.id)} style={{ display: 'grid', gridTemplateColumns: '90px 80px 130px 140px 1fr', background: colors.bg, padding: '10px 14px', gap: 8, cursor: 'pointer', alignItems: 'start', fontSize: 13 }}>
                <span style={{ background: colors.badge, color: colors.text, padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, display: 'inline-block', textAlign: 'center' }}>
                  {d.severity}
                </span>
                <span style={{ fontWeight: 600 }}>{d.document}</span>
                <span style={{ wordBreak: 'break-word' }}>{d.field}</span>
                <span style={{ color: '#1a5276', fontWeight: 600, fontSize: 11 }}>{d.ucp_article}</span>
                <span style={{ color: '#5a6a7e' }}>
                  {d.description?.slice(0, 80)}{d.description?.length > 80 ? '…' : ''}&nbsp;
                  <span style={{ color: '#1a5276', fontSize: 11 }}>{isOpen ? '▲ less' : '▼ more'}</span>
                  {d._guardrail_flag && <span style={{ marginLeft: 8, color: '#f39c12', fontSize: 10, fontWeight: 700 }}>⚠ VERIFY</span>}
                </span>
              </div>
              {/* Expanded detail (#7) */}
              {isOpen && (
                <div style={{ background: '#fafcff', padding: '14px 18px', borderTop: '1px dashed #e0e8f0', fontSize: 13, display: 'grid', gap: 10 }}>
                  <div><span style={lbl}>LC Requirement:</span> {d.lc_requirement}</div>
                  <div><span style={lbl}>Found Value:</span> <span style={{ color: '#c0392b' }}>{d.found_value}</span></div>
                  <div><span style={lbl}>Full Description:</span> {d.description}</div>
                  <div><span style={lbl}>Remediation:</span> <span style={{ color: '#27ae60' }}>{d.remediation}</span></div>
                  {d._guardrail_flag && (
                    <div style={{ background: '#fff8e1', border: '1px solid #f39c12', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#7d6608' }}>
                      ⚠️ <strong>Guardrail note:</strong> {d._guardrail_note}
                    </div>
                  )}
                  {submissionId && (
                    <div>
                      <span style={lbl}>Was this finding correct?</span>
                      <div style={{ marginTop: 6 }}>
                        <FeedbackButtons submissionId={submissionId} discrepancyId={d.id} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const lbl = { fontWeight: 700, color: '#5a6a7e', marginRight: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' };
