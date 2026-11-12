import type { Reminder } from './types';
import { addDays, fmtLong, fromKey, nowHHMM, toKey } from './dates';

export const LEAD_OPTIONS: { days: number; label: string }[] = [
  { days: 0, label: 'On the day' },
  { days: 1, label: '1 day before' },
  { days: 2, label: '2 days before' },
  { days: 3, label: '3 days before' },
  { days: 7, label: '1 week before' },
  { days: 14, label: '2 weeks before' },
];

export const leadLabel = (days: number) => LEAD_OPTIONS.find((o) => o.days === days)?.label ?? `${days} days before`;

/** Whole calendar days from `from` to `to` (both YYYY-MM-DD). */
export const daysBetween = (from: string, to: string) => Math.round((fromKey(to).getTime() - fromKey(from).getTime()) / 86400000);

/** "Today" / "Tomorrow" / "In 5 days" / "Yesterday" / "3 days ago". */
export const relativeDay = (date: string, today: string) => {
  const n = daysBetween(today, date);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 0 ? `In ${n} days` : `${-n} days ago`;
};

/** Soonest first: by date, then notify time. */
export const byDateAsc = (a: Reminder, b: Reminder) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time);

/** Same day next month, clamped to that month's last day (31 Jan → 28/29 Feb). */
export const plusMonth = (key: string) => {
  const d = fromKey(key);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toKey(d);
};

/** Reminders whose alert window has started and whose event has not passed yet. */
export const activeReminders = (reminders: Reminder[], today: string) =>
  reminders.filter((r) => r.date >= today && daysBetween(today, r.date) <= Math.max(0, ...r.leadDays)).sort(byDateAsc);

/**
 * Leads that are due to notify now. A lead is due from its fire day at the reminder's time until the event day.
 * If several are due at once (e.g. the app was closed), only the closest one is announced; all are marked sent.
 */
export function dueNotifications(reminders: Reminder[], now: Date): { reminder: Reminder; due: number[] }[] {
  const today = toKey(now);
  const time = nowHHMM(now);
  const out: { reminder: Reminder; due: number[] }[] = [];
  for (const r of reminders) {
    if (r.date < today) continue;
    const due = r.leadDays.filter((lead) => {
      if (r.sent.includes(lead)) return false;
      const fireDay = addDays(r.date, -lead);
      return today > fireDay || (today === fireDay && time >= r.time);
    });
    if (due.length) out.push({ reminder: r, due });
  }
  return out;
}

export const notificationText = (r: Reminder, today: string) => {
  const rel = relativeDay(r.date, today);
  return { title: `🔔 ${rel}: ${r.title}`, body: rel === 'Today' ? `${r.title} is today. Good luck!` : `${r.title} is ${rel.toLowerCase()}, on ${fmtLong(r.date)}.` };
};
