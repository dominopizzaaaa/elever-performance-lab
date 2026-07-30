/** Display formatting helpers. All output is locale-stable (en-GB) so the
 *  server-rendered markup matches the client and React does not warn about
 *  hydration mismatches. */

const LOCALE = 'en-GB';

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits }).format(value);
}

/** Tonnage: 62,400 kg -> "62.4t" above a tonne, otherwise "840 kg". */
export function formatVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(kg >= 10000 ? 0 : 1)}t`;
  return `${formatNumber(kg)} kg`;
}

export function formatWeight(kg: number): string {
  const rounded = Math.round(kg * 10) / 10;
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} kg`;
}

/** `2026-07-28` -> `Tue 28 Jul` */
export function formatDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return new Intl.DateTimeFormat(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
}

/** `2026-07-28` -> `28 Jul 2026` */
export function formatLongDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

/** ISO timestamp -> `19:42` */
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false }).format(
    new Date(iso),
  );
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

export function todayKey(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

/** "Today" / "Yesterday" / "4 days ago" / "28 Jul" */
export function formatRelativeDate(dateKey: string): string {
  const days = Math.round(
    (parseDateKey(todayKey()).getTime() - parseDateKey(dateKey).getTime()) / 86_400_000,
  );
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days > 1 && days < 7) return `${days} days ago`;
  if (days === -1) return 'Tomorrow';
  return formatDate(dateKey);
}

/** `2026-W31` -> `W31` */
export function formatWeekLabel(weekKey: string): string {
  return weekKey.split('-')[1] ?? weekKey;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1000) return `${(bytes / 1000).toFixed(0)} KB`;
  return `${bytes} B`;
}

/** Signed delta with an explicit sign, e.g. `+2.5` / `-1.0`. */
export function formatDelta(value: number, unit = '', digits = 1): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}${unit}`;
}

/** Small helper for conditional class names (keeps JSX readable). */
export function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ');
}
