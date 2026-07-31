#!/usr/bin/env node
/**
 * Seeds the JSON "database".
 *
 *   npm run seed          # create files only if missing (safe, non-destructive)
 *   npm run seed:force    # overwrite, discarding anything logged on the kiosk
 *
 * History is generated relative to today so the demo always looks current.
 */
import fs from 'node:fs/promises';
import { env } from '../src/config/env.js';
import { clearCache, exists, writeJson } from '../src/lib/jsonStore.js';
import { hashPassword } from '../src/lib/crypto.js';
import { todayKey } from '../src/lib/dates.js';
import { USERS_SEED } from '../src/data/seed/users.seed.js';
import { ADMINS_SEED } from '../src/data/seed/admins.seed.js';
import { EXERCISE_LIBRARY } from '../src/data/seed/exerciseLibrary.seed.js';
import { MUSCLE_GROUPS } from '../src/data/seed/muscleGroups.js';
import { buildSessionsForUser } from '../src/data/seed/sessions.seed.js';

const force = process.argv.includes('--force');

async function seedFile(fileName, build) {
  if (!force && (await exists(fileName))) {
    console.log(`  · ${fileName} already exists — skipped (use --force to overwrite)`);
    return false;
  }
  const data = await build();
  await writeJson(fileName, data);
  console.log(`  ✓ ${fileName} written`);
  return true;
}

async function main() {
  clearCache();
  await fs.mkdir(env.dataDir, { recursive: true });

  console.log(`\nElever Performance Lab — seeding ${env.dataDir}\n`);

  const now = new Date().toISOString();
  const today = todayKey();

  await seedFile('users.json', () => ({
    version: 1,
    updatedAt: now,
    users: USERS_SEED.map((user) => ({ ...user, createdAt: now, updatedAt: now })),
  }));

  await seedFile('workouts.json', () => ({
    version: 1,
    updatedAt: now,
    sessions: USERS_SEED.flatMap((user) => buildSessionsForUser(user, today)),
  }));

  await seedFile('admins.json', async () => ({
    version: 1,
    updatedAt: now,
    admins: await Promise.all(
      ADMINS_SEED.map(async ({ password, ...admin }) => ({
        ...admin,
        passwordHash: await hashPassword(password),
        createdAt: now,
        lastLoginAt: null,
      })),
    ),
  }));

  await seedFile('exercise-library.json', () => ({
    version: 1,
    updatedAt: now,
    muscleGroups: MUSCLE_GROUPS,
    exercises: EXERCISE_LIBRARY,
  }));

  // Queue for the AI Analytics placeholder. Uploads are recorded but never
  // processed until the inference service lands.
  // TODO(ai-analytics): replace this file with a real job queue.
  await seedFile('analytics-queue.json', () => ({
    version: 1,
    updatedAt: now,
    uploads: [],
  }));

  console.log('\nDone. Demo staff logins:');
  for (const admin of ADMINS_SEED) {
    console.log(`  ${admin.username} / ${admin.password}`);
  }
  console.log('\nDemo members (type the name to scan in):');
  for (const user of USERS_SEED) {
    console.log(`  ${user.name}`);
  }
  console.log('');
}

main().catch((error) => {
  console.error('\nSeeding failed:', error);
  process.exit(1);
});
