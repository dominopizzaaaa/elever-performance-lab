import { conflict, notFound } from '../lib/errors.js';
import { createId, slugify } from '../lib/ids.js';
import * as usersRepository from '../repositories/usersRepository.js';
import * as workoutsRepository from '../repositories/workoutsRepository.js';
import { buildUserSummary } from './metricsService.js';

/**
 * Members carry no secrets today, but routing every response through this
 * function means a future `pin`/`email` field cannot leak by accident.
 * @param {any} user
 */
export function toPublicUser(user) {
  if (!user) return null;
  return { ...user };
}

/**
 * Member list enriched with headline stats — powers the admin roster.
 */
export async function listUsersWithStats() {
  const [users, sessions] = await Promise.all([
    usersRepository.listUsers(),
    workoutsRepository.listAllSessions(),
  ]);

  return users.map((user) => {
    const own = sessions.filter((session) => session.userId === user.id);
    const summary = buildUserSummary(user, own);
    return {
      ...toPublicUser(user),
      stats: {
        sessions: summary.totals.sessions,
        volumeKg: summary.totals.volumeKg,
        streakDays: summary.streakDays,
        lastSessionDate: summary.recentSessions[0]?.date ?? null,
        thisWeekSessions: summary.thisWeek.sessions,
      },
    };
  });
}

/** @param {string} id */
export async function getUser(id) {
  const user = await usersRepository.findById(id);
  if (!user) throw notFound('Member not found');
  return toPublicUser(user);
}

/** @param {string} id */
export async function getUserSummary(id) {
  const user = await usersRepository.findById(id);
  if (!user) throw notFound('Member not found');
  const sessions = await workoutsRepository.listSessionsByUser(id);
  return buildUserSummary(user, sessions);
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} patch
 */
export async function updateUser(id, patch) {
  const existing = await usersRepository.findById(id);
  if (!existing) throw notFound('Member not found');

  const next = { ...patch };

  if (typeof next.name === 'string') {
    const slug = slugify(next.name);
    const clash = (await usersRepository.listUsers()).find(
      (user) => user.id !== id && user.slug === slug,
    );
    if (clash) throw conflict(`Another member already scans in as "${next.name}"`);
    next.slug = slug;
  }

  // Merge goals rather than replacing the object wholesale.
  if (next.goals) {
    next.goals = { ...existing.goals, ...next.goals };
  }

  // Track body-weight history so the dashboard can trend it.
  if (typeof next.weightKg === 'number' && next.weightKg !== existing.weightKg) {
    const history = Array.isArray(existing.weightHistory) ? [...existing.weightHistory] : [];
    history.push({ date: new Date().toISOString(), weightKg: next.weightKg });
    next.weightHistory = history.slice(-60);
  }

  const updated = await usersRepository.updateUser(id, next);
  if (!updated) throw notFound('Member not found');
  return toPublicUser(updated);
}

/**
 * Creates a member from the admin panel. New members start with an empty plan;
 * staff can grow it from the kiosk as the member trains.
 * @param {any} input
 */
export async function createUser(input) {
  const slug = slugify(input.name);
  const existing = await usersRepository.findByName(input.name);
  if (existing) throw conflict(`"${input.name}" is already a member`);

  const now = new Date().toISOString();
  const user = {
    id: createId('usr'),
    name: input.name,
    slug,
    memberNumber: `EPL-${String(Date.now()).slice(-4)}`,
    age: input.age,
    weightKg: input.weightKg,
    heightCm: input.heightCm ?? null,
    bodyFatPct: input.bodyFatPct ?? null,
    restingHr: null,
    tier: input.tier ?? 'Core',
    joinedAt: now.slice(0, 10),
    accentColor: input.accentColor ?? 'cyan',
    tagline: input.tagline ?? 'New member · baseline block',
    goals: { weeklySessions: 3, weeklyVolumeKg: 25000, targetWeightKg: input.weightKg, focus: 'General fitness' },
    personalRecords: [],
    weightHistory: [{ date: now, weightKg: input.weightKg }],
    currentPlan: {
      id: createId('plan'),
      name: 'Onboarding · Baseline Assessment',
      phase: 'Assessment — week 1',
      focus: 'General fitness',
      startedAt: now.slice(0, 10),
      sessionsPerWeek: 3,
      notes: 'Establish technique and baseline loads before assigning a block.',
      days: [],
    },
    createdAt: now,
    updatedAt: now,
  };

  await usersRepository.insertUser(user);
  return toPublicUser(user);
}

/**
 * Deletes a member and every session they logged.
 * @param {string} id
 */
export async function deleteUser(id) {
  const user = await usersRepository.findById(id);
  if (!user) throw notFound('Member not found');

  const removedSessions = await workoutsRepository.deleteSessionsByUser(id);
  await usersRepository.deleteUser(id);
  return { id, removedSessions };
}
