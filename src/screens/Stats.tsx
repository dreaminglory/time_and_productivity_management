import { useState } from 'react';
import { useData, useNow } from '../lib/store';
import { goalScore, logicalToday, summarize, totalsByDay, type DaySummary } from '../lib/logic';
import type { Goals } from '../lib/types';
import { addDays, addMonths, bedToMin, fmtDur, fmtMin, fmtMonth, fmtShort, fromKey, hhmmToMin, minToHHMM, monthDays, weekDays, weekStart, weekdayName } from '../lib/dates';
import { BarChart, type Bar } from '../components/BarChart';

type Period = 'week' | 'month';

interface Metric {
  id: string;
  label: string;
  color: string;
  value: (s: DaySummary) => number | null;
  agg: 'sum' | 'avg';
  format: (v: number) => string;
  goal?: (g: Goals) => number;
}

const hours = (v: number) => fmtMin(Math.round(v * 60));
const mins = (v: number) => fmtMin(Math.round(v));
const count = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

const METRICS: Metric[] = [
  { id: 'work', label: 'Work', color: 'var(--c-work)', value: (s) => s.ms.work / 3600000, agg: 'sum', format: hours, goal: (g) => g.workMin / 60 },
  { id: 'study', label: 'Study', color: 'var(--c-study)', value: (s) => s.ms.study / 3600000, agg: 'sum', format: hours, goal: (g) => g.studyMin / 60 },
  { id: 'pages', label: 'Pages read', color: 'var(--c-reading)', value: (s) => s.pages, agg: 'sum', format: count, goal: (g) => g.readingPages },
  { id: 'readingTime', label: 'Reading time', color: 'var(--c-reading)', value: (s) => s.ms.reading / 60000, agg: 'sum', format: mins },
  { id: 'workout', label: 'Workout time', color: 'var(--c-workout)', value: (s) => s.ms.workout / 60000, agg: 'sum', format: mins },
  { id: 'sun', label: 'Sun', color: 'var(--c-sun)', value: (s) => s.ms.sun / 60000, agg: 'sum', format: mins, goal: (g) => g.sunMin },
  { id: 'prayers', label: 'Prayers', color: 'var(--c-med)', value: (s) => s.prayers, agg: 'sum', format: count, goal: (g) => g.prayers },
  { id: 'breathwork', label: 'Breathwork', color: 'var(--c-med)', value: (s) => s.breathwork, agg: 'sum', format: count, goal: (g) => g.breathwork },
  { id: 'satisfaction', label: 'Satisfaction', color: 'var(--c-work)', value: (s) => s.satisfaction, agg: 'avg', format: count },
  { id: 'screen', label: 'Screen time', color: 'var(--c-screen)', value: (s) => (s.screenTimeMin === null ? null : s.screenTimeMin / 60), agg: 'avg', format: hours, goal: (g) => g.screenMaxMin / 60 },
];

const aggregate = (m: Metric, sums: DaySummary[]) => {
  const vals = sums.map(m.value).filter((v): v is number => v !== null);
  if (m.agg === 'sum') return vals.reduce((a, b) => a + b, 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};

export function Stats() {
  const { data } = useData();
  const now = useNow(60000);
  const today = logicalToday(data, new Date(now));
  const [period, setPeriod] = useState<Period>('week');
  const [cursor, setCursor] = useState(today);
  const [metricId, setMetricId] = useState('work');
  const metric = METRICS.find((m) => m.id === metricId)!;
  const totals = totalsByDay(data, now);

  const periodDays = (key: string) => (period === 'week' ? weekDays(key) : monthDays(key));
  const days = periodDays(cursor);
  const past = days.filter((d) => d <= today);
  const sums = past.map((d) => summarize(data, d, totals));
  const step = (n: number) => setCursor(period === 'week' ? addDays(cursor, 7 * n) : addMonths(cursor, n));
  const title = period === 'week' ? `${fmtShort(days[0])} – ${fmtShort(days[6])} ${fromKey(days[6]).getFullYear()}` : fmtMonth(cursor);

  // ----- KPIs -----
  const sum = (f: (s: DaySummary) => number) => sums.reduce((a, s) => a + f(s), 0);
  const avgOf = (vals: (number | null)[]) => {
    const v = vals.filter((x): x is number => x !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const logged = sums.filter((s) => s.hasData);
  const nLogged = Math.max(1, logged.length);
  const avgSat = avgOf(sums.map((s) => s.satisfaction));
  const avgScreen = avgOf(sums.map((s) => s.screenTimeMin));
  const avgWake = avgOf(sums.map((s) => (s.wake ? hhmmToMin(s.wake) : null)));
  const avgBed = avgOf(sums.map((s) => (s.bed ? bedToMin(s.bed) : null)));
  const allGoalDays = sums.filter((s) => goalScore(data, s) === 1).length;
  const tasksDone = sum((s) => s.tasksDone);
  const tasksTotal = sum((s) => s.tasksTotal);

  const kpis: [string, string, string?][] = [
    ['💼 Work', fmtDur(sum((s) => s.ms.work)), `${fmtDur(sum((s) => s.ms.work) / nLogged)} / day`],
    ['🎓 Study', fmtDur(sum((s) => s.ms.study)), `${fmtDur(sum((s) => s.ms.study) / nLogged)} / day`],
    ['📖 Pages', String(sum((s) => s.pages)), `${fmtDur(sum((s) => s.ms.reading))} reading`],
    ['🏋️ Workouts', `${sums.filter((s) => s.workedOut).length} days`, fmtDur(sum((s) => s.ms.workout))],
    ['☀️ Sun', fmtDur(sum((s) => s.ms.sun)), undefined],
    ['🙏 Prayers', String(sum((s) => s.prayers)), `${sum((s) => s.breathwork)} breathwork`],
    ['⭐ Satisfaction', avgSat === null ? '—' : `${avgSat.toFixed(1)}/10`, 'average'],
    ['📱 Screen time', avgScreen === null ? '—' : fmtMin(Math.round(avgScreen)), 'average / day'],
    ['🌅 Wake → bed', `${avgWake === null ? '--:--' : minToHHMM(avgWake)} → ${avgBed === null ? '--:--' : minToHHMM(avgBed)}`, 'average'],
    ['✅ Tasks', `${tasksDone}/${tasksTotal}`, tasksTotal ? `${Math.round((tasksDone / tasksTotal) * 100)}% done` : undefined],
    ['🎯 All goals met', `${allGoalDays} days`, `of ${past.length}`],
  ];

  // ----- charts -----
  const dailyBars: Bar[] = days.map((d) => {
    const s = summarize(data, d, totals);
    return {
      label: period === 'week' ? weekdayName(d) : String(fromKey(d).getDate()),
      title: `${weekdayName(d)} ${fmtShort(d)}`,
      value: d > today ? null : metric.value(s),
    };
  });

  const trendBars: Bar[] = Array.from({ length: 12 }, (_, i) => {
    const key = period === 'week' ? addDays(weekStart(cursor), -7 * (11 - i)) : addMonths(cursor, -(11 - i));
    const ds = periodDays(key).filter((d) => d <= today);
    const v = ds.length ? aggregate(metric, ds.map((d) => summarize(data, d, totals))) : null;
    return {
      label: period === 'week' ? fmtShort(key) : fmtMonth(key).slice(0, 3),
      title: period === 'week' ? `Week of ${fmtShort(key)}` : fmtMonth(key),
      value: v,
    };
  });

  const dailyGoal = metric.goal?.(data.settings.goals);
  const periodGoal = dailyGoal === undefined ? undefined : metric.agg === 'avg' ? dailyGoal : period === 'week' ? dailyGoal * 7 : undefined;

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
            Now
          </button>
        </div>
        <div className="seg">
          {(['week', 'month'] as Period[]).map((p) => (
            <button key={p} className={period === p ? 'on' : ''} onClick={() => setPeriod(p)}>
              {p === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      <div className="kpis">
        {kpis.map(([label, value, sub]) => (
          <div key={label} className="kpi">
            <div className="kpi-label">{label}</div>
            <div className="kpi-value">{value}</div>
            {sub && <div className="kpi-sub">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="chart-filters">
        {METRICS.map((m) => (
          <button key={m.id} className={`chip ${m.id === metricId ? 'on' : ''}`} onClick={() => setMetricId(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className="charts">
        <section className="card">
          <header className="card-head">
            <h3>
              {metric.label} per day
            </h3>
          </header>
          <BarChart bars={dailyBars} color={metric.color} format={metric.format} goal={dailyGoal} />
        </section>
        <section className="card">
          <header className="card-head">
            <h3>
              {metric.label} — last 12 {period === 'week' ? 'weeks' : 'months'} ({metric.agg === 'sum' ? 'total' : 'average'})
            </h3>
          </header>
          <BarChart bars={trendBars} color={metric.color} format={metric.format} goal={periodGoal} />
        </section>
      </div>
    </div>
  );
}
