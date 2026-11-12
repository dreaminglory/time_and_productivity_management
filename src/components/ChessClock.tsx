import { useState } from 'react';
import { CATEGORIES, type Category } from '../lib/types';
import { useData, useNow } from '../lib/store';
import { discardActive, stopActive, toggleTimer, totalsByDay } from '../lib/logic';
import { fmtClock, fmtTime } from '../lib/dates';

/** One big button per activity. Only one runs at a time; pressing another switches over. */
export function ChessClock({ day }: { day: string }) {
  const { data, update } = useData();
  const now = useNow(1000);
  const totals = totalsByDay(data, now).get(day);
  const active = data.active;
  const [picking, setPicking] = useState(false);
  const subjects = data.settings.studySubjects;

  const press = (id: Category) => {
    // Study asks what you are studying first; pressing it again while it runs just stops it.
    if (id === 'study' && active?.category !== 'study' && subjects.length > 0) setPicking(!picking);
    else {
      setPicking(false);
      update((d) => toggleTimer(d, id, day));
    }
  };

  const startStudy = (subject: string) => {
    setPicking(false);
    update((d) => toggleTimer(d, 'study', day, subject));
  };

  return (
    <div className="clock-panel">
      <div className="clock-tiles">
        {CATEGORIES.map((c) => {
          const running = active?.category === c.id;
          const total = totals?.[c.id] ?? 0;
          return (
            <button
              key={c.id}
              className={`clock-tile ${running ? 'running' : ''}`}
              aria-label={`${c.label} clock`}
              aria-pressed={running}
              style={{ ['--tile-color' as string]: c.color }}
              onClick={() => press(c.id)}
            >
              <div className="tile-top">
                <span className="tile-icon">{c.icon}</span>
                <span className="tile-label">{c.label}</span>
                <span className="tile-state">{running ? '● running' : 'start'}</span>
              </div>
              <div className="tile-total">{fmtClock(total)}</div>
              <div className="tile-sub">
                {running ? `${active!.subject ? active!.subject + ' · ' : ''}${fmtClock(now - Date.parse(active!.start))}` : 'today'}
              </div>
            </button>
          );
        })}
      </div>
      {picking && (
        <div className="subject-picker">
          <span>🎓 What are you studying?</span>
          {subjects.map((t) => (
            <button key={t} className="btn primary" onClick={() => startStudy(t)}>
              {t}
            </button>
          ))}
          <button className="btn ghost" onClick={() => setPicking(false)}>
            Cancel
          </button>
        </div>
      )}
      <div className="clock-footer">
        {active ? (
          <>
            <span className="muted">
              Running since {fmtTime(active.start)}
              {active.subject && ` · ${active.subject}`}
              {active.day !== day && ' (on another day)'}
            </span>
            <div className="row">
              <button className="btn ghost" title="Throw this timer away without saving it" onClick={() => update((d) => discardActive(d))}>
                ✕ Discard (clicked by mistake)
              </button>
              <button className="btn danger" onClick={() => update((d) => stopActive(d))}>
                ■ Stop &amp; save
              </button>
            </div>
          </>
        ) : (
          <span className="muted">Nothing running. Tap an activity to start its clock; tapping another switches over.</span>
        )}
      </div>
    </div>
  );
}
