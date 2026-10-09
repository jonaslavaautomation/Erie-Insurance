// Shared input helpers.

/** tel: link for "(800) 367-3743 x4471" style numbers; the extension is dialed after a pause. */
export function telHref(phone: string) {
  const [main, ext] = phone.split(/\s*x/i);
  const digits = main.replace(/\D/g, '').slice(-10);
  return `tel:+1${digits}${ext ? `,${ext.replace(/\D/g, '')}` : ''}`;
}

/** MM/YY card expiration that is a real month and not in the past. */
export function validCardExpiry(value: string, now = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

/** True when year/month/day form a real calendar date (rejects 02/31). */
export function isRealDate(year: number, month: number, day: number) {
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/** Whole years between a birth date and today, counting month and day. */
export function ageOn(year: number, month: number, day: number, now = new Date()) {
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age -= 1;
  return age;
}

/** Parses a number input, treating an empty field as 0 and clamping to a minimum. */
export const numberInput = (value: string, min = 0) => Math.max(min, Number(value) || 0);
