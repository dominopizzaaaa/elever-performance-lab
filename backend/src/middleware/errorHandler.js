import { ZodError } from 'zod';
import { ApiError } from '../lib/errors.js';
import { env } from '../config/env.js';

/** 404 for unmatched API routes. @type {import('express').RequestHandler} */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: { code: 'not_found', message: `No route for ${req.method} ${req.originalUrl}` },
  });
}

/**
 * Terminal error middleware: normalises every failure into
 * `{ error: { code, message, details? } }`.
 * @type {import('express').ErrorRequestHandler}
 */
export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'validation_failed',
        message: 'Some fields are invalid',
        details: error.issues.map((issue) => ({
          field: issue.path.join('.') || '(root)',
          message: issue.message,
        })),
      },
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.status).json({
      error: { code: error.code, message: error.message, details: error.details },
    });
  }

  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'bad_json', message: 'Request body is not valid JSON' } });
  }

  console.error('[error] Unhandled failure:', error);
  res.status(500).json({
    error: {
      code: 'internal_error',
      message: 'Something went wrong on the Elever server',
      details: env.isProduction ? undefined : String(error?.message ?? error),
    },
  });
}
