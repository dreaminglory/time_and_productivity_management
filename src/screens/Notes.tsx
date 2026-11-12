import { useState } from 'react';
import { useData } from '../lib/store';
import type { Note } from '../lib/types';
import { uid } from '../lib/logic';
import { fmtShort, toKey } from '../lib/dates';

/** General to-do notes that are not tied to any particular day. */
export function Notes() {
  const { data, update } = useData();
  const [text, setText] = useState('');

  const open = data.notes.filter((n) => !n.done);
  const done = data.notes.filter((n) => n.done);

  const add = () => {
    const t = text.trim();
    if (!t) return;
    update((d) => void d.notes.unshift({ id: uid(), text: t, done: false, createdAt: new Date().toISOString() }));
    setText('');
  };

  const toggle = (id: string) => update((d) => { const n = d.notes.find((x) => x.id === id)!; n.done = !n.done; });
  const remove = (id: string) => update((d) => void (d.notes = d.notes.filter((n) => n.id !== id)));

  const renderItem = (n: Note) => (
      <li key={n.id} className={n.done ? 'done' : ''}>
        <label>
          <input type="checkbox" checked={n.done} onChange={() => toggle(n.id)} />
          <span>{n.text}</span>
        </label>
        <span className="muted small">{fmtShort(toKey(new Date(n.createdAt)))}</span>
        <button className="icon-btn ghost" aria-label="Delete note" onClick={() => remove(n.id)}>
          ✕
        </button>
      </li>
  );

  return (
    <div className="screen narrow">
      <div className="screen-head">
        <h1>Notes</h1>
        <span className="muted">Not tied to any day</span>
      </div>
      <section className="card">
        <div className="row">
          <input className="text-input grow" placeholder="Add something to remember or do…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn primary" onClick={add}>
            Add
          </button>
        </div>
        <ul className="task-list">
          {open.map(renderItem)}
          {!open.length && <li className="empty">Nothing here. Add anything you need to get to eventually.</li>}
        </ul>
      </section>
      {done.length > 0 && (
        <section className="card">
          <header className="card-head">
            <h3>Done ({done.length})</h3>
            <button className="btn small" onClick={() => update((d) => void (d.notes = d.notes.filter((n) => !n.done)))}>
              Clear done
            </button>
          </header>
          <ul className="task-list">
            {done.map(renderItem)}
          </ul>
        </section>
      )}
    </div>
  );
}
