import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to `backend/`. */
export const BACKEND_ROOT = path.resolve(here, '..', '..');

dotenv.config({ path: path.join(BACKEND_ROOT, '.env') });

const DEV_SECRET = 'dev-only-insecure-secret-change-me';

function int(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function list(value, fallback) {
  if (!value) return fallback;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: int(process.env.PORT, 4000),
  corsOrigins: list(process.env.CORS_ORIGINS, ['http://localhost:3000', 'http://127.0.0.1:3000']),
  authSecret: process.env.AUTH_SECRET || DEV_SECRET,
  memberTokenTtl: int(process.env.MEMBER_TOKEN_TTL, 7200),
  adminTokenTtl: int(process.env.ADMIN_TOKEN_TTL, 3600),
  logLevel: process.env.LOG_LEVEL ?? 'short',

  /** Directory holding the JSON "database" files. */
  dataDir: path.join(BACKEND_ROOT, 'src', 'data'),
  /** Directory for AI Analytics video uploads (placeholder feature). */
  uploadsDir: path.join(BACKEND_ROOT, 'uploads'),
};

if (env.isProduction && env.authSecret === DEV_SECRET) {
  // Fail loudly rather than silently signing production tokens with a public secret.
  throw new Error('AUTH_SECRET must be set to a unique value when NODE_ENV=production');
}

if (!env.isProduction && env.authSecret === DEV_SECRET) {
  console.warn('[config] Using the built-in development AUTH_SECRET. Set AUTH_SECRET in backend/.env.');
}
