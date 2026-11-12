export type Category = 'work' | 'study' | 'reading' | 'workout' | 'sun' | 'meditation';

export const CATEGORIES: { id: Category; label: string; icon: string; color: string }[] = [
  { id: 'work', label: 'Work', icon: '💼', color: 'var(--c-work)' },
  { id: 'study', label: 'Study', icon: '🎓', color: 'var(--c-study)' },
  { id: 'reading', label: 'Reading', icon: '📖', color: 'var(--c-reading)' },
  { id: 'workout', label: 'Workout', icon: '🏋️', color: 'var(--c-workout)' },
  { id: 'sun', label: 'Sun', icon: '☀️', color: 'var(--c-sun)' },
  { id: 'meditation', label: 'Meditation', icon: '🧘', color: 'var(--c-med)' },
];

export const categoryInfo = (id: Category) => CATEGORIES.find((c) => c.id === id)!;

/** A finished chess-clock interval. `day` is the logical day it belongs to (YYYY-MM-DD). */
export interface Session {
  id: string;
  day: string;
  category: Category;
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  subject?: string; // what was studied (study sessions only)
}

export interface ActiveTimer {
  category: Category;
  subject?: string;
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
  meditationMin: number;
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
  studySubjects: string[];
  reminderTime: string;
  startWithWindows: boolean;
  closeToTray: boolean;
  longTimerHours: number;
}

export interface Note {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

/** A flagged future event. Notifications fire `leadDays` days before `date` (0 = on the day) at `time`. */
export interface Reminder {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, when notifications fire
  leadDays: number[];
  sent: number[]; // leads already notified
  createdAt: string;
}

export interface AppData {
  version: 1;
  settings: Settings;
  books: Book[];
  notes: Note[];
  reminders: Reminder[];
  days: Record<string, Day>;
  sessions: Session[];
  active: ActiveTimer | null;
  meta: { lastReminder: string | null };
}
