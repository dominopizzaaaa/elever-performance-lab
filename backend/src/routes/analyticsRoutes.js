import { Router } from 'express';
import { asyncHandler } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { analyticsUploadSchema } from '../schemas/index.js';
import * as analyticsService from '../services/analyticsService.js';

/**
 * AI Analytics placeholder API.
 * TODO(ai-analytics): see src/services/analyticsService.js for the full plan.
 */
export const analyticsRoutes = Router();

/** GET /api/analytics/status — public so the landing page can tease the feature. */
analyticsRoutes.get(
  '/status',
  asyncHandler(async (_req, res) => {
    res.json({ status: await analyticsService.getStatus() });
  }),
);

/**
 * POST /api/analytics/uploads — registers a video for future analysis.
 * Accepts metadata only; the binary is discarded client-side for now.
 */
analyticsRoutes.post(
  '/uploads',
  requireAuth,
  validate(analyticsUploadSchema),
  asyncHandler(async (req, res) => {
    const upload = await analyticsService.queueUpload(req.auth.sub, req.body);
    res.status(202).json({
      upload,
      message: 'Queued. Form analysis will run automatically once the AI pipeline is live.',
    });
  }),
);

/** GET /api/analytics/uploads — the caller's own queued videos. */
analyticsRoutes.get(
  '/uploads',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ uploads: await analyticsService.listUploads(req.auth.sub) });
  }),
);
