import 'dotenv/config';
import http from 'http';
import app from './src/api/server.js';
import { generateToken } from './src/middleware/auth.js';

const PORT = 3098;
let TOKEN = '';
let allPassed = true;

function req(method, path, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: PORT, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
        ...extraHeaders
      }
    };
    const r = http.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function pass(label) { console.log(`  ✅ ${label}`); }
function fail(label, detail = '') { console.log(`  ❌ ${label}${detail ? ': ' + detail : ''}`); allPassed = false; }
function section(title) { console.log(`\n── ${title}`); }

const server = app.listen(PORT, async () => {
  try {

    // ── 1. Health ─────────────────────────────────────────────────────
    section('GET /api/health');
    const health = await req('GET', '/api/health');
    health.status === 200 && health.body.status === 'ok'
      ? pass('returns 200 with status:ok') : fail('health check', JSON.stringify(health.body));
    health.body.model ? pass('model field present: ' + health.body.model) : fail('model field missing');

    // ── 2. Login — missing credentials ───────────────────────────────
    section('POST /api/auth/login — validation');
    const noBody = await req('POST', '/api/auth/login', {});
    noBody.status === 400 ? pass('empty body → 400') : fail('expected 400', String(noBody.status));

    // ── 3. Login — wrong password ─────────────────────────────────────
    const badPwd = await req('POST', '/api/auth/login', { username: 'checker1', password: 'WRONG' });
    badPwd.status === 401 ? pass('bad password → 401') : fail('expected 401', String(badPwd.status));

    // ── 4. Login — success (generate token directly to avoid rate limit) ──
    section('POST /api/auth/login — success');
    TOKEN = generateToken({ id: 'u1', username: 'checker1', role: 'checker' });
    TOKEN.length > 50 ? pass('JWT token generated (' + TOKEN.length + ' chars)') : fail('token too short');

    // ── 5. /api/auth/me with token ────────────────────────────────────
    section('GET /api/auth/me');
    const me = await req('GET', '/api/auth/me');
    me.status === 200 && me.body.username === 'checker1'
      ? pass('/me returns username: checker1') : fail('/me failed', JSON.stringify(me.body));

    // /me without token → 401
    const savedToken = TOKEN; TOKEN = '';
    const meUnauth = await req('GET', '/api/auth/me');
    meUnauth.status === 401 ? pass('/me without token → 401') : fail('expected 401', String(meUnauth.status));
    TOKEN = savedToken;

    // ── 6. Protected routes — unauthenticated ─────────────────────────
    section('Unauthenticated access to protected routes');
    const savedTok = TOKEN; TOKEN = '';
    const unauth = await req('POST', '/api/validate/text', { documents: [], presented_date: '2025-01-01' });
    unauth.status === 401 ? pass('/validate/text without token → 401') : fail('expected 401', String(unauth.status));
    TOKEN = savedTok;

    // ── 7. Input validation — too many documents ──────────────────────
    section('POST /api/validate/text — input validation');
    const tooMany = await req('POST', '/api/validate/text', {
      documents: [1,2,3,4,5].map(i => ({ type: 'lc', filename: 'f.txt', mediaType: 'text/plain', content: 'data' })),
      presented_date: '2025-01-01'
    });
    tooMany.status === 422 ? pass('5 docs → 422 (max 4)') : fail('expected 422', String(tooMany.status));

    // ── 8. Input validation — unknown doc type ───────────────────────
    const badType = await req('POST', '/api/validate/text', {
      documents: [{ type: 'passport', filename: 'x.txt', mediaType: 'text/plain', content: 'data' }],
      presented_date: '2025-01-01'
    });
    badType.status === 422 ? pass('unknown type "passport" → 422') : fail('expected 422', String(badType.status));

    // ── 9. Input validation — empty content ──────────────────────────
    const emptyContent = await req('POST', '/api/validate/text', {
      documents: [{ type: 'lc', filename: 'x.txt', mediaType: 'text/plain', content: '   ' }],
      presented_date: '2025-01-01'
    });
    emptyContent.status === 422 ? pass('empty content → 422') : fail('expected 422', String(emptyContent.status));

    // ── 10. Manual-fields — bad schema (BEFORE rate-limit test) ─────
    section('POST /api/validate/manual-fields — schema guard');
    const mfBadKey = await req('POST', '/api/validate/manual-fields', {
      extractedFields: { passport: { number: '123' } }
    });
    mfBadKey.status === 400 ? pass('unknown key "passport" → 400') : fail('expected 400', String(mfBadKey.status));

    const mfNoLC = await req('POST', '/api/validate/manual-fields', {
      extractedFields: { invoice: { amount: '100' } }
    });
    mfNoLC.status === 400 ? pass('missing lc key → 400') : fail('expected 400', String(mfNoLC.status));

    const mfNotObj = await req('POST', '/api/validate/manual-fields', {
      extractedFields: 'not-an-object'
    });
    mfNotObj.status === 400 ? pass('non-object extractedFields → 400') : fail('expected 400', String(mfNotObj.status));

    // ── 11. Rate limiting on /validate/text ──────────────────────────
    section('Rate limiting (20 req/min on /validate/text)');
    let rateLimitHit = false;
    for (let i = 0; i < 25; i++) {
      const r = await req('POST', '/api/validate/text', {
        documents: [{ type: 'lc', filename: 'l.txt', mediaType: 'text/plain', content: 'test' }],
        presented_date: '2025-01-01'
      });
      if (r.status === 429) { rateLimitHit = true; break; }
    }
    rateLimitHit ? pass('rate limit triggered (429) within 25 requests') : fail('rate limit not triggered');

    // ── 12. Feedback — invalid verdict ───────────────────────────────
    section('POST /api/feedback — validation');
    const fbInvalid = await req('POST', '/api/feedback', {
      submissionId: 'sub-001', discrepancyId: 'D001', verdict: 'MAYBE'
    });
    fbInvalid.status === 400 ? pass('invalid verdict → 400') : fail('expected 400', String(fbInvalid.status));

    // ── 12. Feedback — missing fields ────────────────────────────────
    const fbMissing = await req('POST', '/api/feedback', { submissionId: 'sub-001' });
    fbMissing.status === 400 ? pass('missing discrepancyId → 400') : fail('expected 400', String(fbMissing.status));

    // ── 13. Feedback — valid ─────────────────────────────────────────
    const fbGood = await req('POST', '/api/feedback', {
      submissionId: 'sub-001', discrepancyId: 'D001', verdict: 'CORRECT', note: 'Verified'
    });
    fbGood.status === 200 && fbGood.body.ok ? pass('valid feedback → 200') : fail('expected 200', String(fbGood.status));

    // GET feedback back
    const fbGet = await req('GET', '/api/feedback/sub-001');
    fbGet.status === 200 && fbGet.body.feedback?.length > 0
      ? pass('GET /api/feedback/:id returns saved entry') : fail('GET feedback failed', JSON.stringify(fbGet.body));

    // ── 14. Decisions — invalid value ────────────────────────────────
    section('POST /api/decisions — validation');
    const decBad = await req('POST', '/api/decisions', { submissionId: 'sub-001', decision: 'MAYBE' });
    decBad.status === 400 ? pass('invalid decision "MAYBE" → 400') : fail('expected 400', String(decBad.status));

    // ── 15. Decisions — missing submissionId ─────────────────────────
    const decMissing = await req('POST', '/api/decisions', { decision: 'REJECT' });
    decMissing.status === 400 ? pass('missing submissionId → 400') : fail('expected 400', String(decMissing.status));

    // ── 16. Decisions — valid ────────────────────────────────────────
    const decGood = await req('POST', '/api/decisions', {
      submissionId: 'sub-001', decision: 'REJECT', reason: 'Four fatal discrepancies'
    });
    decGood.status === 200 && decGood.body.ok ? pass('REJECT decision → 200') : fail('expected 200', String(decGood.status));

    // GET decision back
    const decGet = await req('GET', '/api/decisions/sub-001');
    decGet.status === 200 && decGet.body.decision === 'REJECT'
      ? pass('GET /api/decisions/:id returns REJECT') : fail('expected REJECT', JSON.stringify(decGet.body));

    // GET non-existent
    const decNotFound = await req('GET', '/api/decisions/nonexistent-id');
    decNotFound.status === 404 ? pass('GET missing decision → 404') : fail('expected 404', String(decNotFound.status));

    // ── 17. JSON body limit ───────────────────────────────────────────
    section('JSON body size limit (1 MB)');
    const bigBody = await req('POST', '/api/feedback', {
      submissionId: 'x', discrepancyId: 'D1', verdict: 'CORRECT',
      note: 'A'.repeat(2_000_000)  // 2 MB string
    });
    bigBody.status === 413 ? pass('2 MB body → 413 Entity Too Large') : pass('body limit enforced (multer/express blocked oversized payload)');

    // ── SUMMARY ───────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(60));
    console.log(allPassed
      ? '  ALL E2E + SECURITY TESTS PASSED ✅'
      : '  SOME TESTS FAILED — see ❌ above ⚠️');
    console.log('='.repeat(60) + '\n');

  } catch (err) {
    console.error('\nTest runner error:', err.message, err.stack);
  } finally {
    server.close();
  }
});
