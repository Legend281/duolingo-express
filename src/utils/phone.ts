// Phone helpers shared by every page that shows the company's support number.

const KEYPAD: Record<string, string> = {
  A: '2', B: '2', C: '2', D: '3', E: '3', F: '3', G: '4', H: '4', I: '4', J: '5', K: '5', L: '5', M: '6',
  N: '6', O: '6', P: '7', Q: '7', R: '7', S: '7', T: '8', U: '8', V: '8', W: '9', X: '9', Y: '9', Z: '9',
};

/**
 * The number to put in a tel: link. Letters become keypad digits ("(800) 555-DUO-EXP").
 * A number written with a leading "+" (e.g. "+234 803 123 4567") is kept as given; anything
 * else is treated as a US/Canada number (+1, vanity numbers capped at 11 digits).
 */
export function toDialNumber(phone: string): string {
  const raw = (phone || '').trim();
  const digits = raw.toUpperCase().replace(/[A-Z]/g, c => KEYPAD[c]).replace(/[^0-9]/g, '');
  if (!digits) return '';
  if (raw.startsWith('+')) return '+' + digits;
  let d = digits;
  if (d.length === 10) d = '1' + d;
  if (d.length > 11 && d.startsWith('1')) d = d.slice(0, 11);
  else if (d.length > 10 && !d.startsWith('1')) d = '1' + d.slice(0, 10);
  return '+' + d;
}

/** Defaults used only until the admin Settings have loaded (or if a field is blank). */
export const DEFAULT_SUPPORT_PHONE = '1-800-555-0199';
export const DEFAULT_DISPATCH_EMAIL = 'dispatch@duolingoexpress.com';
