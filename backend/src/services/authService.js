import { env } from '../config/env.js';
import { createToken, verifyPassword, verifyPin } from '../lib/crypto.js';
import { forbidden, notFound, unauthorized } from '../lib/errors.js';
import * as usersRepository from '../repositories/usersRepository.js';
import * as adminsRepository from '../repositories/adminsRepository.js';
import { toPublicUser } from './usersService.js';

/**
 * Step 1 of scan-in: resolve a typed name to the member it belongs to.
 *
 * Returns only what the kiosk needs to ask "this is Dominic's profile — is that
 * you?". Nothing private is exposed until the PIN checks out, and members are
 * already listed on the scan screen, so confirming a name is not a disclosure.
 *
 * @param {string} name
 */
export async function lookupMember(name) {
  const user = await usersRepository.findByName(name);
  if (!user) {
    throw notFound(`No member found for "${name}". Check the spelling, or ask a member of staff.`);
  }
  return { id: user.id, name: user.name, memberNumber: user.memberNumber, tier: user.tier };
}

/**
 * Step 2: "card scan" sign-in, gated on the member's 4-digit kiosk PIN.
 *
 * The kiosk is a shared floor screen — without the PIN anyone in the queue could
 * open (and edit) someone else's weight, goals and plan just by typing a name
 * they can see on the roster. The token this mints only ever grants access to
 * that member's own training data.
 *
 * @param {string} name
 * @param {string} pin
 */
export async function scanIn(name, pin) {
  const user = await usersRepository.findByName(name);
  if (!user) {
    throw notFound(`No member found for "${name}". Check the spelling, or ask a member of staff.`);
  }
  if (!user.pinHash) {
    throw forbidden(`${user.name} has no kiosk PIN yet. Ask staff to set one in the admin panel.`);
  }
  if (!(await verifyPin(pin, user.pinHash))) {
    throw unauthorized('Incorrect PIN. Try again, or ask a member of staff.');
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
