'use client';

import { formatNumber } from '@/lib/format';

export interface HorizontalBarDatum {
  label: string;
  value: number;
  /** Optional secondary caption shown at the row's right edge. */
  caption?: string;
}

interface HorizontalBarsProps {
  data: HorizontalBarDatum[];
  /** Names the single plotted measure — stands in for a legend. */
  seriesLabel: string;
  unit?: string;
  className?: string;
}

/**
 * Ranked horizontal bars for categorical breakdowns (training focus split,
 * per-member tonnage). Length carries the magnitude, so a single hue is
 * correct — colour does no identity work here.
 *
 * Built with divs rather than SVG so labels reflow naturally on a portrait
 * screen and can never be clipped by their own mark.
 */
export function HorizontalBars({ data, seriesLabel, unit = '', className }: HorizontalBarsProps) {
  const max = Math.max(...data.map((datum) => datum.value), 1);

  return (
    <div className={className}>
      <ul className="flex flex-col gap-2.5" aria-label={seriesLabel}>
        {data.map((datum) => {
          const pct = (datum.value / max) * 100;
          return (
            <li key={datum.label}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="truncate font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  {datum.label}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-white/70">
                  {formatNumber(datum.value)}
                  {unit ? <span className="ml-0.5 text-white/35">{unit}</span> : null}
                  {datum.caption ? <span className="ml-2 text-white/35">{datum.caption}</span> : null}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-r-[4px] bg-white/[0.05]">
                <div
                  className="h-full rounded-r-[4px] bg-accent transition-[width] duration-700 ease-out"
                  style={{
                    width: `${Math.max(pct, 1.5)}%`,
                    opacity: 0.55 + (pct / 100) * 0.45,
                    boxShadow: '0 0 10px rgb(var(--accent-rgb) / 0.45)',
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
