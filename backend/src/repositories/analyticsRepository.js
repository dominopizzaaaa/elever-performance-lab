import { readJson, updateJson } from '../lib/jsonStore.js';

const FILE = 'analytics-queue.json';

/**
 * Placeholder store for the AI Analytics module. Uploads are recorded with
 * status `queued` and nothing consumes them yet.
 * TODO(ai-analytics): swap for a real queue (BullMQ/SQS) once inference exists.
 */
export async function listUploads({ userId } = {}) {
  const data = await readJson(FILE);
  const uploads = data.uploads ?? [];
  const filtered = userId ? uploads.filter((upload) => upload.userId === userId) : uploads;
  return [...filtered].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}

/** @param {any} upload */
export async function insertUpload(upload) {
  return updateJson(FILE, (data) => {
    data.uploads.push(upload);
    data.updatedAt = new Date().toISOString();
    return upload;
  });
}

/** @param {string} uploadId */
export async function deleteUpload(uploadId) {
  return updateJson(FILE, (data) => {
    const index = data.uploads.findIndex((upload) => upload.id === uploadId);
    if (index === -1) return false;
    data.uploads.splice(index, 1);
    data.updatedAt = new Date().toISOString();
    return true;
  });
}
