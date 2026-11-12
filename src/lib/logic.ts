import type { AppData, Category, Day } from './types';
import { CATEGORIES } from './types';
import { addDays, toKey, weekDays } from './dates';
import { emptyDay } from './defaults';

export const uid = () => crypto.randomUUID();

/**
 * The day you are currently "in". Days run from wake-up to bedtime, so staying up
 * past midnight still belongs to the previous day until you press "Good night"
 * (or until 05:00 at the latest).
 */
export function logicalToday(data: AppData, now = new Date()): string {
  const today = toKey(now);
  const yesterday = addDays(today, -1);
  if (now.getHours() < 5) {
    const y = data.days[yesterday];
    if ((y?.wake && !y.bed) || data.active?.day === yesterday) return yesterday;
  }
  return today;
}

/** Get a day for editing, creating it (with the planned schedule snapshot) if needed. */
export function ensureDay(d: AppData, date: string): Day {
  if (!d.days[date]) d.days[date] = emptyDay(date, d.settings);
  return d.days[date];
}

// ---------- chess clock ----------

export function stopActive(d: AppData, at = new Date()) {
  if (!d.active) return;
  const startMs = Date.parse(d.active.start);
  const endMs = Math.max(startMs, at.getTime());
  // Anything under 10 seconds is an accidental click, not a real session.
  if (endMs - startMs >= 10000) {
    d.sessions.push({
      id: uid(),
      day: d.active.day,
      category: d.active.category,
      ...(d.active.subject ? { subject: d.active.subject } : {}),
      start: d.active.start,
      end: new Date(endMs).toISOString(),
    });
  }
  d.active = null;
}

/** Throw the running timer away without recording anything (for a click by mistake). */
export function discardActive(d: AppData) {
  d.active = null;
}

/** Chess-clock press: stops whatever runs; starts `cat` unless it was the one running. */
export function toggleTimer(d: AppData, cat: Category, day: string, subject?: string) {
  const running = d.active?.category;
  stopActive(d);
  if (running !== cat) {
    ensureDay(d, day);
    d.active = { category: cat, start: new Date().toISOString(), day, ...(subject ? { subject } : {}) };
  }
}

// ---------- totals ----------

export type CatTotals = Record<Category, number>;

const zeroTotals = (): CatTotals => ({ work: 0, study: 0, reading: 0, workout: 0, sun: 0, meditation: 0 });

/** Milliseconds per category per day, including the running timer. */
export function totalsByDay(data: AppData, nowMs: number): Map<string, CatTotals> {
  const map = new Map<string, CatTotals>();
  const add = (day: string, cat: Category, ms: number) => {
    let t = map.get(day);
    if (!t) map.set(day, (t = zeroTotals()));
    t[cat] += ms;
  };
  for (const s of data.sessions) add(s.day, s.category, Date.parse(s.end) - Date.parse(s.start));
  if (data.active) add(data.active.day, data.active.category, Math.max(0, nowMs - Date.parse(data.active.start)));
  return map;
}

export interface DaySummary {
  date: string;
  ms: CatTotals;
  pages: number;
  prayers: number;
  breathwork: number;
  workedOut: boolean;
  workoutTypes: string[];
  satisfaction: number | null;
  screenTimeMin: number | null;
  tasksDone: number;
  tasksTotal: number;
  wake: string | null;
  bed: string | null;
  hasData: boolean;
}

export function summarize(data: AppData, date: string, totals: Map<string, CatTotals>): DaySummary {
  const day = data.days[date];
  const ms = totals.get(date) ?? zeroTotals();
  const pages = day?.reading.reduce((s, r) => s + r.pages, 0) ?? 0;
  const workoutTypes = day?.workoutTypes ?? [];
  const anyTime = CATEGORIES.some((c) => ms[c.id] > 0);
  return {
    date,
    ms,
    pages,
    prayers: day?.prayers ?? 0,
    breathwork: day?.breathwork ?? 0,
    workedOut: workoutTypes.length > 0 || ms.workout >= 60000,
    workoutTypes,
    satisfaction: day?.satisfaction ?? null,
    screenTimeMin: day?.screenTimeMin ?? null,
    tasksDone: day?.tasks.filter((t) => t.done).length ?? 0,
    tasksTotal: day?.tasks.length ?? 0,
    wake: day?.wake ?? null,
    bed: day?.bed ?? null,
    hasData:
      anyTime ||
      !!day &&
        (pages > 0 ||
          day.prayers > 0 ||
          day.breathwork > 0 ||
          workoutTypes.length > 0 ||
          day.satisfaction !== null ||
          day.screenTimeMin !== null ||
          day.tasks.length > 0 ||
          !!day.wake ||
          !!day.bed ||
          !!day.note),
  };
}

// ---------- goals ----------

export interface GoalProgress {
  key: string;
  label: string;
  value: number;
  target: number;
  /** 'min' = reach at least target; 'max' = stay at or below target */
  kind: 'min' | 'max';
  format: (v: number) => string;
  met: boolean;
  color: string;
}

const fmtMinutes = (v: number) => {
  const h = Math.floor(v / 60);
  const m = Math.round(v % 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
};
const fmtCount = (v: number) => String(Math.round(v));

/** Daily goals for a day (targets of 0 are treated as disabled). */
export function dailyGoals(data: AppData, s: DaySummary): GoalProgress[] {
  const g = data.settings.goals;
  const items: Omit<GoalProgress, 'met'>[] = [
    { key: 'work', label: 'Work', value: s.ms.work / 60000, target: g.workMin, kind: 'min', format: fmtMinutes, color: 'var(--c-work)' },
    { key: 'study', label: 'Study', value: s.ms.study / 60000, target: g.studyMin, kind: 'min', format: fmtMinutes, color: 'var(--c-study)' },
    { key: 'pages', label: 'Pages', value: s.pages, target: g.readingPages, kind: 'min', format: fmtCount, color: 'var(--c-reading)' },
    { key: 'prayers', label: 'Prayers', value: s.prayers, target: g.prayers, kind: 'min', format: fmtCount, color: 'var(--c-med)' },
    { key: 'breathwork', label: 'Breathwork', value: s.breathwork, target: g.breathwork, kind: 'min', format: fmtCount, color: 'var(--c-med)' },
    { key: 'meditation', label: 'Meditation', value: s.ms.meditation / 60000, target: g.meditationMin, kind: 'min', format: fmtMinutes, color: 'var(--c-med)' },
    { key: 'sun', label: 'Sun', value: s.ms.sun / 60000, target: g.sunMin, kind: 'min', format: fmtMinutes, color: 'var(--c-sun)' },
  ];
  if (s.screenTimeMin !== null) {
    items.push({ key: 'screen', label: 'Screen time', value: s.screenTimeMin, target: g.screenMaxMin, kind: 'max', format: fmtMinutes, color: 'var(--c-screen)' });
  }
  return items
    .filter((i) => i.target > 0)
    .map((i) => ({ ...i, met: i.kind === 'min' ? i.value >= i.target : i.value <= i.target }));
}

/** Days with a workout in the Monday–Sunday week containing `date`. */
export function workoutsInWeek(data: AppData, date: string, totals: Map<string, CatTotals>) {
  return weekDays(date).filter((d) => summarize(data, d, totals).workedOut).length;
}

/** 0..1 share of daily goals met, or null when the day has no data. */
export function goalScore(data: AppData, s: DaySummary): number | null {
  if (!s.hasData) return null;
  const goals = dailyGoals(data, s);
  if (!goals.length) return null;
  return goals.filter((g) => g.met).length / goals.length;
}

// ---------- reading ----------

export function pagesPerBook(data: AppData): Map<string, number> {
  const map = new Map<string, number>();
  for (const day of Object.values(data.days)) {
    for (const r of day.reading) if (r.bookId) map.set(r.bookId, (map.get(r.bookId) ?? 0) + r.pages);
  }
  return map;
}
