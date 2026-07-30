import { createApp } from './app.js';
import { env } from './config/env.js';
import { exists } from './lib/jsonStore.js';

const REQUIRED_FILES = ['users.json', 'workouts.json', 'admins.json', 'exercise-library.json', 'analytics-queue.json'];

async function assertSeeded() {
  const missing = [];
  for (const file of REQUIRED_FILES) {
    if (!(await exists(file))) missing.push(file);
  }
  if (missing.length > 0) {
    console.error(
      `\n[startup] Missing data files: ${missing.join(', ')}\n` +
        '           Run `npm run seed` from the repo root first.\n',
    );
    process.exit(1);
  }
}

async function start() {
  await assertSeeded();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`\n  ⚡ Elever Performance Lab API`);
    console.log(`     http://localhost:${env.port}/api/health`);
    console.log(`     env: ${env.nodeEnv} · data: ${env.dataDir}\n`);
  });

  const shutdown = (signal) => {
    console.log(`\n[shutdown] ${signal} received, closing server...`);
    server.close(() => process.exit(0));
    // Do not let a hung connection block the exit forever.
    setTimeout(() => process.exit(1), 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('[startup] Failed to start API:', error);
  process.exit(1);
});
