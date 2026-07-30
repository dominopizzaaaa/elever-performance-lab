/**
 * Token persistence for the kiosk.
 *
 * `sessionStorage` is deliberate: a wall-mounted screen should forget the
 * member as soon as the tab or browser closes, and nothing should survive in
 * `localStorage` for the next person to find.
 */

const KEYS = {
  member: 'epl.member.token',
  staff: 'epl.staff.token',
} as const;

export type TokenKind = keyof typeof KEYS;

export function readToken(kind: TokenKind): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(KEYS[kind]);
  } catch {
    // Private browsing modes can throw on storage access.
    return null;
  }
}

export function writeToken(kind: TokenKind, token: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(KEYS[kind], token);
  } catch {
    /* storage unavailable — the in-memory context still holds the session */
  }
}

export function clearToken(kind: TokenKind): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(KEYS[kind]);
  } catch {
    /* ignore */
  }
}
