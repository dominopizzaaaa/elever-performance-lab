/**
 * Staff accounts for the admin panel. Passwords are hashed with scrypt by the
 * seed script — plaintext never reaches disk.
 *
 * Demo credentials are documented in the README; change them before any real
 * deployment (`npm run seed:force` after editing this file).
 */
export const ADMINS_SEED = [
  {
    id: 'adm_head_coach',
    username: 'coach',
    displayName: 'Head Coach',
    role: 'staff',
    password: 'elever-lab-2026',
  },
  {
    id: 'adm_front_desk',
    username: 'frontdesk',
    displayName: 'Front Desk',
    role: 'staff',
    password: 'welcome-to-elever',
  },
];
