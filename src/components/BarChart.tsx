import { useEffect, useRef, useState } from 'react';

export interface Bar {
  label: string; // axis label
  title: string; // tooltip heading
  value: number | null;
}

/** Single-series bar chart with optional goal line and a per-bar hover tooltip. */
export function BarChart({ bars, color, format, goal, height = 220 }: { bars: Bar[]; color: string; format: (v: number) => string; goal?: number; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(600);
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(box.current!);
    return () => ro.disconnect();
  }, []);
  const H = height;
  const pad = { top: 16, right: 12, bottom: 28, left: 52 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const max = Math.max(1, goal ?? 0, ...bars.map((b) => b.value ?? 0));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const y = (v: number) => pad.top + innerH - (v / top) * innerH;
  const slot = innerW / bars.length;
  const barW = Math.max(4, Math.min(36, slot - 2));
  const labelEvery = Math.ceil(bars.length / Math.max(4, Math.floor(innerW / 44)));

  return (
    <div className="chart" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} className="grid" />
            <text x={pad.left - 8} y={y(t)} className="axis" textAnchor="end" dominantBaseline="middle">
              {format(t)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          const cx = pad.left + slot * i + slot / 2;
          const v = b.value ?? 0;
          const h = Math.max(0, y(0) - y(v));
          const r = Math.min(4, barW / 2, h);
          const x0 = cx - barW / 2;
          const yTop = y(v);
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={pad.left + slot * i} y={pad.top} width={slot} height={innerH} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${x0},${y(0)} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x0 + barW - r} Q${x0 + barW},${yTop} ${x0 + barW},${yTop + r} V${y(0)} Z`}
                  fill={color}
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
              )}
              {(bars.length - 1 - i) % labelEvery === 0 && (
                <text x={cx} y={H - 10} className="axis" textAnchor="middle">
                  {b.label}
                </text>
              )}
            </g>
          );
        })}
        <line x1={pad.left} x2={W - pad.right} y1={y(0)} y2={y(0)} className="baseline" />
        {goal !== undefined && goal > 0 && (
          <g>
            <line x1={pad.left} x2={W - pad.right} y1={y(goal)} y2={y(goal)} className="goal-line" />
            <text x={W - pad.right} y={y(goal) - 5} className="axis" textAnchor="end">
              goal {format(goal)}
            </text>
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{ left: `${((pad.left + slot * hover + slot / 2) / W) * 100}%` }}>
          <div className="tt-title">{bars[hover].title}</div>
          <div className="tt-row">
            <span className="dot" style={{ background: color }} />
            {bars[hover].value === null ? 'no data' : format(bars[hover].value!)}
          </div>
        </div>
      )}
    </div>
  );
}

function niceTicks(max: number) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const out: number[] = [];
  for (let v = 0; v <= max + step * 0.999; v += step) out.push(+v.toFixed(6));
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}
