import { CATEGORIES } from '../lib/types';
import { useData, useNow } from '../lib/store';
import { stopActive, toggleTimer, totalsByDay } from '../lib/logic';
import { fmtClock, fmtTime } from '../lib/dates';

/** One big button per activity. Only one runs at a time; pressing another switches over. */
export function ChessClock({ day }: { day: string }) {
  const { data, update } = useData();
  const now = useNow(1000);
  const totals = totalsByDay(data, now).get(day);
  const active = data.active;

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
              onClick={() => update((d) => toggleTimer(d, c.id, day))}
            >
              <div className="tile-top">
                <span className="tile-icon">{c.icon}</span>
                <span className="tile-label">{c.label}</span>
                <span className="tile-state">{running ? '● running' : 'start'}</span>
              </div>
              <div className="tile-total">{fmtClock(total)}</div>
              <div className="tile-sub">
                {running ? `this session ${fmtClock(now - Date.parse(active!.start))}` : 'today'}
              </div>
            </button>
          );
        })}
      </div>
      <div className="clock-footer">
        {active ? (
          <>
            <span className="muted">
              Running since {fmtTime(active.start)}
              {active.day !== day && ' (on another day)'}
            </span>
            <button className="btn danger" onClick={() => update((d) => stopActive(d))}>
              ■ Stop
            </button>
          </>
        ) : (
          <span className="muted">Nothing running. Tap an activity to start its clock; tapping another switches over.</span>
        )}
      </div>
    </div>
  );
}
