import { useState } from 'react';
import type { AppData, Category, Day } from '../lib/types';
import { CATEGORIES, categoryInfo } from '../lib/types';
import { useData, useNow } from '../lib/store';
import { dailyGoals, ensureDay, pagesPerBook, stopActive, summarize, totalsByDay, uid, workoutsInWeek } from '../lib/logic';
import { addDays, bedToMin, fmtClock, fmtDur, fmtMin, fmtTime, fromKey, hhmmToMin, nowHHMM } from '../lib/dates';
import { emptyDay } from '../lib/defaults';
import { Card, Counter, DiffBadge, DurationInput, NumberInput, Progress, TimeInput, clockDiff } from './ui';

type Edit = (fn: (day: Day, d: AppData) => void) => void;

export function DayEditor({ date, isToday }: { date: string; isToday: boolean }) {
  const { data, update } = useData();
  const now = useNow(isToday ? 1000 : 60000);
  const totals = totalsByDay(data, now);
  const summary = summarize(data, date, totals);
  const day = data.days[date];

  const edit: Edit = (fn) => update((d) => fn(ensureDay(d, date), d));

  return (
    <div className="day-grid">
      <div className="col">
        <WakeSleepCard date={date} day={day} isToday={isToday} edit={edit} />
        <TasksCard day={day} edit={edit} />
        <ReflectionCard day={day} edit={edit} />
      </div>
      <div className="col">
        <GoalsCard date={date} />
        <ReadingCard day={day} readingMs={summary.ms.reading} edit={edit} />
        <Card title="Screen time" icon="📱" extra={<span className="muted">limit {fmtMin(data.settings.goals.screenMaxMin)}</span>}>
          <div className="row">
            <DurationInput minutes={day?.screenTimeMin ?? null} onChange={(v) => edit((dd) => void (dd.screenTimeMin = v))} />
            {day?.screenTimeMin != null && day.screenTimeMin > data.settings.goals.screenMaxMin && <span className="badge bad">over limit</span>}
          </div>
          <p className="hint">Enter it in the evening from your phone/PC screen-time stats.</p>
        </Card>
      </div>
      <div className="col">
        <WorkoutCard date={date} day={day} workoutMs={summary.ms.workout} edit={edit} />
        <Card title="Meditation" icon="🧘">
          <Counter label="Prayers" value={day?.prayers ?? 0} onChange={(v) => edit((dd) => void (dd.prayers = v))} />
          <Counter label="Breathwork" value={day?.breathwork ?? 0} onChange={(v) => edit((dd) => void (dd.breathwork = v))} />
          <div className="kv">
            <span>☀️ Sun exposure</span>
            <strong>{fmtDur(summary.ms.sun)}</strong>
          </div>
          <p className="hint">Sun time comes from the Sun clock.</p>
        </Card>
        <TimelineCard date={date} />
      </div>
    </div>
  );
}

// ---------- Start / end of day ----------

function WakeSleepCard({ date, day, isToday, edit }: { date: string; day: Day | undefined; isToday: boolean; edit: Edit }) {
  const { data, update } = useData();
  const plan = day ?? emptyDay(date, data.settings);
  const prevBed = data.days[addDays(date, -1)]?.bed;
  const sleptMin = prevBed && day?.wake ? hhmmToMin(day.wake) - (bedToMin(prevBed) - 1440) : null;
  const awakeMin = day?.wake && day.bed ? bedToMin(day.bed) - hhmmToMin(day.wake) : null;

  const goodNight = () =>
    update((d) => {
      stopActive(d);
      ensureDay(d, date).bed = nowHHMM();
    });

  return (
    <Card title="Start & end of day" icon="🌅">
      <div className="ws-grid">
        <span />
        <span className="ws-head">Planned</span>
        <span className="ws-head">Actual</span>
        <span />

        <span className="ws-label">Wake up</span>
        <TimeInput value={plan.plannedWake} onChange={(v) => edit((dd) => void (dd.plannedWake = v))} />
        <TimeInput value={plan.wake} onChange={(v) => edit((dd) => void (dd.wake = v))} />
        <span>{plan.plannedWake && plan.wake && <DiffBadge diffMin={clockDiff(plan.plannedWake, plan.wake)} />}</span>

        <span className="ws-label">Bedtime</span>
        <TimeInput value={plan.plannedBed} onChange={(v) => edit((dd) => void (dd.plannedBed = v))} />
        <TimeInput value={plan.bed} onChange={(v) => edit((dd) => void (dd.bed = v))} />
        <span>{plan.plannedBed && plan.bed && <DiffBadge diffMin={clockDiff(plan.plannedBed, plan.bed, true)} />}</span>
      </div>

      {isToday && (
        <div className="row gap">
          {!day?.wake && (
            <button className="btn primary" onClick={() => edit((dd) => void (dd.wake = nowHHMM()))}>
              ☀️ Good morning
            </button>
          )}
          {day?.wake && !day.bed && (
            <button className="btn" onClick={goodNight}>
              🌙 Good night
            </button>
          )}
        </div>
      )}
      <div className="row gap muted small">
        {sleptMin !== null && sleptMin > 0 && <span>Slept {fmtMin(sleptMin)}</span>}
        {awakeMin !== null && awakeMin > 0 && <span>Awake {fmtMin(awakeMin)}</span>}
      </div>
    </Card>
  );
}

// ---------- Tasks ----------

function TasksCard({ day, edit }: { day: Day | undefined; edit: Edit }) {
  const [title, setTitle] = useState('');
  const tasks = day?.tasks ?? [];
  const done = tasks.filter((t) => t.done).length;
  const add = () => {
    const t = title.trim();
    if (!t) return;
    edit((dd) => void dd.tasks.push({ id: uid(), title: t, done: false }));
    setTitle('');
  };
  return (
    <Card title="Activities" icon="✅" extra={tasks.length > 0 && <span className="muted">{done}/{tasks.length} done</span>}>
      <div className="row">
        <input className="text-input grow" placeholder="Add a task…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn" onClick={add}>
          Add
        </button>
      </div>
      <ul className="task-list">
        {tasks.map((t) => (
          <li key={t.id} className={t.done ? 'done' : ''}>
            <label>
              <input type="checkbox" checked={t.done} onChange={() => edit((dd) => void (dd.tasks.find((x) => x.id === t.id)!.done = !t.done))} />
              <span>{t.title}</span>
            </label>
            <button className="icon-btn ghost" aria-label="Delete task" onClick={() => edit((dd) => void (dd.tasks = dd.tasks.filter((x) => x.id !== t.id)))}>
              ✕
            </button>
          </li>
        ))}
        {!tasks.length && <li className="empty">No tasks yet.</li>}
      </ul>
    </Card>
  );
}

// ---------- Satisfaction ----------

function ReflectionCard({ day, edit }: { day: Day | undefined; edit: Edit }) {
  const score = day?.satisfaction ?? null;
  return (
    <Card title="Satisfaction" icon="⭐" extra={score !== null && <span className="score-big">{score}/10</span>}>
      <div className="score-row">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            className={`score-btn ${score === n ? 'selected' : ''}`}
            style={{ ['--score-color' as string]: scoreColor(n) }}
            onClick={() => edit((dd) => void (dd.satisfaction = dd.satisfaction === n ? null : n))}
          >
            {n}
          </button>
        ))}
      </div>
      <textarea
        className="note"
        placeholder="How did today go? What went well, what didn't…"
        value={day?.note ?? ''}
        onChange={(e) => edit((dd) => void (dd.note = e.target.value))}
      />
    </Card>
  );
}

export const scoreColor = (n: number) => `hsl(${Math.round(((n - 1) / 9) * 125)}, 65%, 52%)`;

// ---------- Goals ----------

function GoalsCard({ date }: { date: string }) {
  const { data } = useData();
  const now = useNow(5000);
  const totals = totalsByDay(data, now);
  const goals = dailyGoals(data, summarize(data, date, totals));
  const met = goals.filter((g) => g.met).length;
  const weekWorkouts = workoutsInWeek(data, date, totals);
  const wTarget = data.settings.goals.workoutPerWeek;
  return (
    <Card title="Goals" icon="🎯" extra={<span className={met === goals.length ? 'badge good' : 'muted'}>{met}/{goals.length} met</span>}>
      <div className="goal-list">
        {goals.map((g) => (
          <div key={g.key} className="goal">
            <div className="goal-top">
              <span>
                {g.met && '✓ '}
                {g.label}
              </span>
              <span className="muted">
                {g.format(g.value)} {g.kind === 'max' ? 'of max' : '/'} {g.format(g.target)}
              </span>
            </div>
            <Progress value={g.value} target={g.target} color={g.color} kind={g.kind} />
          </div>
        ))}
        {wTarget > 0 && (
          <div className="goal">
            <div className="goal-top">
              <span>
                {weekWorkouts >= wTarget && '✓ '}Workouts this week
              </span>
              <span className="muted">
                {weekWorkouts} / {wTarget}
              </span>
            </div>
            <Progress value={weekWorkouts} target={wTarget} color="var(--c-workout)" />
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------- Reading ----------

function ReadingCard({ day, readingMs, edit }: { day: Day | undefined; readingMs: number; edit: Edit }) {
  const { data } = useData();
  const activeBooks = data.books.filter((b) => !b.finished);
  // undefined = not picked yet → default to the first book being read
  const [picked, setBookId] = useState<string | undefined>(undefined);
  const bookId = picked !== undefined && (picked === '' || activeBooks.some((b) => b.id === picked)) ? picked : (activeBooks[0]?.id ?? '');
  const [pages, setPages] = useState<number | null>(null);
  const perBook = pagesPerBook(data);
  const logs = day?.reading ?? [];
  const total = logs.reduce((s, r) => s + r.pages, 0);
  const bookTitle = (id: string | null) => data.books.find((b) => b.id === id)?.title ?? 'Other reading';

  const add = () => {
    if (!pages) return;
    edit((dd) => void dd.reading.push({ id: uid(), bookId: bookId || null, pages }));
    setPages(null);
  };

  return (
    <Card title="Reading" icon="📖" extra={<span className="muted">{total} pages · {fmtDur(readingMs)}</span>}>
      <div className="row">
        <select className="select grow" value={bookId} onChange={(e) => setBookId(e.target.value)}>
          {activeBooks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title}
            </option>
          ))}
          <option value="">Other reading</option>
        </select>
        <NumberInput value={pages} onChange={setPages} min={1} placeholder="pages" className="w-sm" />
        <button className="btn" onClick={add}>
          Add
        </button>
      </div>
      <ul className="log-list">
        {logs.map((r) => {
          const book = data.books.find((b) => b.id === r.bookId);
          return (
            <li key={r.id}>
              <span className="grow">{bookTitle(r.bookId)}</span>
              <span>{r.pages} p</span>
              {book && (
                <span className="muted small">
                  {perBook.get(book.id) ?? 0}/{book.totalPages}
                </span>
              )}
              <button className="icon-btn ghost" aria-label="Delete" onClick={() => edit((dd) => void (dd.reading = dd.reading.filter((x) => x.id !== r.id)))}>
                ✕
              </button>
            </li>
          );
        })}
      </ul>
      {!data.books.length && <p className="hint">Add the books you're reading in the Books tab to track progress.</p>}
    </Card>
  );
}

// ---------- Workout ----------

function WorkoutCard({ date, day, workoutMs, edit }: { date: string; day: Day | undefined; workoutMs: number; edit: Edit }) {
  const { data, update } = useData();
  const [newType, setNewType] = useState('');
  const selected = day?.workoutTypes ?? [];
  const done = selected.length > 0 || workoutMs > 0;

  const toggle = (t: string) =>
    edit((dd) => {
      dd.workoutTypes = dd.workoutTypes.includes(t) ? dd.workoutTypes.filter((x) => x !== t) : [...dd.workoutTypes, t];
    });

  const addType = () => {
    const t = newType.trim();
    if (!t) return;
    update((d) => {
      if (!d.settings.workoutTypes.includes(t)) d.settings.workoutTypes.push(t);
      const dd = ensureDay(d, date);
      if (!dd.workoutTypes.includes(t)) dd.workoutTypes.push(t);
    });
    setNewType('');
  };

  // Types used on this day but since removed from settings still show up.
  const types = [...data.settings.workoutTypes, ...selected.filter((t) => !data.settings.workoutTypes.includes(t))];

  return (
    <Card title="Workout" icon="🏋️" extra={done ? <span className="badge good">done · {fmtDur(workoutMs)}</span> : <span className="muted">not yet</span>}>
      <div className="chips">
        {types.map((t) => (
          <button key={t} className={`chip ${selected.includes(t) ? 'on' : ''}`} onClick={() => toggle(t)}>
            {t}
          </button>
        ))}
      </div>
      <div className="row">
        <input className="text-input grow" placeholder="Other type…" value={newType} onChange={(e) => setNewType(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addType()} />
        <button className="btn" onClick={addType}>
          Add
        </button>
      </div>
    </Card>
  );
}

// ---------- Timeline of clock sessions ----------

/** Builds an ISO timestamp for HH:MM on logical day `date` (times before 05:00 are after midnight). */
function atTime(date: string, hhmm: string) {
  const d = fromKey(date);
  const min = hhmmToMin(hhmm);
  if (min < 5 * 60) d.setDate(d.getDate() + 1);
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  return d.toISOString();
}

function TimelineCard({ date }: { date: string }) {
  const { data, update } = useData();
  const now = useNow(1000);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{ cat: Category; from: string | null; to: string | null }>({ cat: 'work', from: null, to: null });

  const sessions = data.sessions.filter((s) => s.day === date).sort((a, b) => a.start.localeCompare(b.start));
  const active = data.active?.day === date ? data.active : null;

  const setTimes = (id: string, from: string | null, to: string | null) =>
    update((d) => {
      const s = d.sessions.find((x) => x.id === id)!;
      if (from) s.start = atTime(date, from);
      if (to) s.end = atTime(date, to);
      if (s.end < s.start) s.end = new Date(Date.parse(s.end) + 86400000).toISOString();
    });

  const addSession = () => {
    if (!form.from || !form.to) return;
    const start = atTime(date, form.from);
    let end = atTime(date, form.to);
    if (end <= start) end = new Date(Date.parse(end) + 86400000).toISOString();
    update((d) => {
      ensureDay(d, date);
      d.sessions.push({ id: uid(), day: date, category: form.cat, start, end });
    });
    setForm({ ...form, from: null, to: null });
    setAdding(false);
  };

  return (
    <Card
      title="Timeline"
      icon="🕒"
      extra={
        <button className="btn small" onClick={() => setAdding(!adding)}>
          {adding ? 'Cancel' : '+ Add time'}
        </button>
      }
    >
      {adding && (
        <div className="add-session">
          <select className="select" value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value as Category })}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <TimeInput value={form.from} onChange={(v) => setForm((f) => ({ ...f, from: v }))} />
          <span>→</span>
          <TimeInput value={form.to} onChange={(v) => setForm((f) => ({ ...f, to: v }))} />
          <button className="btn primary small" onClick={addSession}>
            Save
          </button>
        </div>
      )}
      <ul className="session-list">
        {sessions.map((s) => {
          const c = categoryInfo(s.category);
          const dur = Date.parse(s.end) - Date.parse(s.start);
          return (
            <li key={s.id}>
              <span className="dot" style={{ background: c.color }} />
              <span className="sess-cat">{c.label}</span>
              {editing === s.id ? (
                <span className="row tight">
                  <TimeInput value={fmtTime(s.start)} allowEmpty={false} onChange={(v) => setTimes(s.id, v, null)} />
                  <span>→</span>
                  <TimeInput value={fmtTime(s.end)} allowEmpty={false} onChange={(v) => setTimes(s.id, null, v)} />
                  <button className="btn small" onClick={() => setEditing(null)}>
                    Done
                  </button>
                </span>
              ) : (
                <>
                  <span className="muted grow">
                    {fmtTime(s.start)}–{fmtTime(s.end)}
                  </span>
                  <span>{fmtDur(dur)}</span>
                  <button className="icon-btn ghost" aria-label="Edit" onClick={() => setEditing(s.id)}>
                    ✎
                  </button>
                  <button className="icon-btn ghost" aria-label="Delete" onClick={() => update((d) => void (d.sessions = d.sessions.filter((x) => x.id !== s.id)))}>
                    ✕
                  </button>
                </>
              )}
            </li>
          );
        })}
        {active && (
          <li className="live">
            <span className="dot pulse" style={{ background: categoryInfo(active.category).color }} />
            <span className="sess-cat">{categoryInfo(active.category).label}</span>
            <span className="muted grow">{fmtTime(active.start)}–now</span>
            <span>{fmtClock(now - Date.parse(active.start))}</span>
          </li>
        )}
        {!sessions.length && !active && <li className="empty">No clock time recorded.</li>}
      </ul>
    </Card>
  );
}
