export type Category = 'work' | 'study' | 'reading' | 'workout' | 'sun';

export const CATEGORIES: { id: Category; label: string; icon: string; color: string }[] = [
  { id: 'work', label: 'Work', icon: '💼', color: 'var(--c-work)' },
  { id: 'study', label: 'Study', icon: '🎓', color: 'var(--c-study)' },
  { id: 'reading', label: 'Reading', icon: '📖', color: 'var(--c-reading)' },
  { id: 'workout', label: 'Workout', icon: '🏋️', color: 'var(--c-workout)' },
  { id: 'sun', label: 'Sun', icon: '☀️', color: 'var(--c-sun)' },
];

export const categoryInfo = (id: Category) => CATEGORIES.find((c) => c.id === id)!;

/** A finished chess-clock interval. `day` is the logical day it belongs to (YYYY-MM-DD). */
export interface Session {
  id: string;
  day: string;
  category: Category;
  start: string; // ISO timestamp
  end: string; // ISO timestamp
}

export interface ActiveTimer {
  category: Category;
  start: string;
  day: string;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
}

export interface ReadingLog {
  id: string;
  bookId: string | null;
  pages: number;
}

export interface Day {
  plannedWake: string | null; // HH:MM
  plannedBed: string | null;
  wake: string | null;
  bed: string | null; // HH:MM; a time before noon means after midnight
  satisfaction: number | null; // 1–10
  note: string;
  prayers: number;
  breathwork: number;
  workoutTypes: string[];
  screenTimeMin: number | null;
  tasks: Task[];
  reading: ReadingLog[];
}

export interface Book {
  id: string;
  title: string;
  totalPages: number;
  finished: boolean;
}

export interface Goals {
  workMin: number;
  studyMin: number;
  readingPages: number;
  prayers: number;
  breathwork: number;
  sunMin: number;
  workoutPerWeek: number;
  screenMaxMin: number;
}

export interface Schedule {
  wake: string;
  bed: string;
}

export interface Settings {
  goals: Goals;
  weekday: Schedule;
  weekend: Schedule;
  workoutTypes: string[];
  reminderTime: string;
  startWithWindows: boolean;
  closeToTray: boolean;
  longTimerHours: number;
}

export interface AppData {
  version: 1;
  settings: Settings;
  books: Book[];
  days: Record<string, Day>;
  sessions: Session[];
  active: ActiveTimer | null;
  meta: { lastReminder: string | null };
}
