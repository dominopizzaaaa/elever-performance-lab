import { createId } from '../../lib/ids.js';
import { addDays, fromDateKey, toDateKey } from '../../lib/dates.js';

/**
 * Deterministic training-history generator.
 *
 * Rather than hand-writing hundreds of sets, we replay each member's plan
 * backwards from today with a linear progression plus seeded jitter. Same seed
 * in, same history out, so the demo is reproducible while still looking lived-in.
 */

const HISTORY_WEEKS = 8;

/** mulberry32 — small, fast, deterministic PRNG. */
function createRandom(seedText) {
  let seed = 0;
  for (let index = 0; index < seedText.length; index += 1) {
    seed = (seed * 31 + seedText.charCodeAt(index)) | 0;
  }
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Rounds to the nearest achievable plate increment. */
function roundLoad(weightKg) {
  if (weightKg <= 0) return 0;
  if (weightKg < 20) return Math.round(weightKg * 2) / 2;
  return Math.round(weightKg / 2.5) * 2.5;
}

/**
 * Progression multiplier for a session `weeksAgo` in the past: older sessions
 * used lighter loads, and every 4th week is a deload.
 */
function progressionFactor(weeksAgo, weeklyGain) {
  const base = 1 - weeksAgo * weeklyGain;
  const isDeload = weeksAgo > 0 && (HISTORY_WEEKS - weeksAgo) % 4 === 3;
  return base * (isDeload ? 0.88 : 1);
}

function buildSets({ exercise, random, factor, sessionDate }) {
  const setCount = exercise.targetSets;
  const sets = [];
  // Sessions are logged set-by-set on the kiosk, so timestamps step forward.
  let clock = fromDateKey(sessionDate).getTime() + 18 * 3600 * 1000; // 18:00 local

  for (let index = 0; index < setCount; index += 1) {
    const isBackOff = index >= Math.max(2, setCount - 1) && setCount > 3;
    const loadFactor = factor * (isBackOff ? 0.9 : 1) * (0.99 + random() * 0.02);
    const weightKg = roundLoad(exercise.targetWeightKg * loadFactor);

    // Reps drift down across a hard set cluster, up on lighter back-off work.
    const repDrift = isBackOff ? 2 : -Math.floor(index / 2);
    const reps = Math.max(1, exercise.targetReps + repDrift + (random() < 0.25 ? 1 : 0));

    const rpe = Math.min(10, Math.round((6.5 + index * 0.6 + random() * 0.8) * 2) / 2);

    clock += (120 + Math.floor(random() * 90)) * 1000;
    sets.push({
      id: createId('set'),
      reps,
      weightKg,
      rpe,
      completedAt: new Date(clock).toISOString(),
      source: 'kiosk',
    });
  }

  return sets;
}

/**
 * @param {import('./users.seed.js').USERS_SEED[number]} user
 * @param {string} todayKey Sessions are generated strictly before this date so
 *   the kiosk always starts with an empty "today" to log into.
 */
export function buildSessionsForUser(user, todayKey) {
  const random = createRandom(user.id);
  const plan = user.currentPlan;
  const weeklyGain = plan.focus === 'Explosive power' ? 0.012 : 0.016;
  const sessions = [];

  for (let weeksAgo = HISTORY_WEEKS; weeksAgo >= 0; weeksAgo -= 1) {
    // Monday of the target week.
    const today = fromDateKey(todayKey);
    const mondayOffset = (today.getDay() + 6) % 7;
    const weekStart = addDays(toDateKey(today), -(mondayOffset + weeksAgo * 7));

    for (const day of plan.days) {
      for (const weekday of day.weekdays) {
        const offset = (weekday + 6) % 7; // Monday-indexed
        const dateKey = addDays(weekStart, offset);

        if (dateKey >= todayKey) continue;

        // A believable ~10% miss rate, never on the most recent week.
        if (weeksAgo > 0 && random() < 0.1) continue;

        const factor = progressionFactor(weeksAgo, weeklyGain);
        const exercises = day.exercises.map((exercise) => ({
          id: createId('ex'),
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          targetSets: exercise.targetSets,
          targetReps: exercise.targetReps,
          targetWeightKg: roundLoad(exercise.targetWeightKg * factor),
          sets: buildSets({ exercise, random, factor, sessionDate: dateKey }),
          createdAt: `${dateKey}T18:00:00.000Z`,
        }));

        const startedAt = `${dateKey}T18:00:00.000Z`;
        const lastSet = exercises.at(-1)?.sets.at(-1)?.completedAt ?? startedAt;

        sessions.push({
          id: createId('ses'),
          userId: user.id,
          date: dateKey,
          planId: plan.id,
          planDayKey: day.key,
          title: day.label,
          focus: day.focus,
          status: 'completed',
          notes: '',
          bodyWeightKg: null,
          exercises,
          startedAt,
          completedAt: lastSet,
          createdAt: startedAt,
          updatedAt: lastSet,
        });
      }
    }
  }

  return sessions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
