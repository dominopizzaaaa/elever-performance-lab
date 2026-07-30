import { addDays, daysBetween, isoWeekKey, todayKey } from '../lib/dates.js';

/**
 * Derived training metrics. Everything the dashboard, history charts and
 * avatar render is computed here so the frontend stays presentational.
 */

const round = (value, places = 1) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/** Epley estimated one-rep max. Reps above 12 stop being predictive, so cap. */
export function estimateOneRepMax(weightKg, reps) {
  if (!weightKg || !reps || reps < 1) return 0;
  const cappedReps = Math.min(reps, 12);
  return round(weightKg * (1 + cappedReps / 30), 1);
}

/** Tonnage for one set. */
const setVolume = (set) => (set.weightKg ?? 0) * (set.reps ?? 0);

/**
 * Per-session rollup: tonnage, set/rep counts, hardest set and the volume
 * split by muscle group (used to light up the AI body avatar).
 * @param {any} session
 */
export function summariseSession(session) {
  let volumeKg = 0;
  let sets = 0;
  let reps = 0;
  let topSetKg = 0;
  let bestEstimatedOneRepMax = 0;
  /** @type {Record<string, number>} */
  const muscleVolume = {};
  let rpeSum = 0;
  let rpeCount = 0;

  for (const exercise of session.exercises ?? []) {
    for (const set of exercise.sets ?? []) {
      const volume = setVolume(set);
      volumeKg += volume;
      sets += 1;
      reps += set.reps ?? 0;
      topSetKg = Math.max(topSetKg, set.weightKg ?? 0);
      bestEstimatedOneRepMax = Math.max(
        bestEstimatedOneRepMax,
        estimateOneRepMax(set.weightKg, set.reps),
      );

      const group = exercise.muscleGroup ?? 'other';
      // Bodyweight/conditioning work still deserves avatar credit, so fall back
      // to a rep-based proxy when there is no external load.
      muscleVolume[group] = (muscleVolume[group] ?? 0) + (volume || (set.reps ?? 0) * 2);

      if (typeof set.rpe === 'number') {
        rpeSum += set.rpe;
        rpeCount += 1;
      }
    }
  }

  return {
    sessionId: session.id,
    date: session.date,
    title: session.title,
    focus: session.focus,
    status: session.status,
    exerciseCount: (session.exercises ?? []).length,
    volumeKg: round(volumeKg, 0),
    sets,
    reps,
    topSetKg: round(topSetKg, 1),
    bestEstimatedOneRepMax,
    averageRpe: rpeCount ? round(rpeSum / rpeCount, 1) : null,
    muscleVolume,
  };
}

/**
 * Consecutive-day training streak ending today or yesterday. A rest day does
 * not break the streak; two consecutive missed days does.
 * @param {string[]} dates unique `YYYY-MM-DD`, any order
 */
export function computeStreak(dates) {
  if (dates.length === 0) return 0;
  const unique = [...new Set(dates)].sort((a, b) => (a > b ? -1 : 1));
  const today = todayKey();

  const gapToLatest = daysBetween(unique[0], today);
  if (gapToLatest > 2) return 0;

  let streak = 1;
  for (let index = 1; index < unique.length; index += 1) {
    const gap = daysBetween(unique[index], unique[index - 1]);
    if (gap <= 2) streak += 1;
    else break;
  }
  return streak;
}

/**
 * Weekly tonnage buckets, oldest first. Weeks with no training are included as
 * zeroes so the chart shows honest gaps.
 * @param {any[]} summaries
 * @param {number} weeks
 */
export function buildWeeklyVolume(summaries, weeks = 8) {
  /** @type {Map<string, { weekKey: string, volumeKg: number, sessions: number, sets: number }>} */
  const buckets = new Map();

  const today = todayKey();
  const mondayOffset = (new Date().getDay() + 6) % 7;
  for (let index = weeks - 1; index >= 0; index -= 1) {
    const weekStart = addDays(today, -(mondayOffset + index * 7));
    const key = isoWeekKey(weekStart);
    buckets.set(key, { weekKey: key, weekStart, volumeKg: 0, sessions: 0, sets: 0 });
  }

  for (const summary of summaries) {
    const key = isoWeekKey(summary.date);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.volumeKg += summary.volumeKg;
    bucket.sessions += 1;
    bucket.sets += summary.sets;
  }

  return [...buckets.values()];
}

/**
 * Strength trend per exercise: best estimated 1RM over time. Only exercises
 * with at least two data points are returned — a single dot is not a trend.
 * @param {any[]} sessions
 */
export function buildStrengthTrends(sessions) {
  /** @type {Map<string, { exercise: string, muscleGroup: string, points: any[] }>} */
  const byExercise = new Map();

  for (const session of sessions) {
    for (const exercise of session.exercises ?? []) {
      let best = 0;
      let topWeight = 0;
      for (const set of exercise.sets ?? []) {
        best = Math.max(best, estimateOneRepMax(set.weightKg, set.reps));
        topWeight = Math.max(topWeight, set.weightKg ?? 0);
      }
      if (best <= 0) continue;

      const entry = byExercise.get(exercise.name) ?? {
        exercise: exercise.name,
        muscleGroup: exercise.muscleGroup ?? 'other',
        points: [],
      };
      entry.points.push({ date: session.date, estimatedOneRepMax: best, topWeightKg: round(topWeight, 1) });
      byExercise.set(exercise.name, entry);
    }
  }

  return [...byExercise.values()]
    .map((entry) => {
      const points = entry.points.sort((a, b) => (a.date > b.date ? 1 : -1));
      const first = points[0];
      const last = points.at(-1);
      const best = points.reduce((max, point) => Math.max(max, point.estimatedOneRepMax), 0);
      return {
        ...entry,
        points,
        best,
        latest: last.estimatedOneRepMax,
        changeKg: round(last.estimatedOneRepMax - first.estimatedOneRepMax, 1),
        changePct: first.estimatedOneRepMax
          ? round(((last.estimatedOneRepMax - first.estimatedOneRepMax) / first.estimatedOneRepMax) * 100, 1)
          : 0,
      };
    })
    .filter((entry) => entry.points.length >= 2)
    .sort((a, b) => b.best - a.best);
}

/**
 * Full analytics payload for one member.
 * @param {any} user
 * @param {any[]} sessions all sessions for the member
 */
export function buildUserSummary(user, sessions) {
  // Sort defensively: `recentSessions` and `lastSessionDate` must be newest-first
  // regardless of the order the caller supplied.
  const summaries = sessions
    .map(summariseSession)
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
  const completed = summaries.filter((summary) => summary.status !== 'planned');

  const totals = completed.reduce(
    (accumulator, summary) => ({
      sessions: accumulator.sessions + 1,
      volumeKg: accumulator.volumeKg + summary.volumeKg,
      sets: accumulator.sets + summary.sets,
      reps: accumulator.reps + summary.reps,
    }),
    { sessions: 0, volumeKg: 0, sets: 0, reps: 0 },
  );

  const weekly = buildWeeklyVolume(completed, 8);
  const thisWeek = weekly.at(-1) ?? { volumeKg: 0, sessions: 0, sets: 0 };
  const lastWeek = weekly.at(-2) ?? { volumeKg: 0, sessions: 0, sets: 0 };

  // Muscle-group volume over the trailing 14 days drives the avatar heat map.
  const since = addDays(todayKey(), -13);
  /** @type {Record<string, number>} */
  const muscleVolume = {};
  for (const summary of completed) {
    if (summary.date < since) continue;
    for (const [group, volume] of Object.entries(summary.muscleVolume)) {
      muscleVolume[group] = (muscleVolume[group] ?? 0) + volume;
    }
  }
  const peakMuscleVolume = Math.max(1, ...Object.values(muscleVolume));
  const muscleLoad = Object.fromEntries(
    Object.entries(muscleVolume).map(([group, volume]) => [group, round(volume / peakMuscleVolume, 3)]),
  );

  /** @type {Record<string, number>} */
  const focusSplit = {};
  for (const summary of completed) {
    const focus = summary.focus ?? 'Other';
    focusSplit[focus] = (focusSplit[focus] ?? 0) + 1;
  }

  const goalSessions = user.goals?.weeklySessions ?? 4;
  const goalVolume = user.goals?.weeklyVolumeKg ?? 40000;

  return {
    userId: user.id,
    totals: { ...totals, volumeKg: round(totals.volumeKg, 0) },
    streakDays: computeStreak(completed.map((summary) => summary.date)),
    thisWeek: {
      volumeKg: thisWeek.volumeKg,
      sessions: thisWeek.sessions,
      sets: thisWeek.sets,
      volumeGoalPct: Math.min(100, round((thisWeek.volumeKg / goalVolume) * 100, 0)),
      sessionGoalPct: Math.min(100, round((thisWeek.sessions / goalSessions) * 100, 0)),
    },
    weekOverWeek: {
      volumeDeltaKg: round(thisWeek.volumeKg - lastWeek.volumeKg, 0),
      volumeDeltaPct: lastWeek.volumeKg
        ? round(((thisWeek.volumeKg - lastWeek.volumeKg) / lastWeek.volumeKg) * 100, 1)
        : null,
    },
    weekly,
    muscleLoad,
    focusSplit,
    strengthTrends: buildStrengthTrends(sessions).slice(0, 6),
    recentSessions: completed.slice(0, 12),
  };
}
