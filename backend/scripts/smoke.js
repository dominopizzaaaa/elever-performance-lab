#!/usr/bin/env node
/**
 * End-to-end smoke test. Boots the real Express app on an ephemeral port,
 * exercises every route group against the real JSON files, then rolls back
 * everything it created so the demo data is left untouched.
 *
 *   npm run smoke
 */
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { todayKey } from '../src/lib/dates.js';

let passed = 0;
let failed = 0;

async function check(label, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${label}`);
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${label}\n      ${error.message}`);
  }
}

function createClient(baseUrl) {
  return async function request(method, path, { token, body } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
}

async function main() {
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const request = createClient(baseUrl);

  console.log(`\nSmoke testing ${baseUrl}\n`);

  /** Cleanup actions run in reverse order at the end. */
  const cleanup = [];

  try {
    await check('GET /api/health returns ok', async () => {
      const { status, body } = await request('GET', '/api/health');
      assert.equal(status, 200);
      assert.equal(body.status, 'ok');
    });

    let memberToken = '';
    let memberId = '';

    await check('POST /api/auth/scan signs in "kean hean" (case/spacing insensitive)', async () => {
      const { status, body } = await request('POST', '/api/auth/scan', { body: { name: '  kean HEAN ' } });
      assert.equal(status, 200, `expected 200, got ${status}`);
      assert.equal(body.user.name, 'Kean Hean');
      assert.ok(body.token);
      memberToken = body.token;
      memberId = body.user.id;
    });

    await check('POST /api/auth/scan rejects an unknown member', async () => {
      const { status } = await request('POST', '/api/auth/scan', { body: { name: 'Nobody' } });
      assert.equal(status, 404);
    });

    await check('POST /api/auth/scan validates short input', async () => {
      const { status, body } = await request('POST', '/api/auth/scan', { body: { name: 'x' } });
      assert.equal(status, 400);
      assert.equal(body.error.code, 'validation_failed');
    });

    await check('GET /api/auth/me resolves the member', async () => {
      const { status, body } = await request('GET', '/api/auth/me', { token: memberToken });
      assert.equal(status, 200);
      assert.equal(body.role, 'member');
      assert.equal(body.user.id, memberId);
    });

    await check('protected routes reject a missing token', async () => {
      const { status } = await request('GET', `/api/users/${memberId}`);
      assert.equal(status, 401);
    });

    await check('protected routes reject a tampered token', async () => {
      const { status } = await request('GET', `/api/users/${memberId}`, { token: `${memberToken}x` });
      assert.equal(status, 401);
    });

    await check('a member cannot read another member profile', async () => {
      const { status } = await request('GET', '/api/users/usr_dominic', { token: memberToken });
      assert.equal(status, 403);
    });

    await check('GET /api/users/:id/summary computes analytics', async () => {
      const { status, body } = await request('GET', `/api/users/${memberId}/summary`, { token: memberToken });
      assert.equal(status, 200);
      assert.ok(body.summary.totals.sessions > 0, 'expected seeded sessions');
      assert.ok(body.summary.totals.volumeKg > 0, 'expected non-zero tonnage');
      assert.equal(body.summary.weekly.length, 8);
      assert.ok(Object.keys(body.summary.muscleLoad).length > 0, 'expected muscle load for the avatar');
    });

    await check('GET /api/library/exercises returns the catalogue', async () => {
      const { status, body } = await request('GET', '/api/library/exercises');
      assert.equal(status, 200);
      assert.ok(body.exercises.length > 20);
      assert.ok(body.muscleGroups.length > 5);
    });

    let sessionId = '';
    let createdSession = false;

    await check("POST /api/users/:id/sessions/today creates today's session from the plan", async () => {
      const before = await request('GET', `/api/users/${memberId}/sessions/today`, { token: memberToken });
      createdSession = before.body.session === null;

      const { status, body } = await request('POST', `/api/users/${memberId}/sessions/today`, { token: memberToken });
      assert.equal(status, 201);
      assert.equal(body.session.date, todayKey());
      sessionId = body.session.id;
      if (createdSession) {
        cleanup.push(() => request('DELETE', `/api/sessions/${sessionId}`, { token: memberToken }));
      }
    });

    await check('POST .../sessions/today is idempotent', async () => {
      const { status, body } = await request('POST', `/api/users/${memberId}/sessions/today`, { token: memberToken });
      assert.equal(status, 201);
      assert.equal(body.session.id, sessionId, 'a second call must not create a duplicate session');
    });

    let exerciseId = '';

    await check('POST .../exercises adds an exercise and infers its muscle group', async () => {
      const { status, body } = await request('POST', `/api/sessions/${sessionId}/exercises`, {
        token: memberToken,
        body: { name: 'Lat Pulldown' },
      });
      assert.equal(status, 201);
      assert.equal(body.exercise.muscleGroup, 'back', 'muscle group should come from the library');
      exerciseId = body.exercise.id;
    });

    await check('POST .../exercises rejects a duplicate exercise', async () => {
      const { status, body } = await request('POST', `/api/sessions/${sessionId}/exercises`, {
        token: memberToken,
        body: { name: 'lat pulldown' },
      });
      assert.equal(status, 409);
      assert.match(body.error.message, /already in this session/);
    });

    let setId = '';

    await check('POST .../sets logs a set and updates session tonnage', async () => {
      const { status, body } = await request(
        'POST',
        `/api/sessions/${sessionId}/exercises/${exerciseId}/sets`,
        { token: memberToken, body: { reps: 10, weightKg: 70, rpe: 8 } },
      );
      assert.equal(status, 201);
      assert.equal(body.set.reps, 10);
      setId = body.set.id;
      const exercise = body.session.exercises.find((item) => item.id === exerciseId);
      assert.equal(exercise.sets.length, 1);
      assert.ok(body.session.metrics.volumeKg >= 700, 'session metrics should include the new set');
    });

    await check('POST .../sets rejects invalid reps', async () => {
      const { status, body } = await request(
        'POST',
        `/api/sessions/${sessionId}/exercises/${exerciseId}/sets`,
        { token: memberToken, body: { reps: 0, weightKg: 70 } },
      );
      assert.equal(status, 400);
      assert.ok(body.error.details.some((detail) => detail.field === 'reps'));
    });

    await check('PATCH .../sets/:setId corrects a logged set', async () => {
      const { status, body } = await request(
        'PATCH',
        `/api/sessions/${sessionId}/exercises/${exerciseId}/sets/${setId}`,
        { token: memberToken, body: { weightKg: 75 } },
      );
      assert.equal(status, 200);
      assert.equal(body.set.weightKg, 75);
    });

    await check('changes persist to workouts.json (fresh read from disk)', async () => {
      const { readJson, clearCache } = await import('../src/lib/jsonStore.js');
      clearCache();
      const data = await readJson('workouts.json');
      const session = data.sessions.find((item) => item.id === sessionId);
      const exercise = session.exercises.find((item) => item.id === exerciseId);
      assert.equal(exercise.sets.find((item) => item.id === setId).weightKg, 75);
    });

    await check('DELETE .../sets/:setId removes it', async () => {
      const { status, body } = await request(
        'DELETE',
        `/api/sessions/${sessionId}/exercises/${exerciseId}/sets/${setId}`,
        { token: memberToken },
      );
      assert.equal(status, 200);
      const exercise = body.session.exercises.find((item) => item.id === exerciseId);
      assert.equal(exercise.sets.length, 0);
    });

    await check('DELETE .../exercises/:exerciseId removes it', async () => {
      const { status } = await request('DELETE', `/api/sessions/${sessionId}/exercises/${exerciseId}`, {
        token: memberToken,
      });
      assert.equal(status, 200);
    });

    await check('PATCH /api/users/:id updates member stats', async () => {
      const original = await request('GET', `/api/users/${memberId}`, { token: memberToken });
      const startWeight = original.body.user.weightKg;
      cleanup.push(() =>
        request('PATCH', `/api/users/${memberId}`, { token: memberToken, body: { weightKg: startWeight } }),
      );

      const { status, body } = await request('PATCH', `/api/users/${memberId}`, {
        token: memberToken,
        body: { weightKg: startWeight + 0.4 },
      });
      assert.equal(status, 200);
      assert.equal(body.user.weightKg, startWeight + 0.4);
      assert.ok(body.user.weightHistory.length >= 1, 'weight changes should be tracked');
    });

    await check('PATCH /api/users/:id rejects unknown fields', async () => {
      const { status } = await request('PATCH', `/api/users/${memberId}`, {
        token: memberToken,
        body: { role: 'staff' },
      });
      assert.equal(status, 400);
    });

    await check('GET /api/analytics/status advertises the placeholder', async () => {
      const { status, body } = await request('GET', '/api/analytics/status');
      assert.equal(status, 200);
      assert.equal(body.status.enabled, false);
      assert.match(body.status.headline, /Coming Soon/);
      assert.ok(body.status.supportedLifts.length > 0);
    });

    await check('POST /api/analytics/uploads queues a video', async () => {
      const { status, body } = await request('POST', '/api/analytics/uploads', {
        token: memberToken,
        body: { exercise: 'Back Squat', fileName: 'squat.mp4', fileSizeBytes: 4_200_000 },
      });
      assert.equal(status, 202);
      assert.equal(body.upload.status, 'queued');
      const uploadId = body.upload.id;
      cleanup.push(async (adminToken) => {
        if (adminToken) await request('DELETE', `/api/admin/video-uploads/${uploadId}`, { token: adminToken });
      });
    });

    let adminToken = '';

    await check('POST /api/auth/staff/login authenticates staff', async () => {
      const { status, body } = await request('POST', '/api/auth/staff/login', {
        body: { username: 'coach', password: 'elever-lab-2026' },
      });
      assert.equal(status, 200, `expected 200, got ${status}`);
      assert.equal(body.admin.username, 'coach');
      adminToken = body.token;
    });

    await check('staff login rejects a wrong password', async () => {
      const { status } = await request('POST', '/api/auth/staff/login', {
        body: { username: 'coach', password: 'wrong' },
      });
      assert.equal(status, 401);
    });

    await check('member tokens cannot reach admin routes', async () => {
      const { status } = await request('GET', '/api/admin/overview', { token: memberToken });
      assert.equal(status, 403);
    });

    await check('GET /api/admin/overview aggregates the floor', async () => {
      const { status, body } = await request('GET', '/api/admin/overview', { token: adminToken });
      assert.equal(status, 200);
      assert.equal(body.overview.counts.members, 3);
      assert.ok(body.overview.volume.allTimeKg > 0);
      assert.ok(body.overview.recentActivity.length > 0);
    });

    await check('GET /api/admin/members lists all three members with stats', async () => {
      const { status, body } = await request('GET', '/api/admin/members', { token: adminToken });
      assert.equal(status, 200);
      assert.deepEqual(
        body.users.map((user) => user.name).sort(),
        ['Chin An', 'Dominic', 'Kean Hean'],
      );
      assert.ok(body.users.every((user) => typeof user.stats.volumeKg === 'number'));
    });

    await check('admin roster reports the newest session as "last seen"', async () => {
      // Regression: buildUserSummary used to trust the caller's ordering, and the
      // roster passes an unsorted list, so this reported the *oldest* date.
      const roster = await request('GET', '/api/admin/members', { token: adminToken });
      for (const member of roster.body.users) {
        if (!member.stats.lastSessionDate) continue;
        const { body } = await request('GET', `/api/admin/sessions?userId=${member.id}&limit=500`, {
          token: adminToken,
        });
        const newest = body.sessions.reduce(
          (max, session) => (session.date > max ? session.date : max),
          '0000-00-00',
        );
        assert.equal(
          member.stats.lastSessionDate,
          newest,
          `${member.name}: expected last seen ${newest}, got ${member.stats.lastSessionDate}`,
        );
      }
    });

    await check('admin can create and delete a member', async () => {
      const created = await request('POST', '/api/admin/members', {
        token: adminToken,
        body: { name: 'Smoke Test Member', age: 30, weightKg: 70 },
      });
      assert.equal(created.status, 201);

      const duplicate = await request('POST', '/api/admin/members', {
        token: adminToken,
        body: { name: 'smoke test member', age: 30, weightKg: 70 },
      });
      assert.equal(duplicate.status, 409, 'duplicate names must be rejected');

      const removed = await request('DELETE', `/api/admin/members/${created.body.user.id}`, { token: adminToken });
      assert.equal(removed.status, 200);
    });

    await check('unknown routes return a 404 envelope', async () => {
      const { status, body } = await request('GET', '/api/does-not-exist');
      assert.equal(status, 404);
      assert.equal(body.error.code, 'not_found');
    });

    // Roll back everything this run created.
    for (const action of cleanup.reverse()) {
      await action(adminToken);
    }
  } finally {
    server.close();
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Smoke run crashed:', error);
  process.exit(1);
});
