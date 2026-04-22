// Improvements: #8 highlight mismatched fields, #13 confidence score display, #14 manual entry
import React, { useState } from 'react';
import { revalidateManual } from '../api.js';

const TABS = { lc: 'Letter of Credit', invoice: 'Commercial Invoice', bl: 'Bill of Lading', insurance: 'Insurance' };
const CONF_COLORS = { HIGH: '#27ae60', MEDIUM: '#f39c12', LOW: '#e74c3c' };

export default function ExtractedFields({ extractedFields = {}, discrepancies = [], onRevalidate }) {
  const tabs = Object.keys(extractedFields).filter(k => extractedFields[k]);
  const [active, setActive] = useState(tabs[0] || 'lc');
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);

  if (!tabs.length) return null;

  // Build a set of flagged fields: "doctype.fieldname"
  const flagged = new Set(
    discrepancies.map(d => `${d.document?.toLowerCase()}.${d.field?.toLowerCase()}`)
  );

  const fields = extractedFields[active] || {};
  const needsManual = fields.needsManualEntry;
  const confidence = fields.confidence || {};

  const handleEdit = (key, val) => setEdits(prev => ({ ...prev, [active]: { ...(prev[active] || {}), [key]: val } }));

  const handleRevalidate = async () => {
    setSaving(true);
    try {
      const merged = {};
      for (const [docType, f] of Object.entries(extractedFields)) {
        merged[docType] = { ...f, ...(edits[docType] || {}) };
      }
      const result = await revalidateManual(merged, null);
      onRevalidate && onRevalidate(result);
      setEditMode(false);
      setEdits({});
    } catch (err) {
      alert('Re-validation failed: ' + err.message);
    } finally { setSaving(false); }
  };

  const entries = Object.entries(fields).filter(([k, v]) => k !== 'confidence' && k !== 'needsManualEntry' && k !== 'error' && v !== null && v !== undefined && v !== '');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a2a3a' }}>Extracted Document Fields</h3>
        <button onClick={() => setEditMode(e => !e)} style={{ fontSize: 12, padding: '5px 14px', border: '1px solid #c5d8e8', borderRadius: 5, background: editMode ? '#1a5276' : '#fff', color: editMode ? '#fff' : '#1a5276', cursor: 'pointer', fontWeight: 600 }}>
          {editMode ? 'Cancel Edit' : '✏ Edit Fields'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid #e0e8f0', marginBottom: 0 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActive(tab)}
            style={{ padding: '9px 18px', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, color: active === tab ? '#1a5276' : '#7f8c8d', borderBottom: active === tab ? '2px solid #1a5276' : '2px solid transparent', marginBottom: -2, transition: 'all 0.15s' }}>
            {TABS[tab] || tab.toUpperCase()}
            {extractedFields[tab]?.needsManualEntry && <span style={{ color: '#e74c3c', marginLeft: 4 }}>!</span>}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0e8f0', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 16 }}>
        {needsManual && (
          <div style={{ background: '#fff8e1', border: '1px solid #f39c12', borderRadius: 6, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#7d6608' }}>
            ⚠️ Extraction failed for this document. Please fill in key fields manually and re-validate.
          </div>
        )}
        {fields.error && !needsManual && (
          <div style={{ color: '#c0392b', background: '#fdecea', padding: 12, borderRadius: 6, marginBottom: 12, fontSize: 13 }}>{fields.error}</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {entries.map(([key, value]) => {
            const flagKey = `${active}.${key.toLowerCase()}`;
            const isFlagged = flagged.has(flagKey);
            const conf = confidence[key];
            const currentVal = (edits[active] || {})[key] ?? (Array.isArray(value) ? value.join(', ') : String(value));
            return (
              <div key={key} style={{ background: isFlagged ? '#fdecea' : '#f8fafc', borderRadius: 6, padding: '9px 12px', border: `1px solid ${isFlagged ? '#e74c3c' : '#e8eef4'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: isFlagged ? '#c0392b' : '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {key.replace(/_/g, ' ')}{isFlagged && ' ⚠'}
                  </span>
                  {conf && <span style={{ fontSize: 9, fontWeight: 700, color: CONF_COLORS[conf] || '#888', textTransform: 'uppercase' }}>{conf}</span>}
                </div>
                {editMode ? (
                  <input value={currentVal} onChange={e => handleEdit(key, e.target.value)}
                    style={{ width: '100%', fontSize: 12, border: '1px solid #c8d6e5', borderRadius: 4, padding: '4px 8px', color: '#1a2a3a' }} />
                ) : (
                  <div style={{ fontSize: 12, color: '#1a2a3a', wordBreak: 'break-word', lineHeight: 1.5 }}>
                    {Array.isArray(value) ? <ul style={{ paddingLeft: 14, margin: 0 }}>{value.map((v, i) => <li key={i}>{v}</li>)}</ul> : String(value)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {editMode && (
          <button onClick={handleRevalidate} disabled={saving}
            style={{ marginTop: 16, padding: '10px 24px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Re-validating…' : '↻ Re-validate with Edited Fields'}
          </button>
        )}
      </div>
    </div>
  );
}
