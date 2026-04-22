// Improvement #16 — Decision record: checker's final Accept/Refer/Reject
// Separate from AI recommendation — this is the human's official decision.
import { Router } from 'express';
import { auditLog, logger } from '../utils/logger.js';

const router = Router();
const decisionStore = new Map(); // submissionId → decision

// POST /api/decisions  { submissionId, decision: ACCEPT|REFER|REJECT, reason, noticeOfRefusal? }
router.post('/', (req, res) => {
  const { submissionId, decision, reason, noticeOfRefusal } = req.body;

  if (!submissionId || !decision) {
    return res.status(400).json({ error: 'submissionId and decision are required.' });
  }
  const VALID = new Set(['ACCEPT', 'REFER', 'REJECT']);
  if (!VALID.has(decision)) {
    return res.status(400).json({ error: `decision must be one of: ${[...VALID].join(', ')}` });
  }

  // FIX M3: Cap unbounded string fields
  const MAX_REASON = 2000;
  const MAX_NOR = 10000;

  const record = {
    submissionId: String(submissionId).slice(0, 64),
    decision,
    reason: typeof reason === 'string' ? reason.slice(0, MAX_REASON) : '',
    noticeOfRefusal: typeof noticeOfRefusal === 'string' ? noticeOfRefusal.slice(0, MAX_NOR) : null,
    decidedBy: req.user?.username || 'anonymous',
    decidedAt: new Date().toISOString()
  };

  decisionStore.set(submissionId, record);
  auditLog({ event: 'CHECKER_DECISION', ...record });
  logger.info('Checker decision recorded', { submissionId, decision, decidedBy: record.decidedBy });

  res.json({ ok: true, record });
});

// GET /api/decisions/:submissionId
router.get('/:submissionId', (req, res) => {
  const record = decisionStore.get(req.params.submissionId);
  if (!record) return res.status(404).json({ error: 'No decision recorded for this submission.' });
  res.json(record);
});

export default router;
