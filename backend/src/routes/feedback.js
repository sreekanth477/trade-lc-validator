// Improvement #19 — Discrepancy feedback loop
// Checkers mark each AI finding as CORRECT / INCORRECT / PARTIAL
// In-memory store for MVP; move to DB in v1.2
import { Router } from 'express';
import { auditLog, logger } from '../utils/logger.js';

const router = Router();
const feedbackStore = new Map(); // submissionId → [feedbackEntries]

// POST /api/feedback   { submissionId, discrepancyId, verdict: CORRECT|INCORRECT|PARTIAL, note }
router.post('/', (req, res) => {
  const { submissionId, discrepancyId, verdict, note } = req.body;

  if (!submissionId || !discrepancyId || !verdict) {
    return res.status(400).json({ error: 'submissionId, discrepancyId, and verdict are required.' });
  }
  const VALID_VERDICTS = new Set(['CORRECT', 'INCORRECT', 'PARTIAL']);
  if (!VALID_VERDICTS.has(verdict)) {
    return res.status(400).json({ error: `verdict must be one of: ${[...VALID_VERDICTS].join(', ')}` });
  }

  // FIX M2: Cap string fields to prevent memory bloat
  const MAX_NOTE = 1000;
  const sanitizedNote = typeof note === 'string' ? note.slice(0, MAX_NOTE) : '';

  const entry = {
    discrepancyId: String(discrepancyId).slice(0, 20),
    verdict,
    note: sanitizedNote,
    reviewedBy: req.user?.username || 'anonymous',
    reviewedAt: new Date().toISOString()
  };

  const existing = feedbackStore.get(submissionId) || [];
  // Replace if same discrepancyId already has feedback
  const updated = [...existing.filter(f => f.discrepancyId !== discrepancyId), entry];
  feedbackStore.set(submissionId, updated);

  auditLog({ event: 'DISCREPANCY_FEEDBACK', submissionId, ...entry });
  logger.info('Discrepancy feedback recorded', { submissionId, discrepancyId, verdict });

  res.json({ ok: true, feedback: entry });
});

// GET /api/feedback/:submissionId
router.get('/:submissionId', (req, res) => {
  const entries = feedbackStore.get(req.params.submissionId) || [];
  res.json({ submissionId: req.params.submissionId, feedback: entries });
});

export default router;
