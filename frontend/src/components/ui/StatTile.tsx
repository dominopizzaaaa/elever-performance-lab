import type { ReactNode } from 'react';
import { cx } from '@/lib/format';

interface StatTileProps {
  label: string;
  value: ReactNode;
  unit?: string;
  /** Small caption under the value, e.g. a target or a delta. */
  hint?: ReactNode;
  tone?: 'default' | 'accent' | 'positive' | 'negative';
  className?: string;
}

const TONES = {
  default: 'text-white',
  accent: 'neon-text',
  positive: 'text-neon-lime',
  negative: 'text-neon-red',
} as const;

/** Compact HUD readout. Values use tabular figures so columns stay aligned. */
export function StatTile({ label, value, unit, hint, tone = 'default', className }: StatTileProps) {
  return (
    <div
      className={cx(
        'rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 transition hover:border-white/15',
        className,
      )}
    >
      <p className="hud-label truncate">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1">
        {/* Numbers use the body sans, not the display face: Orbitron digits are
            wide and hard to scan in a dense HUD. */}
        <span className={cx('text-2xl font-semibold tabular-nums leading-none', TONES[tone])}>
          {value}
        </span>
        {unit ? <span className="text-[11px] font-medium text-white/35">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1 truncate text-[11px] text-white/40">{hint}</p> : null}
    </div>
  );
}
