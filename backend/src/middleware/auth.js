// Improvement #1 — JWT Authentication middleware
import jwt from 'jsonwebtoken';

// FIX C1: Never fall back to a guessable string.
// The application refuses to start if JWT_SECRET is missing (enforced in index.js).
// Using a fallback here only as a last-resort guard; real enforcement is at startup.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  // This should have been caught at startup, but guard here too
  throw new Error('FATAL: JWT_SECRET environment variable is not set.');
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token.', code: 'UNAUTHORIZED' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { userId, username, role }
    next();
  } catch (err) {
    const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    return res.status(401).json({ error: 'Invalid or expired token.', code });
  }
}

export function generateToken(user) {
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role || 'checker' },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}
