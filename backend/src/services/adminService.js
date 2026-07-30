import { todayKey, addDays } from '../lib/dates.js';
import * as usersRepository from '../repositories/usersRepository.js';
import * as workoutsRepository from '../repositories/workoutsRepository.js';
import { summariseSession } from './metricsService.js';
import { listAllUploads } from './analyticsService.js';

/**
 * Floor-wide numbers for the admin panel: activity today, 7-day tonnage and a
 * chronological feed of the most recent sessions across all members.
 */
export async function getOverview() {
  const [users, sessions, uploads] = await Promise.all([
    usersRepository.listUsers(),
    workoutsRepository.listAllSessions(),
    listAllUploads(),
  ]);

  const today = todayKey();
  const weekAgo = addDays(today, -6);
  const nameById = new Map(users.map((user) => [user.id, user.name]));

  let volume7d = 0;
  let sets7d = 0;
  let sessionsToday = 0;
  let volumeAllTime = 0;

  const feed = [];

  for (const session of sessions) {
    const metrics = summariseSession(session);
    volumeAllTime += metrics.volumeKg;

    if (session.date >= weekAgo) {
      volume7d += metrics.volumeKg;
      sets7d += metrics.sets;
    }
    if (session.date === today) sessionsToday += 1;

    feed.push({
      sessionId: session.id,
      userId: session.userId,
      userName: nameById.get(session.userId) ?? 'Unknown member',
      date: session.date,
      title: session.title,
      focus: session.focus,
      status: session.status,
      exerciseCount: metrics.exerciseCount,
      sets: metrics.sets,
      volumeKg: metrics.volumeKg,
      updatedAt: session.updatedAt,
    });
  }

  feed.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      members: users.length,
      sessions: sessions.length,
      sessionsToday,
      queuedVideoUploads: uploads.filter((upload) => upload.status === 'queued').length,
    },
    volume: {
      last7DaysKg: Math.round(volume7d),
      last7DaysSets: sets7d,
      allTimeKg: Math.round(volumeAllTime),
    },
    recentActivity: feed.slice(0, 25),
  };
}

/**
 * Session list across all members, newest first, for the admin log table.
 * @param {{ userId?: string, limit?: number }} [query]
 */
export async function listSessions(query = {}) {
  const { userId, limit = 60 } = query;
  const [users, sessions] = await Promise.all([
    usersRepository.listUsers(),
    workoutsRepository.listAllSessions(),
  ]);

  const nameById = new Map(users.map((user) => [user.id, user.name]));

  return sessions
    .filter((session) => !userId || session.userId === userId)
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
    .slice(0, limit)
    .map((session) => ({
      ...session,
      userName: nameById.get(session.userId) ?? 'Unknown member',
      metrics: summariseSession(session),
    }));
}
