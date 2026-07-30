import crypto from 'node:crypto';

/**
 * Prefixed, sortable-ish identifiers. The timestamp prefix keeps ids roughly
 * ordered by creation time which makes the JSON files easy to eyeball.
 * @param {string} prefix
 */
export function createId(prefix) {
  const time = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${time}${random}`;
}

/**
 * URL/key-safe slug used to match a typed name to a member ("Kean Hean" -> "kean-hean").
 * @param {string} value
 */
export function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
