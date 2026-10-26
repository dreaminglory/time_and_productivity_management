import { useEffect, useRef, useState } from 'react';
import { api, useData, useNow } from './lib/store';
import { logicalToday, stopActive, summarize, totalsByDay } from './lib/logic';
import { categoryInfo } from './lib/types';
import { addDays, fmtClock, fmtDur, fmtLong, fmtTime, nowHHMM, toKey, toLocalInput } from './lib/dates';
import { ChessClock } from './components/ChessClock';
import { DayEditor } from './components/DayEditor';
import { Calendar } from './screens/Calendar';
import { Stats } from './screens/Stats';
import { Books } from './screens/Books';
import { Settings } from './screens/Settings';

type View = { name: 'today' } | { name: 'calendar' } | { name: 'day'; date: string } | { name: 'stats' } | { name: 'books' } | { name: 'settings' };

const NAV: { name: View['name']; label: string; icon: string }[] = [
  { name: 'today', label: 'Today', icon: '◉' },
  { name: 'calendar', label: 'Calendar', icon: '▦' },
  { name: 'stats', label: 'Stats', icon: '▤' },
  { name: 'books', label: 'Books', icon: '❏' },
  { name: 'settings', label: 'Settings', icon: '⚙' },
];

export function App() {
  const { data, update } = useData();
  const now = useNow(1000);
  const [view, setView] = useState<View>({ name: 'today' });
  const [calCursor, setCalCursor] = useState(() => toKey(new Date()));
  const today = logicalToday(data, new Date(now));

  useEffect(() => api.onNavigate(() => setView({ name: 'today' })), []);

  useEveningReminder();
  useTrayStatus();

  const openDay = (date: string) => setView(date === today ? { name: 'today' } : { name: 'day', date });
  const active = data.active;
  const navName = view.name === 'day' ? 'calendar' : view.name;

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="brand">
          <img src="./icon.png" alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <span>Day Tracker</span>
        </div>
        {NAV.map((n) => (
          <button key={n.name} className={`nav-item ${navName === n.name ? 'on' : ''}`} onClick={() => setView({ name: n.name } as View)}>
            <span className="nav-icon">{n.icon}</span>
            {n.label}
          </button>
        ))}
        <div className="grow" />
        {active && (
          <div className="running-pill" style={{ ['--tile-color' as string]: categoryInfo(active.category).color }}>
            <div className="small muted">Running</div>
            <div className="running-name">
              {categoryInfo(active.category).icon} {categoryInfo(active.category).label}
            </div>
            <div className="running-time">{fmtClock(now - Date.parse(active.start))}</div>
            <button className="btn danger small" onClick={() => update((d) => stopActive(d))}>
              ■ Stop
            </button>
          </div>
        )}
      </nav>

      <main className="content">
        {view.name === 'today' && (
          <div className="screen">
            <div className="screen-head">
              <div>
                <div className="eyebrow">Today</div>
                <h1>{fmtLong(today)}</h1>
              </div>
            </div>
            <ChessClock day={today} />
            <DayEditor key={today} date={today} isToday />
          </div>
        )}
        {view.name === 'day' && (
          <div className="screen">
            <div className="screen-head">
              <div className="row gap">
                <button className="btn small" onClick={() => setView({ name: 'calendar' })}>
                  ‹ Calendar
                </button>
                <button className="icon-btn" aria-label="Previous day" onClick={() => openDay(addDays(view.date, -1))}>
                  ‹
                </button>
                <h1>{fmtLong(view.date)}</h1>
                <button className="icon-btn" aria-label="Next day" disabled={view.date >= today} onClick={() => openDay(addDays(view.date, 1))}>
                  ›
                </button>
              </div>
            </div>
            <DayEditor key={view.date} date={view.date} isToday={false} />
          </div>
        )}
        {view.name === 'calendar' && <Calendar cursor={calCursor} setCursor={setCalCursor} onOpen={openDay} />}
        {view.name === 'stats' && <Stats />}
        {view.name === 'books' && <Books />}
        {view.name === 'settings' && <Settings />}
      </main>

      <LongTimerCheck />
    </div>
  );
}

/** On launch / wake from sleep: if a timer has run suspiciously long, ask what really happened. */
function LongTimerCheck() {
  const { data, update } = useData();
  const [checkAt, setCheckAt] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [stopAt, setStopAt] = useState('');

  useEffect(() => api.onResume(() => setCheckAt(Date.now())), []);

  const active = data.active;
  const limitMs = data.settings.longTimerHours * 3600000;
  const show = !!active && dismissed !== active.start && checkAt - Date.parse(active.start) > limitMs;

  useEffect(() => {
    if (show && active) setStopAt(toLocalInput(new Date(Date.parse(active.start) + 3600000).toISOString()));
  }, [show, active?.start]);

  if (!show || !active) return null;
  const c = categoryInfo(active.category);
  const ranFor = Date.now() - Date.parse(active.start);
  const stopAtMs = Date.parse(stopAt);
  const validStop = Number.isFinite(stopAtMs) && stopAtMs > Date.parse(active.start) && stopAtMs <= Date.now();

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>
          {c.icon} {c.label} is still running
        </h2>
        <p>
          It started at <strong>{fmtTime(active.start)}</strong> and has been running for <strong>{fmtDur(ranFor)}</strong>. Did you forget to stop it?
        </p>
        <div className="modal-actions column">
          <div className="row gap">
            <span>It actually stopped at</span>
            <input type="datetime-local" className="text-input" value={stopAt} onChange={(e) => setStopAt(e.target.value)} />
            <button className="btn primary" disabled={!validStop} onClick={() => update((d) => stopActive(d, new Date(stopAtMs)))}>
              Save
            </button>
          </div>
          <div className="row gap">
            <button className="btn" onClick={() => update((d) => stopActive(d))}>
              Stop it now
            </button>
            <button className="btn ghost" onClick={() => setDismissed(active.start)}>
              Keep running
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Windows notification at the configured time, listing what is still missing for the day. */
function useEveningReminder() {
  const { data, update } = useData();
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    const check = () => {
      const d = ref.current;
      const now = new Date();
      const cal = toKey(now);
      if (nowHHMM(now) < d.settings.reminderTime || d.meta.lastReminder === cal) return;
      const date = logicalToday(d, now);
      const s = summarize(d, date, totalsByDay(d, now.getTime()));
      const missing: string[] = [];
      if (s.satisfaction === null) missing.push('satisfaction score');
      if (!s.pages) missing.push('pages read');
      if (s.screenTimeMin === null) missing.push('screen time');
      if (!s.prayers) missing.push('prayers');
      if (!s.breathwork) missing.push('breathwork');
      const open = s.tasksTotal - s.tasksDone;
      let body = missing.length ? `Still to fill in: ${missing.join(', ')}.` : 'Everything is filled in. Nice work!';
      if (open > 0) body += ` ${open} task${open > 1 ? 's' : ''} still open.`;
      api.notify('Evening check-in', body);
      update((dd) => void (dd.meta.lastReminder = cal));
    };
    check();
    const id = window.setInterval(check, 30000);
    return () => window.clearInterval(id);
  }, [update]);
}

/** Shows the running timer in the tray tooltip. */
function useTrayStatus() {
  const { data } = useData();
  const now = useNow(30000);
  const active = data.active;
  const text = active ? `${categoryInfo(active.category).label} running ${fmtDur(now - Date.parse(active.start))}` : '';
  useEffect(() => void api.setStatus(text), [text]);
}
