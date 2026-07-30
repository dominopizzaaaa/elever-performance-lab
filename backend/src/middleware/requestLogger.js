import { env } from '../config/env.js';

const COLORS = {
  reset: '[0m',
  dim: '[2m',
  green: '[32m',
  yellow: '[33m',
  red: '[31m',
};

function statusColor(status) {
  if (status >= 500) return COLORS.red;
  if (status >= 400) return COLORS.yellow;
  return COLORS.green;
}

/**
 * Minimal request logger — avoids pulling in morgan for a handful of lines.
 * @type {import('express').RequestHandler}
 */
export function requestLogger(req, res, next) {
  if (env.logLevel === 'none') return next();

  const started = process.hrtime.bigint();

  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    const color = statusColor(res.statusCode);
    const actor = req.auth ? `${req.auth.role}:${req.auth.sub}` : 'anon';
    const suffix = env.logLevel === 'verbose' ? ` ${COLORS.dim}(${actor})${COLORS.reset}` : '';
    console.log(
      `${COLORS.dim}[api]${COLORS.reset} ${req.method} ${req.originalUrl} ` +
        `${color}${res.statusCode}${COLORS.reset} ${COLORS.dim}${ms.toFixed(1)}ms${COLORS.reset}${suffix}`,
    );
  });

  next();
}
