import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { runValidationPipeline } from '../agents/orchestrator.js';
import { streamValidation } from '../agents/validation-agent.js';
import { extractAllDocuments } from '../agents/extraction-agent.js';
import { requireAuth } from '../middleware/auth.js';
import { validateRateLimit } from '../middleware/rateLimiter.js';
import { validateUploadedFiles, validateTextDocuments } from '../middleware/validateInput.js';
import authRouter from '../routes/auth.js';
import feedbackRouter from '../routes/feedback.js';
import decisionsRouter from '../routes/decisions.js';
import { logger } from '../utils/logger.js';

const app = express();
const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
const model = process.env.CLAUDE_MODEL || 'claude-opus-4-5';

// FIX H1: Trust proxy so rate-limiter uses real client IP, not proxy IP.
// Set to 1 for a single reverse-proxy (nginx/load-balancer); increase for more hops.
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:']
    }
  }
}));

// FIX C2: Restrict CORS to explicit origins only. Defaults to localhost in dev.
// In production set CORS_ORIGIN=https://your-bank-portal.example.com
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true
}));

// FIX H3: Tight JSON body limit (1 MB) for all non-file endpoints.
// Multipart uploads are handled by Multer with its own limit.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileSizeMB * 1024 * 1024 }
});
const docFields = [
  { name: 'lc', maxCount: 1 }, { name: 'invoice', maxCount: 1 },
  { name: 'bl', maxCount: 1 }, { name: 'insurance', maxCount: 1 }
];

// ── Public routes ─────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', model, timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);

// ── Protected routes (require JWT) ────────────────────────────────────────
app.use('/api/feedback', requireAuth, feedbackRouter);
app.use('/api/decisions', requireAuth, decisionsRouter);

// POST /api/validate — multipart file upload
app.post('/api/validate', requireAuth, validateRateLimit, upload.fields(docFields), validateUploadedFiles, async (req, res) => {
  try {
    const { presented_date, requested_by } = req.body;
    const documents = Object.entries(req.files || {}).map(([fieldName, [file]]) => ({
      type: fieldName,
      filename: file.originalname,
      mediaType: file.mimetype,
      content: file.buffer.toString('base64')
    }));
    if (!documents.length) return res.status(400).json({ error: 'No documents provided.', code: 'NO_DOCUMENTS' });

    const result = await runValidationPipeline(documents, {
      presentedDate: presented_date,
      requestedBy: req.user?.username || requested_by
    });
    res.json(result);
  } catch (err) {
    logger.error('Validate endpoint error', { error: err.message });
    // FIX H4: Only expose safe user-facing messages
    const userMsg = err.message.includes('required') ? err.message : 'Validation failed. Please check your documents and try again.';
    res.status(err.message.includes('required') ? 400 : 500).json({ error: userMsg, code: 'VALIDATION_ERROR' });
  }
});

// POST /api/validate/text — JSON body with text documents
app.post('/api/validate/text', requireAuth, validateRateLimit, validateTextDocuments, async (req, res) => {
  try {
    const { documents, presented_date } = req.body;
    const result = await runValidationPipeline(documents, {
      presentedDate: presented_date,
      requestedBy: req.user?.username || 'text-api'
    });
    res.json(result);
  } catch (err) {
    logger.error('Text validate endpoint error', { error: err.message });
    const userMsg = err.message.includes('required') ? err.message : 'Validation failed. Please check your documents and try again.';
    res.status(err.message.includes('required') ? 400 : 500).json({ error: userMsg, code: 'VALIDATION_ERROR' });
  }
});

// POST /api/validate/stream — SSE streaming validation (#10)
app.post('/api/validate/stream', requireAuth, validateRateLimit, validateTextDocuments, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const { documents, presented_date } = req.body;
    // Step 1: extract fields
    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Extracting document fields...' })}\n\n`);
    const extractedFields = await extractAllDocuments(documents);

    res.write(`data: ${JSON.stringify({ type: 'extracted', data: extractedFields })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'status', message: 'Validating against UCP 600...' })}\n\n`);

    // Step 2: stream validation tokens
    let accumulated = '';
    for await (const chunk of streamValidation(extractedFields, { presentedDate: presented_date })) {
      accumulated += chunk;
      res.write(`data: ${JSON.stringify({ type: 'token', text: chunk })}\n\n`);
    }

    // Parse and send final result
    try {
      const cleaned = accumulated.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      res.write(`data: ${JSON.stringify({ type: 'complete', result: parsed })}\n\n`);
    } catch {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Failed to parse validation result' })}\n\n`);
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
  }
  res.write('data: [DONE]\n\n');
  res.end();
});

// POST /api/validate/manual-fields — #14 human-in-the-loop: re-validate with manually corrected fields
app.post('/api/validate/manual-fields', requireAuth, validateRateLimit, async (req, res) => {
  try {
    const { extractedFields, presented_date } = req.body;

    // FIX M4: Strictly validate the shape of extractedFields before passing to AI
    if (!extractedFields || typeof extractedFields !== 'object' || Array.isArray(extractedFields)) {
      return res.status(400).json({ error: 'extractedFields must be an object.', code: 'INVALID_FIELDS' });
    }
    if (!extractedFields.lc || typeof extractedFields.lc !== 'object') {
      return res.status(400).json({ error: 'extractedFields.lc is required and must be an object.', code: 'NO_LC' });
    }
    const VALID_DOC_KEYS = new Set(['lc', 'invoice', 'bl', 'insurance']);
    for (const key of Object.keys(extractedFields)) {
      if (!VALID_DOC_KEYS.has(key)) {
        return res.status(400).json({ error: `Unknown document key: "${key}"`, code: 'INVALID_FIELDS' });
      }
    }

    const { validateCompliance } = await import('../agents/validation-agent.js');
    const { v4: uuidv4 } = await import('uuid');
    const submissionId = uuidv4();
    const result = await validateCompliance(extractedFields, { submissionId, presentedDate: presented_date });
    res.json({ submissionId, validation: result, extractedFields });
  } catch (err) {
    logger.error('Manual-fields endpoint error', { error: err.message });
    res.status(500).json({ error: 'Re-validation failed. Please try again.', code: 'VALIDATION_ERROR' });
  }
});

// ── Global error handler ──────────────────────────────────────────────────
// FIX H4: Never expose raw err.message to clients — log it server-side only.
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  // CORS errors get a specific response; everything else is generic
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: 'Forbidden: cross-origin request not allowed.', code: 'CORS_FORBIDDEN' });
  }
  res.status(500).json({ error: 'An internal error occurred. Please try again.', code: 'INTERNAL_ERROR' });
});

export default app;
