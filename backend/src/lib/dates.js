/** Date helpers. Session dates are plain `YYYY-MM-DD` strings in local time. */

/** @param {Date} [date] */
export function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

/** @param {string} key `YYYY-MM-DD` */
export function fromDateKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/**
 * @param {string} key
 * @param {number} days
 */
export function addDays(key, days) {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** Whole days between two date keys (b - a). */
export function daysBetween(a, b) {
  const ms = fromDateKey(b).getTime() - fromDateKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** ISO week key, e.g. `2026-W31`. Used to bucket weekly volume. */
export function isoWeekKey(dateKey) {
  const date = fromDateKey(dateKey);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNumber = (target.getDay() + 6) % 7; // Monday = 0
  target.setDate(target.getDate() - dayNumber + 3); // nearest Thursday
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNumber = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNumber + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${target.getFullYear()}-W${String(week).padStart(2, '0')}`;
}
