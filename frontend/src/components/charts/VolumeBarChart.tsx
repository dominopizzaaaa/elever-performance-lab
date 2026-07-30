'use client';

import { useMemo, useState } from 'react';
import { cx, formatNumber, formatVolume } from '@/lib/format';
import { barPath, niceMax, scaleLinear, ticks } from './chartUtils';

export interface VolumeDatum {
  label: string;
  value: number;
  /** Extra rows shown in the tooltip. */
  meta?: { label: string; value: string }[];
}

interface VolumeBarChartProps {
  data: VolumeDatum[];
  /** Names the single plotted series — stands in for a legend. */
  seriesLabel: string;
  unit?: string;
  height?: number;
  className?: string;
  /** Adds a toggleable data table under the chart (accessibility fallback). */
  withTable?: boolean;
}

const PADDING = { top: 18, right: 8, bottom: 26, left: 44 };
/**
 * Bars cap at 24 *rendered* px. The viewBox is 520 units wide and typically
 * renders around 800px, so the cap is expressed in viewBox units scaled to suit.
 */
const MAX_BAR_WIDTH = 16;
const BAR_GAP = 2; // surface-coloured gap between adjacent bars

/**
 * Single-series column chart for weekly tonnage.
 *
 * One series means no legend box: the panel heading names what is plotted. Only
 * the highest column is directly labelled; the axis and tooltip carry the rest.
 */
export function VolumeBarChart({
  data,
  seriesLabel,
  unit = 'kg',
  height = 190,
  className,
  withTable = false,
}: VolumeBarChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const width = 520; // viewBox units; the SVG scales to its container
  const innerWidth = width - PADDING.left - PADDING.right;
  const innerHeight = height - PADDING.top - PADDING.bottom;

  const max = useMemo(() => niceMax(Math.max(...data.map((datum) => datum.value), 1)), [data]);
  const y = scaleLinear([0, max], [PADDING.top + innerHeight, PADDING.top]);
  const band = innerWidth / Math.max(data.length, 1);
  const barWidth = Math.min(MAX_BAR_WIDTH, Math.max(4, band - BAR_GAP * 2));
  const peakIndex = useMemo(
    () => data.reduce((best, datum, index) => (datum.value > (data[best]?.value ?? 0) ? index : best), 0),
    [data],
  );

  const activeDatum = hovered === null ? null : data[hovered];

  return (
    <div className={className}>
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          role="img"
          aria-label={`${seriesLabel} by week. ${data
            .map((datum) => `${datum.label}: ${formatNumber(datum.value)} ${unit}`)
            .join('; ')}`}
          onMouseLeave={() => setHovered(null)}
        >
          {/* Gridlines + y ticks — hairline, solid, recessive */}
          {ticks(max, 4).map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                y1={y(tick)}
                x2={width - PADDING.right}
                y2={y(tick)}
                stroke="rgb(255 255 255 / 0.07)"
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 8}
                y={y(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-white/40 text-[9px] tabular-nums"
              >
                {tick >= 1000 ? `${Math.round(tick / 1000)}k` : Math.round(tick)}
              </text>
            </g>
          ))}

          {data.map((datum, index) => {
            const barX = PADDING.left + band * index + (band - barWidth) / 2;
            const barY = y(datum.value);
            const barHeight = PADDING.top + innerHeight - barY;
            const isHovered = hovered === index;

            return (
              <g key={`${datum.label}-${index}`}>
                {/* Hit target is the whole band, not just the bar */}
                <rect
                  x={PADDING.left + band * index}
                  y={PADDING.top}
                  width={band}
                  height={innerHeight}
                  fill="transparent"
                  onMouseEnter={() => setHovered(index)}
                  onFocus={() => setHovered(index)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${datum.label}: ${formatNumber(datum.value)} ${unit}`}
                  className="cursor-default outline-none"
                />
                <path
                  d={barPath(barX, barY, barWidth, barHeight, 4)}
                  fill="rgb(var(--accent-rgb))"
                  fillOpacity={datum.value === 0 ? 0.12 : isHovered ? 1 : 0.72}
                  style={{
                    filter: isHovered ? 'drop-shadow(0 0 10px rgb(var(--accent-rgb) / 0.7))' : undefined,
                    transition: 'fill-opacity 140ms ease-out',
                  }}
                  pointerEvents="none"
                />
                <text
                  x={PADDING.left + band * index + band / 2}
                  y={height - 8}
                  textAnchor="middle"
                  className={cx('text-[9px] tabular-nums', isHovered ? 'fill-white/80' : 'fill-white/35')}
                  pointerEvents="none"
                >
                  {datum.label}
                </text>

                {/* Direct-label the peak only */}
                {index === peakIndex && datum.value > 0 ? (
                  <text
                    x={PADDING.left + band * index + band / 2}
                    y={barY - 6}
                    textAnchor="middle"
                    className="fill-white/70 text-[9px] font-semibold tabular-nums"
                    pointerEvents="none"
                  >
                    {formatVolume(datum.value)}
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1={PADDING.left}
            y1={PADDING.top + innerHeight}
            x2={width - PADDING.right}
            y2={PADDING.top + innerHeight}
            stroke="rgb(255 255 255 / 0.16)"
            strokeWidth={1}
          />
        </svg>

        {/* Tooltip */}
        {activeDatum ? (
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-lg border border-white/12 bg-void-900/95 px-3 py-2 shadow-neon-lg backdrop-blur">
            <p className="font-display text-[10px] uppercase tracking-[0.16em] text-white/45">
              {activeDatum.label}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-accent" aria-hidden />
              <span className="text-sm font-semibold tabular-nums text-white">
                {formatNumber(activeDatum.value)} {unit}
              </span>
            </p>
            {activeDatum.meta?.map((row) => (
              <p key={row.label} className="mt-0.5 text-[11px] tabular-nums text-white/50">
                {row.label}: <span className="text-white/75">{row.value}</span>
              </p>
            ))}
          </div>
        ) : null}
      </div>

      {withTable ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowTable((current) => !current)}
            aria-expanded={showTable}
            className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35 underline decoration-white/20 underline-offset-4 transition hover:text-white/70"
          >
            {showTable ? 'Hide data table' : 'View data table'}
          </button>

          {showTable ? (
            <div className="mt-2 max-h-44 overflow-auto rounded-lg border border-white/[0.06]">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">{seriesLabel} by week</caption>
                <thead className="sticky top-0 bg-void-800">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-display text-[9px] uppercase tracking-[0.16em] text-white/40">
                      Week
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-display text-[9px] uppercase tracking-[0.16em] text-white/40">
                      {seriesLabel} ({unit})
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((datum) => (
                    <tr key={datum.label} className="border-t border-white/[0.05]">
                      <td className="px-3 py-1.5 text-white/60">{datum.label}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-white/80">
                        {formatNumber(datum.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
