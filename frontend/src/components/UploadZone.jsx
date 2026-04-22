// Improvements: #5 drag-and-drop, #4 file type/size display, remove file button
import React, { useRef, useState } from 'react';

const DOC_TYPES = [
  { key: 'lc',        label: 'Letter of Credit',       required: true,  icon: '📄' },
  { key: 'invoice',   label: 'Commercial Invoice',      required: true,  icon: '🧾' },
  { key: 'bl',        label: 'Bill of Lading',          required: true,  icon: '🚢' },
  { key: 'insurance', label: 'Insurance Certificate',   required: false, icon: '🛡️' }
];

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function UploadZone({ files, onFileChange, onValidate, onDemo, uploading }) {
  const inputRefs = { lc: useRef(), invoice: useRef(), bl: useRef(), insurance: useRef() };
  const [dragOver, setDragOver] = useState(null); // key of card being dragged over

  const handleDrop = (key, e) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) onFileChange(key, file);
  };

  const handleDragOver = (key, e) => { e.preventDefault(); setDragOver(key); };
  const handleDragLeave = () => setDragOver(null);

  const lcUploaded = !!files.lc;

  return (
    <div style={s.container}>
      <p style={s.subtitle}>Upload documents below. LC is required. Drag-and-drop or click each card.</p>
      <div style={s.grid}>
        {DOC_TYPES.map(({ key, label, required, icon }) => {
          const file = files[key];
          const selected = !!file;
          const isDragTarget = dragOver === key;

          return (
            <div key={key}
              onClick={() => inputRefs[key].current.click()}
              onDrop={e => handleDrop(key, e)}
              onDragOver={e => handleDragOver(key, e)}
              onDragLeave={handleDragLeave}
              style={{ ...s.card, ...(selected ? s.cardSelected : {}), ...(isDragTarget ? s.cardDrag : {}), cursor: 'pointer' }}>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt"
                ref={inputRefs[key]} style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) onFileChange(key, e.target.files[0]); }} />
              <div style={s.icon}>{icon}</div>
              <div style={s.cardLabel}>{label}</div>
              <span style={required ? s.badgeReq : s.badgeOpt}>{required ? 'Required' : 'Optional'}</span>
              {selected ? (
                <div style={s.fileInfo}>
                  <span style={s.checkmark}>✓</span>{' '}
                  <span style={s.fileName} title={file.name}>{file.name.length > 22 ? file.name.slice(0, 20) + '…' : file.name}</span>
                  <span style={s.fileSize}>{formatBytes(file.size)}</span>
                  <button style={s.removeBtn} onClick={e => { e.stopPropagation(); onFileChange(key, null); }} title="Remove">✕</button>
                </div>
              ) : (
                <div style={s.hint}>{isDragTarget ? 'Drop here' : 'Click or drag file'}</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={s.actions}>
        <button style={{ ...s.btn, ...s.btnPrimary, opacity: lcUploaded && !uploading ? 1 : 0.5 }}
          onClick={onValidate} disabled={!lcUploaded || uploading}>
          {uploading ? 'Validating…' : 'Validate Documents'}
        </button>
        <button style={{ ...s.btn, ...s.btnSecondary }} onClick={onDemo} disabled={uploading}>
          Run Demo
        </button>
      </div>
    </div>
  );
}

const s = {
  container: { maxWidth: 860, margin: '0 auto', padding: '0 8px' },
  subtitle: { color: '#5a6a7e', fontSize: 14, marginBottom: 24, lineHeight: 1.6 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 },
  card: { background: '#fff', border: '2px dashed #c8d6e5', borderRadius: 10, padding: '24px 20px', textAlign: 'center', transition: 'all 0.15s', userSelect: 'none', position: 'relative' },
  cardSelected: { border: '2px solid #1a5276', background: '#eaf2fb' },
  cardDrag: { border: '2px dashed #27ae60', background: '#eafaf1', transform: 'scale(1.02)' },
  icon: { fontSize: 32, marginBottom: 8 },
  cardLabel: { fontWeight: 600, fontSize: 14, color: '#1a2a3a', marginBottom: 6 },
  badgeReq: { display: 'inline-block', background: '#d4e6f1', color: '#1a5276', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' },
  badgeOpt: { display: 'inline-block', background: '#f0f0f0', color: '#888', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' },
  fileInfo: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12 },
  checkmark: { color: '#27ae60', fontWeight: 700 },
  fileName: { color: '#1a5276', fontWeight: 500 },
  fileSize: { color: '#95a5a6', fontSize: 11 },
  removeBtn: { background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontWeight: 700, fontSize: 13, padding: '0 2px', lineHeight: 1 },
  hint: { fontSize: 12, color: '#9aadbc', marginTop: 4 },
  actions: { display: 'flex', gap: 12, justifyContent: 'center' },
  btn: { padding: '11px 28px', borderRadius: 6, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer' },
  btnPrimary: { background: '#1a5276', color: '#fff' },
  btnSecondary: { background: '#eaf0f6', color: '#1a5276', border: '1px solid #c5d8e8' }
};
