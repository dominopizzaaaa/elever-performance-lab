import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Tiny JSON-file persistence layer that stands in for a real database.
 *
 * Two properties matter for a kiosk that writes on every logged set:
 *  1. Writes are atomic — data is written to a temp file in the same directory
 *     and then renamed, so a crash mid-write can never truncate the database.
 *  2. Read-modify-write cycles are serialised per file through a promise chain,
 *     so two concurrent requests can't clobber each other's changes.
 */

/** @type {Map<string, Promise<unknown>>} */
const writeQueues = new Map();

/** @type {Map<string, { mtimeMs: number, data: unknown }>} */
const cache = new Map();

function resolveFile(fileName) {
  const resolved = path.resolve(env.dataDir, fileName);
  if (!resolved.startsWith(path.resolve(env.dataDir) + path.sep)) {
    throw new Error(`Refusing to access data file outside the data directory: ${fileName}`);
  }
  return resolved;
}

/**
 * Reads and parses a JSON data file. Results are cached until the file's mtime
 * changes, so hot read paths (dashboard polling) stay cheap while manual edits
 * to the JSON files on disk are still picked up.
 *
 * @param {string} fileName e.g. `users.json`
 * @returns {Promise<any>}
 */
export async function readJson(fileName) {
  const file = resolveFile(fileName);
  const stat = await fs.stat(file).catch((error) => {
    if (error.code === 'ENOENT') {
      throw new Error(`Data file missing: ${fileName}. Run \`npm run seed\` to create it.`);
    }
    throw error;
  });

  const cached = cache.get(file);
  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return structuredClone(cached.data);
  }

  const raw = await fs.readFile(file, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Data file ${fileName} contains invalid JSON: ${error.message}`);
  }

  cache.set(file, { mtimeMs: stat.mtimeMs, data });
  return structuredClone(data);
}

/**
 * Atomically replaces a JSON data file.
 * @param {string} fileName
 * @param {unknown} data
 */
export async function writeJson(fileName, data) {
  const file = resolveFile(fileName);
  await fs.mkdir(path.dirname(file), { recursive: true });

  const tmp = `${file}.tmp-${crypto.randomBytes(6).toString('hex')}`;
  const serialised = `${JSON.stringify(data, null, 2)}\n`;

  try {
    await fs.writeFile(tmp, serialised, 'utf8');
    await fs.rename(tmp, file);
  } catch (error) {
    await fs.rm(tmp, { force: true });
    throw error;
  }

  const stat = await fs.stat(file);
  cache.set(file, { mtimeMs: stat.mtimeMs, data: structuredClone(data) });
  return data;
}

/**
 * Serialised read-modify-write. The mutator receives the parsed document and
 * either mutates it in place or returns a replacement document. Whatever the
 * mutator returns as `result` is handed back to the caller.
 *
 * @template T
 * @param {string} fileName
 * @param {(data: any) => T | Promise<T>} mutator
 * @returns {Promise<T>}
 */
export async function updateJson(fileName, mutator) {
  const file = resolveFile(fileName);
  const previous = writeQueues.get(file) ?? Promise.resolve();

  const task = previous.then(async () => {
    const data = await readJson(fileName);
    const result = await mutator(data);
    await writeJson(fileName, data);
    return result;
  });

  // Keep the chain alive even if this task rejects, so one failed write does
  // not permanently poison the queue for that file.
  writeQueues.set(
    file,
    task.then(
      () => undefined,
      () => undefined,
    ),
  );

  return task;
}

/** Clears the in-memory read cache (used by tests and the seed script). */
export function clearCache() {
  cache.clear();
}

/** @param {string} fileName */
export async function exists(fileName) {
  try {
    await fs.access(resolveFile(fileName));
    return true;
  } catch {
    return false;
  }
}
