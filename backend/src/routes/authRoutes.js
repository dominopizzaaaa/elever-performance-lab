import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, unauthorized } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { adminLoginSchema, scanLookupSchema, scanSchema } from '../schemas/index.js';
import * as authService from '../services/authService.js';

export const authRoutes = Router();

/** Brute-force protection for the staff login form. */
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many sign-in attempts. Try again in a few minutes.' } },
});

/**
 * A 4-digit PIN is only 10,000 combinations, so the scan endpoint has to be the
 * thing that makes guessing impractical. Successful scans are not counted —
 * a busy floor can sign in all day, but 20 *failures* a minute is the ceiling.
 */
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: { code: 'rate_limited', message: 'Too many scan attempts. Wait a minute, or ask staff for help.' },
  },
});

/** POST /api/auth/scan/lookup — resolve a typed name so the kiosk can confirm it. */
authRoutes.post(
  '/scan/lookup',
  scanLimiter,
  validate(scanLookupSchema),
  asyncHandler(async (req, res) => {
    res.json({ member: await authService.lookupMember(req.body.name) });
  }),
);

/** POST /api/auth/scan — simulated card scan: member name + their kiosk PIN. */
authRoutes.post(
  '/scan',
  scanLimiter,
  validate(scanSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.scanIn(req.body.name, req.body.pin);
    res.json(result);
  }),
);

/** POST /api/auth/staff/login — admin panel sign-in. */
authRoutes.post(
  '/staff/login',
  loginLimiter,
  validate(adminLoginSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.staffLogin(req.body.username, req.body.password);
    res.json(result);
  }),
);

/** GET /api/auth/me — resolves whoever the bearer token belongs to. */
authRoutes.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.auth) throw unauthorized();
    res.json(await authService.resolveIdentity(req.auth));
  }),
);
