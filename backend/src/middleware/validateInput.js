// Improvement #4 — Input validation: MIME types & file sizes before hitting AI
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'text/plain'
]);

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
const MAX_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function validateUploadedFiles(req, res, next) {
  const files = req.files || {};
  const errors = [];

  for (const [field, fileArr] of Object.entries(files)) {
    const file = fileArr[0];
    if (!file) continue;

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      errors.push(`"${field}": unsupported file type "${file.mimetype}". Allowed: PDF, PNG, JPEG, TXT.`);
    }
    if (file.size > MAX_BYTES) {
      errors.push(`"${field}": file size ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds limit of ${MAX_FILE_SIZE_MB} MB.`);
    }
  }

  if (errors.length > 0) {
    return res.status(422).json({ error: 'File validation failed.', details: errors, code: 'INVALID_FILES' });
  }
  next();
}

const MAX_DOCUMENTS = 4;   // LC, invoice, BL, insurance — no more
const MAX_TEXT_CONTENT_CHARS = 200_000; // ~200 KB per doc

export function validateTextDocuments(req, res, next) {
  const { documents } = req.body;
  if (!Array.isArray(documents) || documents.length === 0) {
    return res.status(400).json({ error: 'documents array is required.', code: 'NO_DOCUMENTS' });
  }

  // FIX M1: Cap document count to prevent resource exhaustion
  if (documents.length > MAX_DOCUMENTS) {
    return res.status(422).json({
      error: `Maximum ${MAX_DOCUMENTS} documents allowed per request.`,
      code: 'TOO_MANY_DOCUMENTS'
    });
  }

  const VALID_TYPES = new Set(['lc', 'invoice', 'bl', 'insurance']);
  const errors = [];

  for (const doc of documents) {
    if (!VALID_TYPES.has(doc.type)) {
      errors.push(`Unknown document type "${doc.type}". Must be one of: lc, invoice, bl, insurance.`);
    }
    if (!doc.content || typeof doc.content !== 'string' || doc.content.trim().length === 0) {
      errors.push(`Document "${doc.type}" has empty or missing content.`);
    }
    if (doc.content && doc.content.length > MAX_TEXT_CONTENT_CHARS) {
      errors.push(`Document "${doc.type}" content exceeds ${MAX_TEXT_CONTENT_CHARS} character limit.`);
    }
  }

  if (errors.length > 0) {
    return res.status(422).json({ error: 'Document validation failed.', details: errors, code: 'INVALID_DOCUMENTS' });
  }
  next();
}
