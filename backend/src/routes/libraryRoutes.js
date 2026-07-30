import { Router } from 'express';
import { asyncHandler } from '../lib/errors.js';
import { getLibrary } from '../repositories/libraryRepository.js';

export const libraryRoutes = Router();

/**
 * GET /api/library/exercises — catalogue for the "Add exercise" autocomplete.
 * Public: it is reference data with nothing member-specific in it.
 */
libraryRoutes.get(
  '/exercises',
  asyncHandler(async (_req, res) => {
    const library = await getLibrary();
    res.json(library);
  }),
);
