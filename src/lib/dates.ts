// All dates are local-time "YYYY-MM-DD" keys. Weeks start on Monday.

const pad = (n: number) => String(n).padStart(2, '0');

export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (key: string, n: number) => {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
};

export const isWeekend = (key: string) => {
  const dow = fromKey(key).getDay();
  return dow === 0 || dow === 6;
};

/** Monday of the week containing `key`. */
export const weekStart = (key: string) => {
  const d = fromKey(key);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return toKey(d);
};

export const weekDays = (key: string) => {
  const start = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
};

export const monthStart = (key: string) => key.slice(0, 8) + '01';

export const addMonths = (key: string, n: number) => {
  const d = fromKey(monthStart(key));
  d.setMonth(d.getMonth() + n);
  return toKey(d);
};

export const monthDays = (key: string) => {
  const d = fromKey(monthStart(key));
  const out: string[] = [];
  const month = d.getMonth();
  while (d.getMonth() === month) {
    out.push(toKey(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
};

/** 6x7 grid of keys covering the month, starting on a Monday. */
export const monthGrid = (key: string) => {
  const start = weekStart(monthStart(key));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
};

export const nowHHMM = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const hhmmToMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const minToHHMM = (min: number) => {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

/** Bedtime minutes on the day's own scale: times before noon count as after midnight. */
export const bedToMin = (t: string) => {
  const m = hhmmToMin(t);
  return m < 12 * 60 ? m + 1440 : m;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const fmtLong = (key: string) => {
  const d = fromKey(key);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const fmtShort = (key: string) => {
  const d = fromKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
};

export const fmtMonth = (key: string) => {
  const d = fromKey(key);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

export const weekdayName = (key: string) => WEEKDAYS[fromKey(key).getDay()];

export const fmtTime = (iso: string) => nowHHMM(new Date(iso));

/** Live clock format: 1:05:09 */
export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

/** Total format: 6h 10m / 45m / 0m */
export const fmtDur = (ms: number) => {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h ? `${h}h ${pad(m)}m` : `${m}m`;
};

export const fmtMin = (min: number) => fmtDur(min * 60000);

/** `datetime-local` input value for an ISO timestamp. */
export const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  return `${toKey(d)}T${nowHHMM(d)}`;
};
