# Time Management App — Plan

Personal, offline, Windows-only desktop app for tracking how each day is spent.

## Decisions

| Topic | Decision |
|---|---|
| Platform | Windows desktop app (`.exe` installer + desktop shortcut), fully offline |
| Tech | Electron + React + TypeScript (Vite). Data in one local JSON file in `%APPDATA%` |
| Language / theme | English UI, dark theme, week starts Monday, 24-hour time |
| Storage | Local only, no backup service (the app keeps one previous copy `data.json.bak` as a corruption safety net) |
| Timer model | **Chess clock** — exactly one activity runs at a time; starting another pauses the current one |
| Timed activities | Work, Study, Reading, Workout, Sun |
| Timer persistence | Timer keeps counting if the app/PC is closed; on reopen, if it ran unusually long (default 3h+), the app asks "keep it or set the real stop time?" |
| Day boundary | A day runs from wake-up to bedtime, not midnight to midnight (going to bed at 01:30 still belongs to the previous day) |
| Start/End of day | **Planned vs actual** — planned 06:30 wake / 22:30 bed on weekdays (weekend editable separately); "Good morning" / "Good night" buttons stamp the actual time (editable) |
| Satisfaction | 1–10 score + optional journal note |
| Tasks | One-off tasks added on the day, checkbox done/not done. No timers. Routine items (reading, work, workout, …) are not tasks — they are the fixed daily categories |
| Reading | Pages + book library (title, total pages, progress) + reading timer |
| Workout | Duration via timer + one or more types per day. Default types: Full body, Upper body, Lower body, Arms, Legs, Chest, Back, Shoulders, Core, Cardio, Running, Stretching (custom types can be added) |
| Meditation | Prayers count, Breathwork count (no timer), Sun exposure timer |
| Screen time | Entered manually (minutes) — a daily *limit* rather than a target |
| Goals | Daily targets with progress bars; workout goal is per week (not every day). Days that hit all goals are highlighted |
| Stats | Weekly/monthly totals charts; calendar colouring (by satisfaction or goal completion) |
| Reminders | Evening check-in notification at 22:00; app starts with Windows; closing the window keeps the app in the tray so the reminder can fire (toggle in Settings) |

### Default goals (editable in Settings)

| Goal | Default |
|---|---|
| Work | 6 h / day |
| Study | 1 h / day |
| Reading | 20 pages / day |
| Prayers | 3 / day |
| Breathwork | 1 / day |
| Sun | 15 min / day |
| Workout | 4 days / week |
| Screen time | max 3 h / day |

## Screens

1. **Today** (home screen)
   - Chess clock: one big button per timed activity (Work, Study, Reading, Workout, Sun) with the running clock and each day's total.
   - Quick inputs: pages read (+ which book), Prayers +1, Breathwork +1, workout types, screen time.
   - Today's task list: add / check off / delete.
   - Good morning / Good night with planned vs actual times.
   - Goal progress bars.
   - Satisfaction slider + note.
2. **Calendar**: month and week views. Each day shows compact markers. Colour days by satisfaction or goal completion. Click a day to open it.
3. **Day detail**: the same editors as Today, for any past day, plus a list of timer sessions that can be edited or deleted, and manual session entry for forgotten timers.
4. **Stats**: weekly and monthly totals per category.
5. **Settings**: goals, planned wake/bed times, workout types, books, reminder time, startup/tray options.

## Data model (JSON)

```
settings   goals, schedule {weekday, weekend}, workoutTypes[], reminderTime, startWithWindows, closeToTray, longTimerHours
books[]    id, title, totalPages, finished
days{date} plannedWake, plannedBed, wake, bed, satisfaction, note, prayers, breathwork,
           workoutTypes[], screenTimeMin, tasks[{id,title,done}], reading[{id,bookId,pages}]
sessions[] id, day, category, start, end
active     { category, start, day } | null
```

## Build phases

1. Skeleton: Electron + React app, JSON storage, dark theme, navigation, `.exe` packaging.
2. Today screen + chess clock with persistence, counters, tasks, wake/bed, satisfaction.
3. Calendar + Day detail (editing past days).
4. Goals, reading library, stats.
5. Evening reminder, start with Windows, tray, long-timer check on reopen, installer.
