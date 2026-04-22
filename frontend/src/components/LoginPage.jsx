// Improvement #1 — Login page
import React, { useState } from 'react';
import { login } from '../api.js';

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(username, password);
      onLogin(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>⚖️</div>
        <h1 style={s.title}>Trade LC Validator</h1>
        <p style={s.sub}>UCP 600 Compliance Engine</p>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Username</label>
            <input style={s.input} type="text" value={username} autoFocus
              onChange={e => setUsername(e.target.value)} placeholder="checker1" required />
          </div>
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input style={s.input} type="password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div style={s.error}>{error}</div>}
          <button style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p style={s.hint}>Demo: <code>checker1</code> / <code>demo1234</code></p>
      </div>
    </div>
  );
}

const s = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d2137' },
  card: { background: '#fff', borderRadius: 12, padding: '48px 40px', width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', textAlign: 'center' },
  logo: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: 800, color: '#0d2137', marginBottom: 4 },
  sub: { fontSize: 12, color: '#7f8c8d', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 32 },
  form: { textAlign: 'left' },
  field: { marginBottom: 18 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#5a6a7e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 },
  input: { width: '100%', padding: '10px 14px', border: '1.5px solid #c8d6e5', borderRadius: 6, fontSize: 14, outline: 'none', color: '#1a2a3a' },
  error: { background: '#fdecea', color: '#c0392b', padding: '10px 14px', borderRadius: 6, fontSize: 13, marginBottom: 16 },
  btn: { width: '100%', padding: '12px', background: '#1a5276', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 4 },
  hint: { marginTop: 24, fontSize: 12, color: '#95a5a6' }
};
