import { useState } from 'react';
import { useData, useNow } from '../lib/store';
import { goalScore, logicalToday, summarize, totalsByDay, type DaySummary } from '../lib/logic';
import { WEEKDAY_HEADERS, addDays, addMonths, fmtDur, fmtMin, fmtMonth, fmtShort, fromKey, monthGrid, weekDays, weekdayName } from '../lib/dates';
import { scoreColor } from '../components/DayEditor';

type Mode = 'month' | 'week';
type Colour = 'none' | 'satisfaction' | 'goals';

export function Calendar({ cursor, setCursor, onOpen }: { cursor: string; setCursor: (k: string) => void; onOpen: (date: string) => void }) {
  const { data } = useData();
  const now = useNow(60000);
  const [mode, setMode] = useState<Mode>('month');
  const [colour, setColour] = useState<Colour>('satisfaction');
  const today = logicalToday(data, new Date(now));
  const totals = totalsByDay(data, now);
  const eventsByDay = new Map<string, string[]>();
  for (const r of data.reminders) eventsByDay.set(r.date, [...(eventsByDay.get(r.date) ?? []), r.title]);
  const events = (k: string) => eventsByDay.get(k) ?? [];

  const tint = (s: DaySummary): string | undefined => {
    if (colour === 'satisfaction' && s.satisfaction !== null) return scoreColor(s.satisfaction);
    if (colour === 'goals') {
      const g = goalScore(data, s);
      if (g !== null) return `hsl(${Math.round(g * 125)}, 65%, 52%)`;
    }
    return undefined;
  };

  const step = (n: number) => setCursor(mode === 'month' ? addMonths(cursor, n) : addDays(cursor, 7 * n));
  const days = mode === 'month' ? monthGrid(cursor) : weekDays(cursor);
  const title = mode === 'month' ? fmtMonth(cursor) : `${fmtShort(days[0])} – ${fmtShort(days[6])} ${fromKey(days[6]).getFullYear()}`;
  const month = fromKey(cursor).getMonth();

  return (
    <div className="screen">
      <div className="screen-head">
        <div className="row gap">
          <button className="icon-btn" onClick={() => step(-1)} aria-label="Previous">
            ‹
          </button>
          <h1 className="cal-title">{title}</h1>
          <button className="icon-btn" onClick={() => step(1)} aria-label="Next">
            ›
          </button>
          <button className="btn small" onClick={() => setCursor(today)}>
            Today
          </button>
        </div>
        <div className="row gap">
          <div className="seg">
            {(['month', 'week'] as Mode[]).map((m) => (
              <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
                {m === 'month' ? 'Month' : 'Week'}
              </button>
            ))}
          </div>
          <label className="row tight muted small">
            Colour by
            <select className="select" value={colour} onChange={(e) => setColour(e.target.value as Colour)}>
              <option value="satisfaction">Satisfaction</option>
              <option value="goals">Goals met</option>
              <option value="none">Nothing</option>
            </select>
          </label>
        </div>
      </div>

      {mode === 'month' ? (
        <div className="month">
          {WEEKDAY_HEADERS.map((h) => (
            <div key={h} className="month-head">
              {h}
            </div>
          ))}
          {days.map((k) => {
            const s = summarize(data, k, totals);
            const t = tint(s);
            const future = k > today;
            return (
              <button
                key={k}
                className={`month-cell ${fromKey(k).getMonth() !== month ? 'other' : ''} ${k === today ? 'today' : ''} ${future ? 'future' : ''}`}
                style={t ? { ['--tint' as string]: t } : undefined}
                disabled={future}
                onClick={() => onOpen(k)}
              >
                <div className="cell-top">
                  <span className="cell-date">{fromKey(k).getDate()}</span>
                  {events(k).length > 0 && (
                    <span className="cell-event" title={events(k).join(', ')}>
                      🔔
                    </span>
                  )}
                  {s.satisfaction !== null && <span className="cell-score">{s.satisfaction}</span>}
                </div>
                {s.hasData && <CellLines s={s} />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="week">
          {days.map((k) => {
            const s = summarize(data, k, totals);
            const t = tint(s);
            const future = k > today;
            const day = data.days[k];
            return (
              <button
                key={k}
                className={`week-col ${k === today ? 'today' : ''} ${future ? 'future' : ''}`}
                style={t ? { ['--tint' as string]: t } : undefined}
                disabled={future}
                onClick={() => onOpen(k)}
              >
                <div className="week-head">
                  <span>{weekdayName(k)}</span>
                  <strong>{fromKey(k).getDate()}</strong>
                </div>
                {events(k).map((t, i) => (
                  <div key={i} className="week-event">
                    🔔 {t}
                  </div>
                ))}
                {s.satisfaction !== null && <div className="week-score">⭐ {s.satisfaction}/10</div>}
                {(s.wake || s.bed) && (
                  <div className="week-line muted">
                    {s.wake ?? '--:--'} → {s.bed ?? '--:--'}
                  </div>
                )}
                <CellLines s={s} full />
                {day && day.tasks.length > 0 && (
                  <ul className="week-tasks">
                    {day.tasks.map((t) => (
                      <li key={t.id} className={t.done ? 'done' : ''}>
                        {t.done ? '✓' : '○'} {t.title}
                      </li>
                    ))}
                  </ul>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CellLines({ s, full = false }: { s: DaySummary; full?: boolean }) {
  const lines: [string, string, string][] = [];
  if (s.ms.work >= 60000) lines.push(['var(--c-work)', '💼', fmtDur(s.ms.work)]);
  if (s.ms.study >= 60000) lines.push(['var(--c-study)', '🎓', fmtDur(s.ms.study)]);
  if (s.pages) lines.push(['var(--c-reading)', '📖', `${s.pages} p`]);
  if (s.workedOut) lines.push(['var(--c-workout)', '🏋️', full && s.workoutTypes.length ? s.workoutTypes.join(', ') : s.ms.workout >= 60000 ? fmtDur(s.ms.workout) : '✓']);
  if (full && s.ms.meditation >= 60000) lines.push(['var(--c-med)', '🧘', `${fmtDur(s.ms.meditation)} meditation`]);
  if (full && s.ms.sun >= 60000) lines.push(['var(--c-sun)', '☀️', fmtDur(s.ms.sun)]);
  if (full && (s.prayers || s.breathwork)) lines.push(['var(--c-med)', '🧘', `${s.prayers} prayers · ${s.breathwork} breath`]);
  if (full && s.screenTimeMin !== null) lines.push(['var(--c-screen)', '📱', fmtMin(s.screenTimeMin)]);
  if (!full && s.tasksTotal) lines.push(['var(--text-2)', '✅', `${s.tasksDone}/${s.tasksTotal}`]);
  return (
    <div className="cell-lines">
      {lines.map(([color, icon, text]) => (
        <div key={icon} className="cell-line" style={{ color }}>
          <span>{icon}</span>
          <span>{text}</span>
        </div>
      ))}
    </div>
  );
}
