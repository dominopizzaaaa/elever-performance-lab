import { Router } from 'express';
import { asyncHandler } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireStaff } from '../middleware/auth.js';
import { adminUpdateUserSchema, createUserSchema } from '../schemas/index.js';
import * as adminService from '../services/adminService.js';
import * as usersService from '../services/usersService.js';
import * as workoutsService from '../services/workoutsService.js';
import * as analyticsService from '../services/analyticsService.js';

export const adminRoutes = Router();

/** Everything below requires a staff session. */
adminRoutes.use(requireStaff);

/** GET /api/admin/overview */
adminRoutes.get(
  '/overview',
  asyncHandler(async (_req, res) => {
    res.json({ overview: await adminService.getOverview() });
  }),
);

/** GET /api/admin/members */
adminRoutes.get(
  '/members',
  asyncHandler(async (_req, res) => {
    res.json({ users: await usersService.listUsersWithStats() });
  }),
);

/** POST /api/admin/members */
adminRoutes.post(
  '/members',
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    res.status(201).json({ user: await usersService.createUser(req.body) });
  }),
);

/** PATCH /api/admin/members/:userId — staff may also reset the member's PIN. */
adminRoutes.patch(
  '/members/:userId',
  validate(adminUpdateUserSchema),
  asyncHandler(async (req, res) => {
    res.json({ user: await usersService.updateUser(req.params.userId, req.body) });
  }),
);

/** DELETE /api/admin/members/:userId — also removes their training log. */
adminRoutes.delete(
  '/members/:userId',
  asyncHandler(async (req, res) => {
    res.json(await usersService.deleteUser(req.params.userId));
  }),
);

/** GET /api/admin/sessions?userId&limit */
adminRoutes.get(
  '/sessions',
  asyncHandler(async (req, res) => {
    const limit = Number.parseInt(String(req.query.limit ?? ''), 10);
    const sessions = await adminService.listSessions({
      userId: req.query.userId ? String(req.query.userId) : undefined,
      limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : undefined,
    });
    res.json({ sessions });
  }),
);

/** DELETE /api/admin/sessions/:sessionId */
adminRoutes.delete(
  '/sessions/:sessionId',
  asyncHandler(async (req, res) => {
    res.json(await workoutsService.deleteSession(req.params.sessionId, req.auth));
  }),
);

/** GET /api/admin/video-uploads — AI Analytics queue (placeholder). */
adminRoutes.get(
  '/video-uploads',
  asyncHandler(async (_req, res) => {
    res.json({ uploads: await analyticsService.listAllUploads() });
  }),
);

/** DELETE /api/admin/video-uploads/:uploadId */
adminRoutes.delete(
  '/video-uploads/:uploadId',
  asyncHandler(async (req, res) => {
    res.json(await analyticsService.deleteUpload(req.params.uploadId));
  }),
);
