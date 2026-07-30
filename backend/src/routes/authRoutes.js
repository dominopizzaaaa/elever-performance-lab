import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, unauthorized } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { adminLoginSchema, scanSchema } from '../schemas/index.js';
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

/** Scan-in is chatty but should still not be hammerable. */
const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

/** POST /api/auth/scan — simulated card scan by member name. */
authRoutes.post(
  '/scan',
  scanLimiter,
  validate(scanSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.scanIn(req.body.name);
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
