// Improvement #3 — Rate limiting
import rateLimit from 'express-rate-limit';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '20', 10);

export const validateRateLimit = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: `Too many validation requests. Maximum ${max} per ${windowMs / 1000}s window.`,
    code: 'RATE_LIMITED'
  }
});

// Stricter limiter for auth endpoints (prevent brute force)
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.', code: 'AUTH_RATE_LIMITED' }
});
