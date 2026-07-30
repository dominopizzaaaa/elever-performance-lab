'use client';

import { useMemo, useState } from 'react';
import { formatDate, formatNumber } from '@/lib/format';
import { areaPath, linePath, nearestIndex, niceMax, scaleLinear, SURFACE, ticks, type Point } from './chartUtils';

export interface TrendPoint {
  /** `YYYY-MM-DD` */
  date: string;
  value: number;
}

interface TrendLineChartProps {
  data: TrendPoint[];
  seriesLabel: string;
  unit?: string;
  height?: number;
  className?: string;
  /** Start the y-axis near the data instead of at zero (better for 1RM trends). */
  zeroBased?: boolean;
}

const PADDING = { top: 16, right: 40, bottom: 22, left: 34 };

/**
 * viewBox width. Kept close to the rendered width of a small-multiple card so
 * the SVG's fixed-size text is not scaled down into illegibility.
 */
const VIEW_WIDTH = 340;

/**
 * Single-series line chart with a crosshair tooltip.
 *
 * Strength trends are plotted one exercise per chart (small multiples) rather
 * than many series on shared axes — converging 1RM lines are unreadable and
 * would need a categorical palette to tell apart.
 */
export function TrendLineChart({
  data,
  seriesLabel,
  unit = 'kg',
  height = 170,
  className,
  zeroBased = false,
}: TrendLineChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const width = VIEW_WIDTH;
  const innerWidth = width - PADDING.left - PADDING.right;
  const innerHeight = height - PADDING.top - PADDING.bottom;

  const { yMin, yMax } = useMemo(() => {
    const values = data.map((point) => point.value);
    const rawMax = Math.max(...values, 1);
    if (zeroBased) return { yMin: 0, yMax: niceMax(rawMax) };

    const rawMin = Math.min(...values);
    // Pad the band by 8% so the line never sits on the frame.
    const span = rawMax - rawMin || rawMax * 0.1 || 1;
    return {
      yMin: Math.max(0, Math.floor((rawMin - span * 0.25) / 5) * 5),
      yMax: Math.ceil((rawMax + span * 0.15) / 5) * 5,
    };
  }, [data, zeroBased]);

  const x = scaleLinear([0, Math.max(data.length - 1, 1)], [PADDING.left, PADDING.left + innerWidth]);
  const y = scaleLinear([yMin, yMax], [PADDING.top + innerHeight, PADDING.top]);

  const points: Point[] = useMemo(
    () => data.map((point, index) => ({ x: x(index), y: y(point.value) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, yMin, yMax, height],
  );

  const positions = useMemo(() => points.map((point) => point.x), [points]);
  const last = data[data.length - 1];
  const lastPoint = points[points.length - 1];
  const activeIndex = hovered;
  const activeDatum = activeIndex === null ? null : data[activeIndex];
  const activePoint = activeIndex === null ? null : points[activeIndex];

  const gridValues = useMemo(
    () => (zeroBased ? ticks(yMax, 3) : [yMin, yMin + (yMax - yMin) / 2, yMax]),
    [zeroBased, yMax, yMin],
  );

  if (data.length === 0) return null;

  return (
    <div className={className}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          role="img"
          aria-label={`${seriesLabel} over time. ${data
            .map((point) => `${point.date}: ${point.value} ${unit}`)
            .join('; ')}`}
          onMouseMove={(event) => {
            const svg = event.currentTarget;
            const rect = svg.getBoundingClientRect();
            const localX = ((event.clientX - rect.left) / rect.width) * width;
            setHovered(nearestIndex(positions, localX));
          }}
          onMouseLeave={() => setHovered(null)}
        >
          {gridValues.map((value) => (
            <g key={value}>
              <line
                x1={PADDING.left}
                y1={y(value)}
                x2={width - PADDING.right}
                y2={y(value)}
                stroke="rgb(255 255 255 / 0.07)"
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 8}
                y={y(value)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-white/45 text-[11px] tabular-nums"
              >
                {Math.round(value)}
              </text>
            </g>
          ))}

          {/* Area wash at ~10% */}
          <path d={areaPath(points, PADDING.top + innerHeight)} fill="rgb(var(--accent-rgb))" fillOpacity={0.1} />

          {/* 2px line, round caps */}
          <path
            d={linePath(points)}
            fill="none"
            stroke="rgb(var(--accent-rgb))"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: 'drop-shadow(0 0 6px rgb(var(--accent-rgb) / 0.45))' }}
          />

          {/* Crosshair */}
          {activePoint ? (
            <line
              x1={activePoint.x}
              y1={PADDING.top}
              x2={activePoint.x}
              y2={PADDING.top + innerHeight}
              stroke="rgb(255 255 255 / 0.22)"
              strokeWidth={1}
            />
          ) : null}

          {/* Endpoint marker: r=4 with a 2px surface ring */}
          <circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill="rgb(var(--accent-rgb))" stroke={SURFACE} strokeWidth={2} />

          {activePoint && activeIndex !== data.length - 1 ? (
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r={4}
              fill="rgb(var(--accent-rgb))"
              stroke={SURFACE}
              strokeWidth={2}
            />
          ) : null}

          {/* Direct label at the line end only */}
          <text
            x={Math.min(lastPoint.x + 9, width - 4)}
            y={lastPoint.y}
            dominantBaseline="middle"
            className="fill-white/80 text-[12px] font-semibold tabular-nums"
          >
            {formatNumber(last.value, 1)}
          </text>

          {/* First/last date ticks only — dense date axes are unreadable */}
          <text x={PADDING.left} y={height - 6} className="fill-white/35 text-[10px]">
            {formatDate(data[0].date)}
          </text>
          {data.length > 1 ? (
            <text
              x={PADDING.left + innerWidth}
              y={height - 6}
              textAnchor="end"
              className="fill-white/35 text-[10px]"
            >
              {formatDate(last.date)}
            </text>
          ) : null}
        </svg>

        {activeDatum ? (
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-lg border border-white/12 bg-void-900/95 px-3 py-1.5 shadow-neon-lg backdrop-blur">
            <p className="font-display text-[10px] uppercase tracking-[0.16em] text-white/45">
              {formatDate(activeDatum.date)}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5">
              <span className="h-0.5 w-3 rounded-full bg-accent" aria-hidden />
              <span className="text-sm font-semibold tabular-nums text-white">
                {formatNumber(activeDatum.value, 1)} {unit}
              </span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
