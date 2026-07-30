import { readJson, updateJson } from '../lib/jsonStore.js';

const FILE = 'admins.json';

export async function listAdmins() {
  const data = await readJson(FILE);
  return data.admins ?? [];
}

/** @param {string} username */
export async function findByUsername(username) {
  const admins = await listAdmins();
  const needle = String(username ?? '').trim().toLowerCase();
  return admins.find((admin) => admin.username.toLowerCase() === needle) ?? null;
}

/** @param {string} id */
export async function findAdminById(id) {
  const admins = await listAdmins();
  return admins.find((admin) => admin.id === id) ?? null;
}

/** @param {string} id */
export async function touchLastLogin(id) {
  return updateJson(FILE, (data) => {
    const admin = data.admins.find((candidate) => candidate.id === id);
    if (!admin) return null;
    admin.lastLoginAt = new Date().toISOString();
    data.updatedAt = admin.lastLoginAt;
    return admin;
  });
}
