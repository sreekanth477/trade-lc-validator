import 'dotenv/config';
import app from './api/server.js';
import { logger, enforceRetention } from './utils/logger.js';

// FIX C1 + C3: Hard-fail on missing or weak secrets — never just warn
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('FATAL: ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Add a strong random secret to your .env file.');
  console.error('       Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET is too short (minimum 32 characters). Use a strong random secret.');
  process.exit(1);
}

// Improvement #17: Run retention cleanup on startup
enforceRetention();

const port = parseInt(process.env.PORT || '3001', 10);
app.listen(port, () => {
  logger.info('Trade LC Validator backend started', {
    port,
    model: process.env.CLAUDE_MODEL || 'claude-opus-4-5',
    endpoints: [`http://localhost:${port}/api/health`]
  });
});
