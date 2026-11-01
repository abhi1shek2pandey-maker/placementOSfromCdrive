import winston from 'winston';
import { env } from './env';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom format — never logs sensitive data
const logFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  // Strip any accidental credential-like values from meta
  const safeMeta = sanitizeMeta(meta);
  const metaStr = Object.keys(safeMeta).length ? ` ${JSON.stringify(safeMeta)}` : '';
  return `${ts} [${level}]: ${stack || message}${metaStr}`;
});

function sanitizeMeta(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = /key|token|secret|password|auth|credential|uri|url/i;
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => !sensitiveKeys.test(k))
  );
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
    }),
  ],
});

if (env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    })
  );
}
