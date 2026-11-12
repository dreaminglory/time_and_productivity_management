import { useState } from 'react';
import { useData, useNow } from '../lib/store';
import type { Reminder } from '../lib/types';
import { uid } from '../lib/logic';
import { addDays, fmtLong, toKey } from '../lib/dates';
import { LEAD_OPTIONS, byDateAsc, daysBetween, leadLabel, plusMonth, relativeDay } from '../lib/reminders';
import { TimeInput } from '../components/ui';

const DEFAULT_LEADS = [1, 0];
const DEFAULT_TIME = '09:00';

/** Future events with notifications a chosen number of days before and/or on the day. */
export function Reminders() {
  const { data, update } = useData();
  const now = useNow(60000);
  const today = toKey(new Date(now));

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => addDays(toKey(new Date()), 14));
  const [time, setTime] = useState(DEFAULT_TIME);
  const [leads, setLeads] = useState<number[]>(DEFAULT_LEADS);

  const upcoming = data.reminders.filter((r) => r.date >= today).sort(byDateAsc);
  const past = data.reminders.filter((r) => r.date < today).sort((a, b) => b.date.localeCompare(a.date));

  const canAdd = title.trim() !== '' && /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today && leads.length > 0;
  const add = () => {
    if (!canAdd) return;
    update((d) => void d.reminders.push({ id: uid(), title: title.trim(), date, time, leadDays: [...leads].sort((a, b) => b - a), sent: [], createdAt: new Date().toISOString() }));
    setTitle('');
  };

  const quick: [string, string][] = [
    ['Tomorrow', addDays(today, 1)],
    ['+1 week', addDays(today, 7)],
    ['+2 weeks', addDays(today, 14)],
    ['+1 month', plusMonth(today)],
  ];

  return (
    <div className="screen narrow">
      <div className="screen-head">
        <h1>Reminders</h1>
        <span className="muted">Get notified ahead of events you flag</span>
      </div>

      <section className="card">
        <header className="card-head">
          <h3>
            <span className="card-icon">＋</span>New reminder
          </h3>
        </header>
        <div className="reminder-form">
          <input className="text-input" placeholder="What is it? e.g. Databricks certification exam" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <div className="row gap wrap">
            <label className="row tight">
              <span className="muted small">Date</span>
              <input type="date" className="text-input" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <div className="chips">
              {quick.map(([label, key]) => (
                <button key={label} className={`chip ${date === key ? 'on' : ''}`} onClick={() => setDate(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {date >= today && <div className="muted small">{fmtLong(date)} · {relativeDay(date, today).toLowerCase()}</div>}
          <div>
            <div className="muted small field-label">Remind me</div>
            <LeadPicker value={leads} onChange={setLeads} />
          </div>
          <div className="row gap">
            <label className="row tight">
              <span className="muted small">Notify at</span>
              <TimeInput value={time} allowEmpty={false} onChange={(v) => v && setTime(v)} />
            </label>
            <div className="grow" />
            <button className="btn primary" disabled={!canAdd} onClick={add}>
              Add reminder
            </button>
          </div>
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <h3>
            <span className="card-icon">🔔</span>Upcoming ({upcoming.length})
          </h3>
        </header>
        <ul className="reminder-list">
          {upcoming.map((r) => (
            <ReminderItem key={r.id} r={r} today={today} />
          ))}
          {!upcoming.length && <li className="empty">No upcoming events. Add one above.</li>}
        </ul>
      </section>

      {past.length > 0 && (
        <section className="card">
          <header className="card-head">
            <h3>Past ({past.length})</h3>
            <button className="btn small" onClick={() => update((d) => void (d.reminders = d.reminders.filter((r) => r.date >= today)))}>
              Clear past
            </button>
          </header>
          <ul className="reminder-list">
            {past.map((r) => (
              <ReminderItem key={r.id} r={r} today={today} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function LeadPicker({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const toggle = (days: number) => onChange(value.includes(days) ? value.filter((d) => d !== days) : [...value, days]);
  return (
    <div className="chips">
      {LEAD_OPTIONS.map((o) => (
        <button key={o.days} className={`chip ${value.includes(o.days) ? 'on' : ''}`} onClick={() => toggle(o.days)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ReminderItem({ r, today }: { r: Reminder; today: string }) {
  const { update } = useData();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(r.title);
  const [date, setDate] = useState(r.date);
  const [time, setTime] = useState(r.time);
  const [leads, setLeads] = useState(r.leadDays);

  const isPast = r.date < today;
  const n = daysBetween(today, r.date);

  const startEdit = () => {
    setTitle(r.title);
    setDate(r.date);
    setTime(r.time);
    setLeads(r.leadDays);
    setEditing(true);
  };

  // A finished event can keep its own (past) date so it can still be renamed, but nothing can be moved into the past.
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(date) && (date >= today || date === r.date);
  const valid = title.trim() !== '' && dateOk && leads.length > 0;
  const save = () => {
    if (!valid) return;
    update((d) => {
      const x = d.reminders.find((y) => y.id === r.id);
      if (!x) return;
      // Re-arm notifications when the schedule changes; keep them when only the name changes.
      if (x.date !== date || x.time !== time) x.sent = [];
      else x.sent = x.sent.filter((l) => leads.includes(l));
      x.title = title.trim();
      x.date = date;
      x.time = time;
      x.leadDays = [...leads].sort((a, b) => b - a);
    });
    setEditing(false);
  };
  const remove = () => update((d) => void (d.reminders = d.reminders.filter((x) => x.id !== r.id)));

  if (editing) {
    return (
      <li className="reminder-item editing">
        <div className="reminder-form">
          <input
            className="text-input"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
          <div className="row gap wrap">
            <label className="row tight">
              <span className="muted small">Date</span>
              <input type="date" className="text-input" min={r.date < today ? r.date : today} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="row tight">
              <span className="muted small">Notify at</span>
              <TimeInput value={time} allowEmpty={false} onChange={(v) => v && setTime(v)} />
            </label>
          </div>
          {!dateOk && <div className="small bad-text">Pick today or a future date.</div>}
          <LeadPicker value={leads} onChange={setLeads} />
          <div className="row gap">
            <div className="grow" />
            <button className="btn ghost small" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button className="btn primary small" disabled={!valid} onClick={save}>
              Save
            </button>
          </div>
        </div>
      </li>
    );
  }

  const badge = isPast ? 'past' : n === 0 ? 'today' : n <= Math.max(0, ...r.leadDays) ? 'soon' : '';
  return (
    <li className={`reminder-item ${isPast ? 'is-past' : ''}`}>
      <div className="reminder-main">
        <div className="reminder-title">{r.title}</div>
        <div className="muted small">
          {fmtLong(r.date)}
          {!isPast && ` · ${r.leadDays.map(leadLabel).join(', ')} at ${r.time}`}
        </div>
      </div>
      <span className={`badge countdown ${badge}`}>{relativeDay(r.date, today)}</span>
      <button className="icon-btn ghost" aria-label="Edit reminder" title="Rename / edit" onClick={startEdit}>
        ✎
      </button>
      <button className="icon-btn ghost" aria-label="Delete reminder" title="Delete" onClick={remove}>
        ✕
      </button>
    </li>
  );
}
