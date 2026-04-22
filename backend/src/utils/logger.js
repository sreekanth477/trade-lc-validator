import winston from 'winston';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const auditLogPath = process.env.AUDIT_LOG_PATH || './logs/audit.log';
const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
      return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
    })
  ),
  transports: [new winston.transports.Console()]
});

// ── Improvement #15: Hash-chained immutable audit log ─────────────────────
// Each entry contains a SHA-256 hash of the previous entry's content,
// creating a chain that makes tampering detectable.
let _lastHash = '0'.repeat(64); // genesis hash

export function auditLog(eventObject) {
  const entry = {
    _schema: 'trade-lc-audit-v2',
    timestamp: new Date().toISOString(),
    ...eventObject
  };

  // Compute chain hash: hash(previousHash + thisEntryJSON)
  const entryJson = JSON.stringify(entry);
  const chainInput = _lastHash + entryJson;
  const chainHash = crypto.createHash('sha256').update(chainInput).digest('hex');
  entry._prevHash = _lastHash;
  entry._hash = chainHash;
  _lastHash = chainHash;

  const logLine = JSON.stringify(entry) + '\n';

  try {
    const resolvedPath = path.resolve(process.cwd(), auditLogPath);
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(resolvedPath, logLine, 'utf8');
  } catch (err) {
    logger.warn('Failed to write audit log entry', { error: err.message });
  }
}

// ── Improvement #17: Data retention cleanup ────────────────────────────────
export function enforceRetention() {
  const retentionDays = parseInt(process.env.AUDIT_RETENTION_DAYS || '0', 10);
  if (!retentionDays) return; // 0 = keep forever

  const resolvedPath = path.resolve(process.cwd(), auditLogPath);
  if (!fs.existsSync(resolvedPath)) return;

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const lines = fs.readFileSync(resolvedPath, 'utf8').split('\n').filter(Boolean);
  const kept = lines.filter(line => {
    try {
      const entry = JSON.parse(line);
      return new Date(entry.timestamp).getTime() >= cutoff;
    } catch { return true; }
  });

  if (kept.length < lines.length) {
    fs.writeFileSync(resolvedPath, kept.join('\n') + '\n', 'utf8');
    logger.info(`Audit retention: pruned ${lines.length - kept.length} entries older than ${retentionDays} days`);
  }
}
