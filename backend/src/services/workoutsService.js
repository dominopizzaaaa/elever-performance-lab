import { badRequest, conflict, notFound } from '../lib/errors.js';
import { createId } from '../lib/ids.js';
import { todayKey } from '../lib/dates.js';
import * as usersRepository from '../repositories/usersRepository.js';
import * as workoutsRepository from '../repositories/workoutsRepository.js';
import { findExerciseByName } from '../repositories/libraryRepository.js';
import { estimateOneRepMax, summariseSession } from './metricsService.js';

/** Attaches derived metrics so the kiosk never recomputes tonnage client-side. */
function decorate(session) {
  if (!session) return null;
  return { ...session, metrics: summariseSession(session) };
}

async function requireUser(userId) {
  const user = await usersRepository.findById(userId);
  if (!user) throw notFound('Member not found');
  return user;
}

async function requireSession(sessionId) {
  const session = await workoutsRepository.findSessionById(sessionId);
  if (!session) throw notFound('Workout session not found');
  return session;
}

/**
 * Ensures the caller may act on a session.
 * @param {any} session
 * @param {{ sub: string, role: string }} auth
 */
function assertSessionAccess(session, auth) {
  if (auth.role === 'staff') return;
  if (session.userId !== auth.sub) {
    throw notFound('Workout session not found');
  }
}

/**
 * @param {string} userId
 * @param {{ from?: string, to?: string, limit?: number }} [query]
 */
export async function listSessions(userId, query = {}) {
  await requireUser(userId);
  const sessions = await workoutsRepository.listSessionsByUser(userId, query);
  return sessions.map(decorate);
}

/** @param {string} sessionId */
export async function getSession(sessionId, auth) {
  const session = await requireSession(sessionId);
  assertSessionAccess(session, auth);
  return decorate(session);
}

/**
 * Today's session for a member, or `null` if they have not started one.
 * @param {string} userId
 */
export async function getTodaySession(userId) {
  await requireUser(userId);
  const session = await workoutsRepository.findSessionByDate(userId, todayKey());
  return decorate(session);
}

/**
 * Creates a session. Defaults to today. A plan day may be attached so the
 * session carries its label and focus, but exercises are never pre-filled —
 * the member picks which day it is and adds their own exercises as they go.
 *
 * @param {string} userId
 * @param {{ date?: string, title?: string, focus?: string, notes?: string, planDayKey?: string | null, fromPlanDay?: string }} input
 */
export async function createSession(userId, input = {}) {
  const user = await requireUser(userId);
  const date = input.date ?? todayKey();

  const existing = await workoutsRepository.findSessionByDate(userId, date);
  if (existing) {
    throw conflict(`${user.name} already has a session logged on ${date}`, { sessionId: existing.id });
  }

  const planDays = user.currentPlan?.days ?? [];
  let planDay = null;
  if (input.fromPlanDay) {
    planDay = planDays.find((day) => day.key === input.fromPlanDay) ?? null;
    if (!planDay) throw badRequest(`Plan day "${input.fromPlanDay}" is not in ${user.name}'s current plan`);
  }

  const now = new Date().toISOString();
  const session = {
    id: createId('ses'),
    userId,
    date,
    planId: user.currentPlan?.id ?? null,
    planDayKey: input.planDayKey ?? planDay?.key ?? null,
    title: input.title ?? planDay?.label ?? 'Freestyle Session',
    focus: input.focus ?? planDay?.focus ?? 'General',
    status: 'in_progress',
    notes: input.notes ?? '',
    bodyWeightKg: null,
    exercises: [],
    startedAt: now,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await workoutsRepository.insertSession(session);
  return decorate(session);
}

/**
 * @param {string} sessionId
 * @param {Record<string, unknown>} patch
 */
export async function updateSession(sessionId, patch, auth) {
  const session = await requireSession(sessionId);
  assertSessionAccess(session, auth);

  const outcome = await workoutsRepository.mutateSession(sessionId, (live) => {
    Object.assign(live, patch);
    if (patch.status === 'completed' && !live.completedAt) {
      live.completedAt = new Date().toISOString();
    }
    if (patch.status === 'in_progress') {
      live.completedAt = null;
    }
  });

  if (!outcome) throw notFound('Workout session not found');
  return decorate(outcome.session);
}

export async function deleteSession(sessionId, auth) {
  const session = await requireSession(sessionId);
  assertSessionAccess(session, auth);
  await workoutsRepository.deleteSession(sessionId);
  return { id: sessionId };
}

/**
 * Adds an exercise to a session. The muscle group is inherited from the
 * exercise library when the member does not pick one, and prescribed targets
 * are pulled from the member's plan when the lift appears there.
 *
 * @param {string} sessionId
 * @param {{ name: string, muscleGroup?: string, targetSets?: number, targetReps?: number, targetWeightKg?: number, notes?: string }} input
 */
export async function addExercise(sessionId, input, auth) {
  const session = await requireSession(sessionId);
  assertSessionAccess(session, auth);

  const duplicate = (session.exercises ?? []).some(
    (exercise) => exercise.name.toLowerCase() === input.name.toLowerCase(),
  );
  if (duplicate) {
    throw conflict(`${input.name} is already in this session — add sets to it instead`);
  }

  const [libraryEntry, user] = await Promise.all([
    findExerciseByName(input.name),
    usersRepository.findById(session.userId),
  ]);

  const planned = (user?.currentPlan?.days ?? [])
    .flatMap((day) => day.exercises ?? [])
    .find((exercise) => exercise.name.toLowerCase() === input.name.toLowerCase());

  const now = new Date().toISOString();
  const exercise = {
    id: createId('ex'),
    name: libraryEntry?.name ?? input.name,
    muscleGroup: input.muscleGroup ?? libraryEntry?.muscleGroup ?? planned?.muscleGroup ?? 'core',
    targetSets: input.targetSets ?? planned?.targetSets ?? 3,
    targetReps: input.targetReps ?? planned?.targetReps ?? 10,
    targetWeightKg: input.targetWeightKg ?? planned?.targetWeightKg ?? 0,
    notes: input.notes ?? '',
    sets: [],
    createdAt: now,
  };

  const outcome = await workoutsRepository.mutateSession(sessionId, (live) => {
    live.exercises.push(exercise);
    if (live.status === 'planned') live.status = 'in_progress';
  });

  if (!outcome) throw notFound('Workout session not found');
  return { session: decorate(outcome.session), exercise };
}

function findExercise(session, exerciseId) {
  const exercise = (session.exercises ?? []).find((candidate) => candidate.id === exerciseId);
  if (!exercise) throw notFound('Exercise not found in this session');
  return exercise;
}

export async function updateExercise(sessionId, exerciseId, patch, auth) {
  const session = await requireSession(sessionId);
  assertSessionAccess(session, auth);
  findExercise(session, exerciseId);

  const outcome = await workoutsRepository.mutateSession(sessionId, (live) => {
    const exercise = live.exercises.find((candidate) => candidate.id === exerciseId);
    Object.assign(exercise, patch);
    return exercise;
  });

  if (!outcome) throw notFound('Workout session not found');
  return { session: decorate(outcome.session), exercise: outcome.result };
}

export async function removeExercise(sessionId, exerciseId, auth) {
  const session = await requireSession(sessionId);
  assertSessionAccess(session, auth);
  findExercise(session, exerciseId);

  const outcome = await workoutsRepository.mutateSession(sessionId, (live) => {
    live.exercises = live.exercises.filter((exercise) => exercise.id !== exerciseId);
  });

  if (!outcome) throw notFound('Workout session not found');
  return { session: decorate(outcome.session) };
}

/**
 * Logs one completed set — the single most-used write in the whole app.
 * Returns the updated session plus a flag when the set beats the member's
 * recorded PR for that lift, so the kiosk can celebrate it.
 *
 * @param {string} sessionId
 * @param {string} exerciseId
 * @param {{ reps: number, weightKg: number, rpe?: number | null, note?: string }} input
 */
export async function logSet(sessionId, exerciseId, input, auth) {
  const session = await requireSession(sessionId);
  assertSessionAccess(session, auth);
  const exercise = findExercise(session, exerciseId);

  const now = new Date().toISOString();
  const set = {
    id: createId('set'),
    reps: input.reps,
    weightKg: input.weightKg,
    rpe: input.rpe ?? null,
    note: input.note ?? '',
    completedAt: now,
    source: 'kiosk',
  };

  const outcome = await workoutsRepository.mutateSession(sessionId, (live) => {
    const target = live.exercises.find((candidate) => candidate.id === exerciseId);
    target.sets.push(set);
    if (live.status === 'planned') live.status = 'in_progress';
    if (!live.startedAt) live.startedAt = now;
  });

  if (!outcome) throw notFound('Workout session not found');

  const personalRecord = await maybeRecordPersonalBest(session.userId, exercise.name, set);

  return { session: decorate(outcome.session), set, personalRecord };
}

export async function updateSet(sessionId, exerciseId, setId, patch, auth) {
  const session = await requireSession(sessionId);
  assertSessionAccess(session, auth);
  const exercise = findExercise(session, exerciseId);
  if (!exercise.sets.some((set) => set.id === setId)) throw notFound('Set not found');

  const outcome = await workoutsRepository.mutateSession(sessionId, (live) => {
    const target = live.exercises.find((candidate) => candidate.id === exerciseId);
    const set = target.sets.find((candidate) => candidate.id === setId);
    Object.assign(set, patch, { editedAt: new Date().toISOString() });
    return set;
  });

  if (!outcome) throw notFound('Workout session not found');
  return { session: decorate(outcome.session), set: outcome.result };
}

export async function removeSet(sessionId, exerciseId, setId, auth) {
  const session = await requireSession(sessionId);
  assertSessionAccess(session, auth);
  const exercise = findExercise(session, exerciseId);
  if (!exercise.sets.some((set) => set.id === setId)) throw notFound('Set not found');

  const outcome = await workoutsRepository.mutateSession(sessionId, (live) => {
    const target = live.exercises.find((candidate) => candidate.id === exerciseId);
    target.sets = target.sets.filter((set) => set.id !== setId);
  });

  if (!outcome) throw notFound('Workout session not found');
  return { session: decorate(outcome.session) };
}

/**
 * Promotes a logged set to a personal record when its estimated 1RM beats the
 * stored PR for that lift. Returns the new record, or `null` if it wasn't one.
 *
 * @param {string} userId
 * @param {string} exerciseName
 * @param {{ reps: number, weightKg: number }} set
 */
async function maybeRecordPersonalBest(userId, exerciseName, set) {
  const user = await usersRepository.findById(userId);
  if (!user) return null;

  const candidate = estimateOneRepMax(set.weightKg, set.reps);
  if (candidate <= 0) return null;

  const records = Array.isArray(user.personalRecords) ? [...user.personalRecords] : [];
  const index = records.findIndex(
    (record) => record.exercise.toLowerCase() === exerciseName.toLowerCase(),
  );

  const existing = index >= 0 ? records[index] : null;
  const existingEstimate = existing ? estimateOneRepMax(existing.weightKg, existing.reps) : 0;
  if (candidate <= existingEstimate) return null;

  const record = {
    exercise: exerciseName,
    weightKg: set.weightKg,
    reps: set.reps,
    achievedAt: new Date().toISOString().slice(0, 10),
    estimatedOneRepMax: candidate,
  };

  if (index >= 0) records[index] = record;
  else records.push(record);

  await usersRepository.updateUser(userId, { personalRecords: records });
  return { ...record, previousEstimatedOneRepMax: existingEstimate || null };
}
