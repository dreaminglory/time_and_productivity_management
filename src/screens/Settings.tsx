import { useEffect, useState } from 'react';
import { api, useData } from '../lib/store';
import type { Goals } from '../lib/types';
import { DEFAULT_WORKOUT_TYPES } from '../lib/defaults';
import { DurationInput, NumberInput, TimeInput } from '../components/ui';

export function Settings() {
  const { data, update } = useData();
  const s = data.settings;
  const [newType, setNewType] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [path, setPath] = useState('');
  useEffect(() => void api.dataPath().then(setPath), []);

  const setGoal = (k: keyof Goals, v: number | null) => update((d) => void (d.settings.goals[k] = v ?? 0));

  const addType = () => {
    const t = newType.trim();
    if (t && !s.workoutTypes.includes(t)) update((d) => void d.settings.workoutTypes.push(t));
    setNewType('');
  };

  const addSubject = () => {
    const t = newSubject.trim();
    if (t && !s.studySubjects.includes(t)) update((d) => void d.settings.studySubjects.push(t));
    setNewSubject('');
  };

  return (
    <div className="screen narrow">
      <div className="screen-head">
        <h1>Settings</h1>
      </div>

      <section className="card">
        <header className="card-head">
          <h3>🎯 Daily goals</h3>
          <span className="muted small">Set a goal to 0 to turn it off</span>
        </header>
        <div className="form-grid">
          <label>Work</label>
          <DurationInput minutes={s.goals.workMin} onChange={(v) => setGoal('workMin', v)} />
          <label>Study</label>
          <DurationInput minutes={s.goals.studyMin} onChange={(v) => setGoal('studyMin', v)} />
          <label>Reading (pages)</label>
          <NumberInput value={s.goals.readingPages} onChange={(v) => setGoal('readingPages', v)} />
          <label>Prayers</label>
          <NumberInput value={s.goals.prayers} onChange={(v) => setGoal('prayers', v)} />
          <label>Breathwork</label>
          <NumberInput value={s.goals.breathwork} onChange={(v) => setGoal('breathwork', v)} />
          <label>Meditation</label>
          <DurationInput minutes={s.goals.meditationMin} onChange={(v) => setGoal('meditationMin', v)} />
          <label>Sun exposure</label>
          <DurationInput minutes={s.goals.sunMin} onChange={(v) => setGoal('sunMin', v)} />
          <label>Workouts per week</label>
          <NumberInput value={s.goals.workoutPerWeek} onChange={(v) => setGoal('workoutPerWeek', v)} />
          <label>Screen time (max)</label>
          <DurationInput minutes={s.goals.screenMaxMin} onChange={(v) => setGoal('screenMaxMin', v)} />
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <h3>🌅 Planned wake-up & bedtime</h3>
          <span className="muted small">Applies to new days</span>
        </header>
        <div className="form-grid four">
          <span />
          <span className="ws-head">Wake up</span>
          <span className="ws-head">Bedtime</span>
          <span />
          <label>Mon – Fri</label>
          <TimeInput value={s.weekday.wake} allowEmpty={false} onChange={(v) => update((d) => void (d.settings.weekday.wake = v!))} />
          <TimeInput value={s.weekday.bed} allowEmpty={false} onChange={(v) => update((d) => void (d.settings.weekday.bed = v!))} />
          <span />
          <label>Sat – Sun</label>
          <TimeInput value={s.weekend.wake} allowEmpty={false} onChange={(v) => update((d) => void (d.settings.weekend.wake = v!))} />
          <TimeInput value={s.weekend.bed} allowEmpty={false} onChange={(v) => update((d) => void (d.settings.weekend.bed = v!))} />
          <span />
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <h3>🎓 Study subjects</h3>
        </header>
        <div className="chips">
          {s.studySubjects.map((t) => (
            <span key={t} className="chip on removable">
              {t}
              <button aria-label={`Remove ${t}`} onClick={() => update((d) => void (d.settings.studySubjects = d.settings.studySubjects.filter((x) => x !== t)))}>
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="row">
          <input className="text-input grow" placeholder="New study subject…" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSubject()} />
          <button className="btn" onClick={addSubject}>
            Add
          </button>
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <h3>🏋️ Workout types</h3>
          <button className="btn small" onClick={() => update((d) => void (d.settings.workoutTypes = [...new Set([...d.settings.workoutTypes, ...DEFAULT_WORKOUT_TYPES])]))}>
            Restore defaults
          </button>
        </header>
        <div className="chips">
          {s.workoutTypes.map((t) => (
            <span key={t} className="chip on removable">
              {t}
              <button aria-label={`Remove ${t}`} onClick={() => update((d) => void (d.settings.workoutTypes = d.settings.workoutTypes.filter((x) => x !== t)))}>
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="row">
          <input className="text-input grow" placeholder="New workout type…" value={newType} onChange={(e) => setNewType(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addType()} />
          <button className="btn" onClick={addType}>
            Add
          </button>
        </div>
      </section>

      <section className="card">
        <header className="card-head">
          <h3>🔔 App behaviour</h3>
        </header>
        <div className="form-grid">
          <label>Evening check-in reminder</label>
          <TimeInput value={s.reminderTime} allowEmpty={false} onChange={(v) => update((d) => void (d.settings.reminderTime = v!))} />
          <label>Ask about a timer left running longer than</label>
          <div className="row tight">
            <NumberInput value={s.longTimerHours} min={1} onChange={(v) => update((d) => void (d.settings.longTimerHours = v ?? 3))} className="w-sm" />
            <span>hours</span>
          </div>
          <label>Start with Windows</label>
          <Toggle on={s.startWithWindows} onChange={(v) => update((d) => void (d.settings.startWithWindows = v))} />
          <label>Closing the window keeps the app in the tray</label>
          <Toggle on={s.closeToTray} onChange={(v) => update((d) => void (d.settings.closeToTray = v))} />
        </div>
        <p className="hint">The evening reminder can only fire while the app is running, so keeping it in the tray is recommended.</p>
      </section>

      <section className="card">
        <header className="card-head">
          <h3>💾 Data</h3>
        </header>
        <p className="muted small mono">{path}</p>
        <button className="btn" onClick={() => api.openDataFolder()}>
          Open data folder
        </button>
      </section>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className={`toggle ${on ? 'on' : ''}`} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}
