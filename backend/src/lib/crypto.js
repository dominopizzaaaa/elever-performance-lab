import crypto from 'node:crypto';
import { env } from '../config/env.js';

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/**
 * Hashes a staff password with scrypt. Format: `scrypt$N$r$p$salt$hash`.
 * Uses Node's built-in crypto so the project stays dependency-light.
 * @param {string} password
 * @returns {Promise<string>}
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS, (error, derived) => {
      if (error) return reject(error);
      const { N, r, p } = SCRYPT_PARAMS;
      resolve(`scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${derived.toString('base64')}`);
    });
  });
}

/**
 * Constant-time password verification against a stored scrypt hash.
 * @param {string} password
 * @param {string} stored
 * @returns {Promise<boolean>}
 */
export function verifyPassword(password, stored) {
  return new Promise((resolve) => {
    if (typeof stored !== 'string') return resolve(false);
    const [scheme, n, r, p, saltB64, hashB64] = stored.split('$');
    if (scheme !== 'scrypt' || !saltB64 || !hashB64) return resolve(false);

    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const params = { N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT_PARAMS.maxmem };

    crypto.scrypt(password, salt, expected.length, params, (error, derived) => {
      if (error) return resolve(false);
      resolve(crypto.timingSafeEqual(derived, expected));
    });
  });
}

/**
 * Member kiosk PINs use the same scrypt scheme as staff passwords — a PIN is a
 * short secret, so it must never be comparable in plaintext.
 */
export const hashPin = hashPassword;
export const verifyPin = verifyPassword;

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadB64) {
  return crypto.createHmac('sha256', env.authSecret).update(payloadB64).digest('base64url');
}

/**
 * Creates a stateless, HMAC-signed session token. Deliberately simpler than a
 * full JWT: no algorithm negotiation, no library, one signing scheme.
 *
 * @param {{ sub: string, role: 'member' | 'staff', name?: string }} claims
 * @param {number} ttlSeconds
 */
export function createToken(claims, ttlSeconds) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = { ...claims, iat: issuedAt, exp: issuedAt + ttlSeconds };
  const payloadB64 = base64url(JSON.stringify(payload));
  return {
    token: `${payloadB64}.${sign(payloadB64)}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

/**
 * Verifies signature and expiry.
 * @param {string} token
 * @returns {{ sub: string, role: 'member' | 'staff', name?: string, iat: number, exp: number } | null}
 */
export function verifyToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;

  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return null;

  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (typeof payload?.exp !== 'number' || payload.exp * 1000 < Date.now()) return null;
  return payload;
}
