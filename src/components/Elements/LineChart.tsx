import { FunctionComponent, useId, useMemo, useState } from "react";

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  /** one value per step (match), oldest first */
  values: number[];
}

const W = 600;
const H = 200;
const PAD = { left: 40, right: 12, top: 12, bottom: 22 };
const plotW = W - PAD.left - PAD.right;
const plotH = H - PAD.top - PAD.bottom;

/**
 * Small dependency-free SVG line chart (replaces @nivo/line and its d3/lodash/react-spring
 * dependencies, ~200 kB). Hover or drag a finger over it to read the values.
 */
export const LineChart: FunctionComponent<{
  series: ChartSeries[];
  /** draws a dashed reference line, e.g. the starting rating */
  baseline?: number;
  xLabel?: string;
  stepLabel?: string;
}> = ({ series, baseline, xLabel = "matches", stepLabel = "Match" }) => {
  const [hover, setHover] = useState<number | null>(null);
  const title = useId();
  const steps = Math.max(...series.map(s => s.values.length), 0);

  const { min, max } = useMemo(() => {
    const all = series.flatMap(s => s.values);
    if (baseline !== undefined) all.push(baseline);
    let lo = Math.min(...all);
    let hi = Math.max(...all);
    if (lo === hi) {
      lo -= 5;
      hi += 5;
    }
    const pad = (hi - lo) * 0.08;
    return { min: lo - pad, max: hi + pad };
  }, [series, baseline]);

  if (steps === 0) return null;

  const x = (i: number) =>
    PAD.left + (steps === 1 ? plotW / 2 : (i / (steps - 1)) * plotW);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * plotH;
  const ticks = [min, (min + max) / 2, max].map(v => Math.round(v));

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.left) / plotW) * (steps - 1));
    setHover(Math.min(steps - 1, Math.max(0, i)));
  };

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block text-gray-500 dark:text-gray-400"
        style={{ touchAction: "pan-y" }}
        role="img"
        aria-labelledby={title}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <title id={title}>
          {series.map(s => `${s.label}: ${s.values.at(-1)}`).join(", ")}
        </title>
        {ticks.map(t => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className="stroke-gray-200 dark:stroke-gray-600"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={y(t) + 4}
              textAnchor="end"
              fontSize={12}
              fill="currentColor"
            >
              {t}
            </text>
          </g>
        ))}
        {baseline !== undefined && (
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(baseline)}
            y2={y(baseline)}
            stroke="currentColor"
            strokeOpacity={0.5}
            strokeDasharray="4 4"
          />
        )}
        {series.map(s => (
          <g key={s.id}>
            <path
              d={s.values
                .map(
                  (v, i) =>
                    `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`,
                )
                .join("")}
              fill="none"
              stroke={s.color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.values.length <= 40 &&
              s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r={3} fill={s.color} />
              ))}
          </g>
        ))}
        {hover !== null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="currentColor"
              strokeOpacity={0.4}
            />
            {series.map(
              s =>
                s.values[hover] !== undefined && (
                  <circle
                    key={s.id}
                    cx={x(hover)}
                    cy={y(s.values[hover])}
                    r={5}
                    fill={s.color}
                    stroke="white"
                    strokeWidth={2}
                  />
                ),
            )}
          </g>
        )}
        <text
          x={PAD.left + plotW / 2}
          y={H - 5}
          textAnchor="middle"
          fontSize={12}
          fill="currentColor"
        >
          {steps} {xLabel}
        </text>
      </svg>
      {hover !== null && (
        <div
          className="absolute top-1 pointer-events-none text-xs bg-white dark:bg-gray-800 shadow-sm rounded-sm px-2 py-1 whitespace-nowrap"
          style={{
            left: `${(x(hover) / W) * 100}%`,
            transform: `translateX(${hover > steps / 2 ? "-105%" : "5%"})`,
          }}
        >
          <b>
            {stepLabel} {hover + 1}
          </b>
          {series.map(
            s =>
              s.values[hover] !== undefined && (
                <span key={s.id} className="ml-2" style={{ color: s.color }}>
                  {series.length > 1 ? `${s.label} ` : ""}
                  {s.values[hover].toFixed(0)}
                </span>
              ),
          )}
        </div>
      )}
    </div>
  );
};
