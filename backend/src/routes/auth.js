// Auth routes: login + /me
// MVP uses a hardcoded user store. Replace with DB lookup in production.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { generateToken, requireAuth } from '../middleware/auth.js';
import { authRateLimit } from '../middleware/rateLimiter.js';
import { logger } from '../utils/logger.js';

const router = Router();

// FIX H5: Pre-compute password hashes asynchronously at startup rather than
// blocking the event loop with hashSync at module evaluation time.
// These are demo credentials only — replace with DB-backed lookup in production.
const DEMO_USERS_PLAIN = [
  { id: 'u1', username: 'checker1', password: 'demo1234', role: 'checker' },
  { id: 'u2', username: 'admin',    password: 'admin1234', role: 'admin'   }
];

let DEMO_USERS = [];
// Runs once when the module is first imported
const usersReady = Promise.all(
  DEMO_USERS_PLAIN.map(async u => ({ ...u, passwordHash: await bcrypt.hash(u.password, 10) }))
).then(users => { DEMO_USERS = users; });

// POST /api/auth/login
router.post('/login', authRateLimit, async (req, res) => {
  await usersReady; // ensure hashes are computed before first login
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required.', code: 'MISSING_CREDENTIALS' });
  }

  // FIX H4: Same error message for unknown user and wrong password (no user enumeration)
  const user = DEMO_USERS.find(u => u.username === username);
  const valid = user && await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    logger.warn('Failed login attempt', { username });
    return res.status(401).json({ error: 'Invalid credentials.', code: 'INVALID_CREDENTIALS' });
  }

  const token = generateToken(user);
  logger.info('User logged in', { username, role: user.role });
  res.json({ token, username: user.username, role: user.role, expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
});

// GET /api/auth/me — FIX H2: must be behind requireAuth so req.user is guaranteed
router.get('/me', requireAuth, (req, res) => {
  res.json({ userId: req.user.userId, username: req.user.username, role: req.user.role });
});

export default router;
