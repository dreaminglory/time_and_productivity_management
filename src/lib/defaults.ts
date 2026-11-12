import type { AppData, Day, Settings } from './types';
import { isWeekend } from './dates';

export const DEFAULT_WORKOUT_TYPES = [
  'Full body',
  'Upper body',
  'Lower body',
  'Arms',
  'Legs',
  'Chest',
  'Back',
  'Shoulders',
  'Core',
  'Cardio',
  'Running',
  'Stretching',
];

export const defaultSettings = (): Settings => ({
  goals: {
    workMin: 6 * 60,
    studyMin: 60,
    readingPages: 20,
    prayers: 3,
    breathwork: 1,
    sunMin: 15,
    meditationMin: 10,
    workoutPerWeek: 4,
    screenMaxMin: 3 * 60,
  },
  weekday: { wake: '06:30', bed: '22:30' },
  weekend: { wake: '06:30', bed: '22:30' },
  workoutTypes: [...DEFAULT_WORKOUT_TYPES],
  studySubjects: ['AI Engineering', 'Data Engineering'],
  reminderTime: '22:00',
  startWithWindows: true,
  closeToTray: true,
  longTimerHours: 3,
});

export const defaultData = (): AppData => ({
  version: 1,
  settings: defaultSettings(),
  books: [],
  notes: [],
  reminders: [],
  days: {},
  sessions: [],
  active: null,
  meta: { lastReminder: null },
});

export const emptyDay = (date: string, settings: Settings): Day => {
  const plan = isWeekend(date) ? settings.weekend : settings.weekday;
  return {
    plannedWake: plan.wake,
    plannedBed: plan.bed,
    wake: null,
    bed: null,
    satisfaction: null,
    note: '',
    prayers: 0,
    breathwork: 0,
    workoutTypes: [],
    screenTimeMin: null,
    tasks: [],
    reading: [],
  };
};

/** Fill in anything missing from older or partial data files. */
export function normalize(raw: unknown): AppData {
  const base = defaultData();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AppData>;
  const settings = { ...base.settings, ...r.settings };
  settings.goals = { ...base.settings.goals, ...r.settings?.goals };
  return {
    ...base,
    ...r,
    settings,
    meta: { ...base.meta, ...r.meta },
    books: r.books ?? [],
    notes: r.notes ?? [],
    reminders: r.reminders ?? [],
    days: r.days ?? {},
    sessions: r.sessions ?? [],
    active: r.active ?? null,
  };
}
