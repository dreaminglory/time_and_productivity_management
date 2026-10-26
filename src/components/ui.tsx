import { useEffect, useState, type ReactNode } from 'react';
import { bedToMin, hhmmToMin, minToHHMM } from '../lib/dates';

export function Card({ title, icon, extra, children, className = '' }: { title: string; icon?: string; extra?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      <header className="card-head">
        <h3>
          {icon && <span className="card-icon">{icon}</span>}
          {title}
        </h3>
        {extra && <div className="card-extra">{extra}</div>}
      </header>
      {children}
    </section>
  );
}

export function Progress({ value, target, color, kind = 'min' }: { value: number; target: number; color: string; kind?: 'min' | 'max' }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const over = kind === 'max' && value > target;
  return (
    <div className="progress">
      <div className="progress-fill" style={{ width: `${pct}%`, background: over ? 'var(--bad)' : color }} />
    </div>
  );
}

export function Counter({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="counter">
      <span className="counter-label">{label}</span>
      <button className="icon-btn" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`Decrease ${label}`}>
        −
      </button>
      <span className="counter-value">{value}</span>
      <button className="icon-btn plus" onClick={() => onChange(value + 1)} aria-label={`Increase ${label}`}>
        +1
      </button>
    </div>
  );
}

/** Parses "6:30", "0630", "630", "22" into HH:MM (24h). */
export function parseTime(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  let h: number;
  let m: number;
  const colon = t.match(/^(\d{1,2})[:.](\d{1,2})$/);
  if (colon) {
    h = +colon[1];
    m = +colon[2];
  } else if (/^\d{1,4}$/.test(t)) {
    if (t.length <= 2) {
      h = +t;
      m = 0;
    } else {
      h = +t.slice(0, t.length - 2);
      m = +t.slice(-2);
    }
  } else return null;
  if (h > 23 || m > 59) return null;
  return minToHHMM(h * 60 + m);
}

/** 24-hour time field. Commits on blur / Enter; empty clears when `allowEmpty`. */
export function TimeInput({ value, onChange, allowEmpty = true, className = '' }: { value: string | null; onChange: (v: string | null) => void; allowEmpty?: boolean; className?: string }) {
  const [text, setText] = useState(value ?? '');
  useEffect(() => setText(value ?? ''), [value]);
  const commit = () => {
    if (!text.trim()) {
      if (allowEmpty) onChange(null);
      else setText(value ?? '');
      return;
    }
    const parsed = parseTime(text);
    if (parsed) {
      setText(parsed);
      if (parsed !== value) onChange(parsed);
    } else setText(value ?? '');
  };
  return (
    <input
      className={`time-input ${className}`}
      value={text}
      placeholder="--:--"
      maxLength={5}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

/** Integer field that commits on blur / Enter. */
export function NumberInput({ value, onChange, min = 0, className = '', placeholder }: { value: number | null; onChange: (v: number | null) => void; min?: number; className?: string; placeholder?: string }) {
  const [text, setText] = useState(value === null ? '' : String(value));
  useEffect(() => setText(value === null ? '' : String(value)), [value]);
  const commit = () => {
    if (!text.trim()) return onChange(null);
    const n = Math.round(Number(text));
    if (Number.isFinite(n) && n >= min) onChange(n);
    else setText(value === null ? '' : String(value));
  };
  return (
    <input
      className={`num-input ${className}`}
      inputMode="numeric"
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

/** Hours + minutes editor that stores total minutes. */
export function DurationInput({ minutes, onChange }: { minutes: number | null; onChange: (v: number | null) => void }) {
  const h = minutes === null ? null : Math.floor(minutes / 60);
  const m = minutes === null ? null : minutes % 60;
  const set = (nh: number | null, nm: number | null) => {
    if (nh === null && nm === null) return onChange(null);
    onChange((nh ?? 0) * 60 + Math.min(59, nm ?? 0));
  };
  return (
    <div className="duration-input">
      <NumberInput value={h} onChange={(v) => set(v, m)} placeholder="0" />
      <span>h</span>
      <NumberInput value={m} onChange={(v) => set(h, v)} placeholder="0" />
      <span>m</span>
    </div>
  );
}

/** Signed difference badge, e.g. "+25m late" / "10m early" / "on time". */
export function DiffBadge({ diffMin }: { diffMin: number }) {
  const abs = Math.abs(Math.round(diffMin));
  if (abs <= 5) return <span className="badge good">on time</span>;
  const txt = abs >= 60 ? `${Math.floor(abs / 60)}h ${String(abs % 60).padStart(2, '0')}m` : `${abs}m`;
  return diffMin > 0 ? <span className="badge bad">{txt} late</span> : <span className="badge good">{txt} early</span>;
}

export const clockDiff = (planned: string, actual: string, bed = false) => {
  const conv = bed ? bedToMin : hhmmToMin;
  return conv(actual) - conv(planned);
};
