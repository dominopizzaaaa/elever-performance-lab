import { env } from '../config/env.js';
import { createToken, verifyPassword } from '../lib/crypto.js';
import { forbidden, notFound, unauthorized } from '../lib/errors.js';
import * as usersRepository from '../repositories/usersRepository.js';
import * as adminsRepository from '../repositories/adminsRepository.js';
import { toPublicUser } from './usersService.js';

/**
 * "Card scan" sign-in: a typed name resolves to a hard-coded member.
 *
 * This is deliberately not a security boundary — it mirrors tapping a gym card
 * on a reader. Anyone standing at the kiosk can scan in as any member; the
 * token it mints only grants access to that member's own training data.
 *
 * @param {string} name
 */
export async function scanIn(name) {
  const user = await usersRepository.findByName(name);
  if (!user) {
    throw notFound(`No member found for "${name}". Try Dominic, Kean Hean or Chin An.`);
  }

  const { token, expiresAt } = createToken(
    { sub: user.id, role: 'member', name: user.name },
    env.memberTokenTtl,
  );

  return { token, expiresAt, user: toPublicUser(user) };
}

/**
 * Staff sign-in for the admin panel. Compares against a scrypt hash in
 * `admins.json` and returns the same generic message for unknown users and bad
 * passwords so the endpoint cannot be used to enumerate accounts.
 *
 * @param {string} username
 * @param {string} password
 */
export async function staffLogin(username, password) {
  const admin = await adminsRepository.findByUsername(username);

  // Always run a verification so response timing does not reveal whether the
  // username exists.
  const stored = admin?.passwordHash ?? 'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA';
  const ok = await verifyPassword(password, stored);

  if (!admin || !ok) {
    throw unauthorized('Incorrect username or password');
  }
  if (admin.role !== 'staff') {
    throw forbidden('This account cannot access the admin panel');
  }

  await adminsRepository.touchLastLogin(admin.id);

  const { token, expiresAt } = createToken(
    { sub: admin.id, role: 'staff', name: admin.displayName },
    env.adminTokenTtl,
  );

  return {
    token,
    expiresAt,
    admin: { id: admin.id, username: admin.username, displayName: admin.displayName, role: admin.role },
  };
}

/**
 * Resolves the identity behind a verified token payload.
 * @param {{ sub: string, role: 'member' | 'staff' }} auth
 */
export async function resolveIdentity(auth) {
  if (auth.role === 'staff') {
    const admin = await adminsRepository.findAdminById(auth.sub);
    if (!admin) throw unauthorized('Staff account no longer exists');
    return {
      role: 'staff',
      admin: { id: admin.id, username: admin.username, displayName: admin.displayName, role: admin.role },
    };
  }

  const user = await usersRepository.findById(auth.sub);
  if (!user) throw unauthorized('Member no longer exists');
  return { role: 'member', user: toPublicUser(user) };
}
