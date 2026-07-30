import { readJson, updateJson } from '../lib/jsonStore.js';

const FILE = 'workouts.json';

/** @returns {Promise<any[]>} */
export async function listAllSessions() {
  const data = await readJson(FILE);
  return data.sessions ?? [];
}

/**
 * @param {string} userId
 * @param {{ from?: string, to?: string, limit?: number }} [options]
 */
export async function listSessionsByUser(userId, options = {}) {
  const { from, to, limit } = options;
  let sessions = (await listAllSessions()).filter((session) => session.userId === userId);

  if (from) sessions = sessions.filter((session) => session.date >= from);
  if (to) sessions = sessions.filter((session) => session.date <= to);

  // Newest first — the kiosk and admin panel both read top-down.
  sessions.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));

  return typeof limit === 'number' ? sessions.slice(0, limit) : sessions;
}

/** @param {string} sessionId */
export async function findSessionById(sessionId) {
  const sessions = await listAllSessions();
  return sessions.find((session) => session.id === sessionId) ?? null;
}

/**
 * @param {string} userId
 * @param {string} date `YYYY-MM-DD`
 */
export async function findSessionByDate(userId, date) {
  const sessions = await listAllSessions();
  return sessions.find((session) => session.userId === userId && session.date === date) ?? null;
}

/** @param {any} session */
export async function insertSession(session) {
  return updateJson(FILE, (data) => {
    data.sessions.push(session);
    data.updatedAt = new Date().toISOString();
    return session;
  });
}

/**
 * Serialised mutation of a single session. The mutator receives the live
 * session object; whatever it returns is passed back to the caller. Returning
 * `undefined` still persists in-place mutations.
 *
 * @template T
 * @param {string} sessionId
 * @param {(session: any) => T} mutator
 * @returns {Promise<{ session: any, result: T } | null>}
 */
export async function mutateSession(sessionId, mutator) {
  return updateJson(FILE, (data) => {
    const session = data.sessions.find((candidate) => candidate.id === sessionId);
    if (!session) return null;

    const result = mutator(session);
    const now = new Date().toISOString();
    session.updatedAt = now;
    data.updatedAt = now;
    return { session, result };
  });
}

/** @param {string} sessionId */
export async function deleteSession(sessionId) {
  return updateJson(FILE, (data) => {
    const index = data.sessions.findIndex((session) => session.id === sessionId);
    if (index === -1) return false;
    data.sessions.splice(index, 1);
    data.updatedAt = new Date().toISOString();
    return true;
  });
}

/**
 * Removes every session belonging to a member (used when staff delete a member).
 * @param {string} userId
 */
export async function deleteSessionsByUser(userId) {
  return updateJson(FILE, (data) => {
    const before = data.sessions.length;
    data.sessions = data.sessions.filter((session) => session.userId !== userId);
    data.updatedAt = new Date().toISOString();
    return before - data.sessions.length;
  });
}
