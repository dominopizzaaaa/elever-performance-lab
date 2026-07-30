import { readJson, updateJson } from '../lib/jsonStore.js';
import { slugify } from '../lib/ids.js';

const FILE = 'users.json';

/** @returns {Promise<any[]>} */
export async function listUsers() {
  const data = await readJson(FILE);
  return data.users ?? [];
}

/** @param {string} id */
export async function findById(id) {
  const users = await listUsers();
  return users.find((user) => user.id === id) ?? null;
}

/**
 * Resolves a typed name to a member. Matching is slug-based so "kean hean",
 * "Kean  Hean" and "KEAN-HEAN" all scan in successfully.
 * @param {string} name
 */
export async function findByName(name) {
  const slug = slugify(name);
  if (!slug) return null;
  const users = await listUsers();
  return users.find((user) => user.slug === slug || slugify(user.name) === slug) ?? null;
}

/** @param {any} user */
export async function insertUser(user) {
  return updateJson(FILE, (data) => {
    data.users.push(user);
    data.updatedAt = new Date().toISOString();
    return user;
  });
}

/**
 * Applies a shallow patch to a member and stamps `updatedAt`.
 * @param {string} id
 * @param {Record<string, unknown>} patch
 */
export async function updateUser(id, patch) {
  return updateJson(FILE, (data) => {
    const user = data.users.find((candidate) => candidate.id === id);
    if (!user) return null;
    Object.assign(user, patch, { updatedAt: new Date().toISOString() });
    data.updatedAt = new Date().toISOString();
    return user;
  });
}

/** @param {string} id */
export async function deleteUser(id) {
  return updateJson(FILE, (data) => {
    const index = data.users.findIndex((user) => user.id === id);
    if (index === -1) return false;
    data.users.splice(index, 1);
    data.updatedAt = new Date().toISOString();
    return true;
  });
}
