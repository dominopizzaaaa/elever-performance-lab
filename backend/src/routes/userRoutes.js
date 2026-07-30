import { Router } from 'express';
import { asyncHandler } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireSelfOrStaff, requireStaff } from '../middleware/auth.js';
import { createSessionSchema, sessionQuerySchema, updateUserSchema } from '../schemas/index.js';
import * as usersService from '../services/usersService.js';
import * as workoutsService from '../services/workoutsService.js';

export const userRoutes = Router();

/** GET /api/users — staff-only roster with headline stats. */
userRoutes.get(
  '/',
  requireStaff,
  asyncHandler(async (_req, res) => {
    res.json({ users: await usersService.listUsersWithStats() });
  }),
);

/** GET /api/users/:userId */
userRoutes.get(
  '/:userId',
  requireSelfOrStaff,
  asyncHandler(async (req, res) => {
    res.json({ user: await usersService.getUser(req.params.userId) });
  }),
);

/** PATCH /api/users/:userId — members may edit their own stats and goals. */
userRoutes.patch(
  '/:userId',
  requireSelfOrStaff,
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    res.json({ user: await usersService.updateUser(req.params.userId, req.body) });
  }),
);

/** GET /api/users/:userId/summary — derived analytics for dashboard + charts. */
userRoutes.get(
  '/:userId/summary',
  requireSelfOrStaff,
  asyncHandler(async (req, res) => {
    res.json({ summary: await usersService.getUserSummary(req.params.userId) });
  }),
);

/** GET /api/users/:userId/sessions?from&to&limit */
userRoutes.get(
  '/:userId/sessions',
  requireSelfOrStaff,
  validate(sessionQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const sessions = await workoutsService.listSessions(req.params.userId, req.validatedQuery);
    res.json({ sessions });
  }),
);

/** GET /api/users/:userId/sessions/today — `null` when nothing started yet. */
userRoutes.get(
  '/:userId/sessions/today',
  requireSelfOrStaff,
  asyncHandler(async (req, res) => {
    res.json({ session: await workoutsService.getTodaySession(req.params.userId) });
  }),
);

/** POST /api/users/:userId/sessions — create a session explicitly. */
userRoutes.post(
  '/:userId/sessions',
  requireSelfOrStaff,
  validate(createSessionSchema),
  asyncHandler(async (req, res) => {
    const session = await workoutsService.createSession(req.params.userId, req.body);
    res.status(201).json({ session });
  }),
);
