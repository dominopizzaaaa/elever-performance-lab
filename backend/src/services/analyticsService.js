import { createId } from '../lib/ids.js';
import { notFound } from '../lib/errors.js';
import * as analyticsRepository from '../repositories/analyticsRepository.js';
import { getLibrary } from '../repositories/libraryRepository.js';

/**
 * AI Analytics — PLACEHOLDER MODULE.
 *
 * The kiosk can already register a video for form analysis; nothing processes
 * those records yet. The contract below is intentionally the one a real
 * pipeline would expose, so wiring in inference later is additive.
 *
 * TODO(ai-analytics): implement the real pipeline.
 *   1. Accept the binary upload (multipart) and store it outside the repo
 *      (`env.uploadsDir` locally, object storage in production).
 *   2. Push a job onto a real queue; return `202 Accepted` with the job id.
 *   3. Worker: extract frames -> pose estimation (e.g. MoveNet / MediaPipe) ->
 *      per-rep joint-angle series -> rule + model scoring per movement pattern.
 *   4. Persist `{ score, repBreakdown, faults[], keyframes[] }` on the upload
 *      record and flip `status` to `complete`.
 *   5. Surface results on /analytics and attach them to the logged exercise.
 */

const ROADMAP = [
  { phase: 'Phase 1', title: 'Pose extraction', detail: 'Frame sampling and 33-point skeletal tracking per rep.', status: 'in_design' },
  { phase: 'Phase 2', title: 'Rep segmentation', detail: 'Automatic concentric/eccentric split with tempo and bar-path traces.', status: 'planned' },
  { phase: 'Phase 3', title: 'Fault detection', detail: 'Knee valgus, depth, bar drift and spinal flexion scoring per pattern.', status: 'planned' },
  { phase: 'Phase 4', title: 'Coach feedback', detail: 'Cue generation and side-by-side comparison against your best set.', status: 'planned' },
];

/** Feature status + which lifts will be supported first. */
export async function getStatus() {
  const { exercises } = await getLibrary();
  return {
    enabled: false,
    headline: 'Coming Soon: AI Form Analysis',
    message:
      'Upload a set and Elever will score your technique rep by rep. The vision pipeline is still in the lab — uploads are queued and will be analysed when it goes live.',
    supportedLifts: exercises
      .filter((exercise) => exercise.videoAnalysis)
      .map((exercise) => ({ name: exercise.name, pattern: exercise.pattern, muscleGroup: exercise.muscleGroup })),
    roadmap: ROADMAP,
    maxUploadMb: 250,
    acceptedFormats: ['mp4', 'mov', 'webm'],
  };
}

/**
 * Registers an upload intent. Only metadata is stored today.
 * @param {string} userId
 * @param {{ exercise: string, fileName: string, fileSizeBytes: number, durationSeconds?: number, notes?: string }} input
 */
export async function queueUpload(userId, input) {
  const upload = {
    id: createId('vid'),
    userId,
    exercise: input.exercise,
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes,
    durationSeconds: input.durationSeconds ?? null,
    notes: input.notes ?? '',
    // `queued` never advances until the inference worker exists.
    status: 'queued',
    analysis: null,
    createdAt: new Date().toISOString(),
  };

  await analyticsRepository.insertUpload(upload);
  return upload;
}

/** @param {string} userId */
export function listUploads(userId) {
  return analyticsRepository.listUploads({ userId });
}

export function listAllUploads() {
  return analyticsRepository.listUploads();
}

/** @param {string} uploadId */
export async function deleteUpload(uploadId) {
  const removed = await analyticsRepository.deleteUpload(uploadId);
  if (!removed) throw notFound('Upload not found');
  return { id: uploadId };
}
