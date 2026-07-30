import { Router } from 'express';
import { asyncHandler } from '../lib/errors.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createExerciseSchema,
  createSetSchema,
  updateExerciseSchema,
  updateSessionSchema,
  updateSetSchema,
} from '../schemas/index.js';
import * as workoutsService from '../services/workoutsService.js';

/**
 * Session-scoped writes. Ownership is enforced inside the service against
 * `req.auth`, so a member can never mutate another member's session even
 * though the id is in the path.
 */
export const sessionRoutes = Router();

sessionRoutes.use(requireAuth);

/** GET /api/sessions/:sessionId */
sessionRoutes.get(
  '/:sessionId',
  asyncHandler(async (req, res) => {
    res.json({ session: await workoutsService.getSession(req.params.sessionId, req.auth) });
  }),
);

/** PATCH /api/sessions/:sessionId — rename, re-focus, add notes, finish. */
sessionRoutes.patch(
  '/:sessionId',
  validate(updateSessionSchema),
  asyncHandler(async (req, res) => {
    res.json({ session: await workoutsService.updateSession(req.params.sessionId, req.body, req.auth) });
  }),
);

/** DELETE /api/sessions/:sessionId */
sessionRoutes.delete(
  '/:sessionId',
  asyncHandler(async (req, res) => {
    res.json(await workoutsService.deleteSession(req.params.sessionId, req.auth));
  }),
);

/** POST /api/sessions/:sessionId/exercises — "Add today's exercise". */
sessionRoutes.post(
  '/:sessionId/exercises',
  validate(createExerciseSchema),
  asyncHandler(async (req, res) => {
    const result = await workoutsService.addExercise(req.params.sessionId, req.body, req.auth);
    res.status(201).json(result);
  }),
);

sessionRoutes.patch(
  '/:sessionId/exercises/:exerciseId',
  validate(updateExerciseSchema),
  asyncHandler(async (req, res) => {
    const { sessionId, exerciseId } = req.params;
    res.json(await workoutsService.updateExercise(sessionId, exerciseId, req.body, req.auth));
  }),
);

sessionRoutes.delete(
  '/:sessionId/exercises/:exerciseId',
  asyncHandler(async (req, res) => {
    const { sessionId, exerciseId } = req.params;
    res.json(await workoutsService.removeExercise(sessionId, exerciseId, req.auth));
  }),
);

/** POST .../sets — log reps + weight between sets. */
sessionRoutes.post(
  '/:sessionId/exercises/:exerciseId/sets',
  validate(createSetSchema),
  asyncHandler(async (req, res) => {
    const { sessionId, exerciseId } = req.params;
    const result = await workoutsService.logSet(sessionId, exerciseId, req.body, req.auth);
    res.status(201).json(result);
  }),
);

sessionRoutes.patch(
  '/:sessionId/exercises/:exerciseId/sets/:setId',
  validate(updateSetSchema),
  asyncHandler(async (req, res) => {
    const { sessionId, exerciseId, setId } = req.params;
    res.json(await workoutsService.updateSet(sessionId, exerciseId, setId, req.body, req.auth));
  }),
);

sessionRoutes.delete(
  '/:sessionId/exercises/:exerciseId/sets/:setId',
  asyncHandler(async (req, res) => {
    const { sessionId, exerciseId, setId } = req.params;
    res.json(await workoutsService.removeSet(sessionId, exerciseId, setId, req.auth));
  }),
);
