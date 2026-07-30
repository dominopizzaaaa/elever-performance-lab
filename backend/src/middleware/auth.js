import { verifyToken } from '../lib/crypto.js';
import { forbidden, unauthorized } from '../lib/errors.js';

/**
 * Reads a bearer token, if present, and attaches `req.auth`.
 * Never rejects — route guards decide what is required.
 * @type {import('express').RequestHandler}
 */
export function attachAuth(req, _res, next) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme?.toLowerCase() === 'bearer' && token) {
    req.auth = verifyToken(token.trim()) ?? null;
  } else {
    req.auth = null;
  }

  next();
}

/** Requires any valid session (member or staff). */
export const requireAuth = (req, _res, next) => {
  if (!req.auth) return next(unauthorized('Scan in to continue'));
  next();
};

/** Requires a staff session. */
export const requireStaff = (req, _res, next) => {
  if (!req.auth) return next(unauthorized('Staff sign-in required'));
  if (req.auth.role !== 'staff') return next(forbidden('Staff access only'));
  next();
};

/**
 * Requires either a staff session or a member session whose subject matches
 * the `:userId` route parameter — members can only touch their own records.
 * @type {import('express').RequestHandler}
 */
export const requireSelfOrStaff = (req, _res, next) => {
  if (!req.auth) return next(unauthorized('Scan in to continue'));
  if (req.auth.role === 'staff') return next();

  const target = req.params.userId ?? req.params.id;
  if (target && req.auth.sub === target) return next();

  return next(forbidden('Members can only access their own training data'));
};
