// Improvement #12 — Retry logic with exponential backoff
import { logger } from './logger.js';

export async function withRetry(fn, { retries = 3, baseDelayMs = 1000, label = 'operation' } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isRetryable = err.status >= 500 || err.status === 429 || err.code === 'ECONNRESET';
      if (!isRetryable || attempt === retries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200;
      logger.warn(`${label} failed (attempt ${attempt}/${retries}), retrying in ${Math.round(delay)}ms`, {
        error: err.message
      });
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}
