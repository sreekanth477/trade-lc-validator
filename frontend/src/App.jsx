import React, { useState } from 'react';
import LoginPage from './components/LoginPage.jsx';
import UploadZone from './components/UploadZone.jsx';
import ValidationReport from './components/ValidationReport.jsx';
import { validateDocuments, validateDemo, clearToken, getToken } from './api.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | validating | result | error
  const [files, setFiles] = useState({ lc: null, invoice: null, bl: null, insurance: null });
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (data) => setUser({ username: data.username, role: data.role });
  const handleLogout = () => { clearToken(); setUser(null); setPhase('idle'); setResult(null); };

  const handleFileChange = (key, file) => setFiles(prev => ({ ...prev, [key]: file }));

  const runValidation = async (fn) => {
    setPhase('validating');
    try {
      setResult(await fn());
      setPhase('result');
    } catch (err) {
      setErrorMsg(err.response?.data?.error || err.message || 'Validation failed.');
      setPhase('error');
    }
  };

  const handleValidate = () => runValidation(async () => {
    const fd = new FormData();
    for (const [key, file] of Object.entries(files)) if (file) fd.append(key, file);
    fd.append('presented_date', new Date().toISOString().split('T')[0]);
    return validateDocuments(fd);
  });

  const handleDemo = () => runValidation(validateDemo);
  const handleReset = () => { setPhase('idle'); setFiles({ lc: null, invoice: null, bl: null, insurance: null }); setResult(null); setErrorMsg(''); };

  if (!user) return <LoginPage onLogin={handleLogin} />;

  return (
    <div style={s.page}>
      {/* Header */}
      <header style={s.header} className="no-print">
        <div style={s.headerInner}>
          <div style={s.logo}>
            <span style={{ fontSize: 28 }}>⚖️</span>
            <div>
              <div style={s.logoTitle}>Trade LC Validator</div>
              <div style={s.logoSub}>UCP 600 Compliance Engine</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={s.badge}>Powered by Claude AI</span>
            <span style={s.userChip}>👤 {user.username}</span>
            <button onClick={handleLogout} style={s.logoutBtn}>Sign Out</button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={s.main}>
        {phase === 'idle' && (
          <div style={s.card}>
            <h2 style={s.cardTitle}>Document Submission</h2>
            <UploadZone files={files} onFileChange={handleFileChange}
              onValidate={handleValidate} onDemo={handleDemo} uploading={false} />
          </div>
        )}

        {phase === 'validating' && (
          <div style={s.card}>
            <h2 style={s.cardTitle}>Document Submission</h2>
            <UploadZone files={files} onFileChange={handleFileChange}
              onValidate={handleValidate} onDemo={handleDemo} uploading={true} />
            <div style={s.loadingBox}>
              <div style={s.spinner} />
              <div style={s.loadingText}>Extracting fields and validating against UCP 600…</div>
              <div style={s.loadingSub}>This takes 30–60 seconds. Claude AI is analysing your documents.</div>
            </div>
          </div>
        )}

        {phase === 'result' && result && (
          <div style={s.card}>
            <h2 style={s.cardTitle}>Validation Report</h2>
            <ValidationReport result={result} onReset={handleReset} />
          </div>
        )}

        {phase === 'error' && (
          <div style={s.card}>
            <div style={{ textAlign: 'center', padding: '40px 24px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#c0392b', marginBottom: 12 }}>Validation Failed</div>
              <div style={{ fontSize: 14, color: '#5a6a7e', maxWidth: 480, margin: '0 auto 24px' }}>{errorMsg}</div>
              <button onClick={handleReset} style={{ padding: '11px 28px', background: '#1a5276', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Try Again</button>
            </div>
          </div>
        )}
      </main>

      <footer style={s.footer} className="no-print">
        UCP 600 Trade Finance Compliance Engine — For authorised bank operations use only
      </footer>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', background: '#f0f4f8', display: 'flex', flexDirection: 'column' },
  header: { background: '#0d2137', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
  headerInner: { maxWidth: 1140, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { display: 'flex', alignItems: 'center', gap: 12 },
  logoTitle: { color: '#fff', fontSize: 18, fontWeight: 800 },
  logoSub: { color: '#7fb3d3', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' },
  badge: { background: '#1a5276', color: '#aed6f1', fontSize: 11, fontWeight: 600, padding: '3px 12px', borderRadius: 20 },
  userChip: { color: '#aed6f1', fontSize: 13, fontWeight: 500 },
  logoutBtn: { background: 'none', border: '1px solid #4a7a9b', color: '#aed6f1', padding: '5px 14px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  main: { flex: 1, maxWidth: 1140, margin: '0 auto', width: '100%', padding: '28px 16px' },
  card: { background: '#fff', borderRadius: 12, padding: '28px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: 24 },
  cardTitle: { fontSize: 19, fontWeight: 700, color: '#0d2137', marginBottom: 22, paddingBottom: 14, borderBottom: '2px solid #e0e8f0' },
  loadingBox: { textAlign: 'center', padding: '40px 0 20px' },
  spinner: { width: 48, height: 48, border: '5px solid #e0e8f0', borderTop: '5px solid #1a5276', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' },
  loadingText: { fontSize: 17, fontWeight: 600, color: '#1a2a3a', marginBottom: 6 },
  loadingSub: { fontSize: 13, color: '#7f8c8d' },
  footer: { background: '#0d2137', color: '#4a7a9b', textAlign: 'center', padding: '14px 24px', fontSize: 11, letterSpacing: '0.03em' }
};
