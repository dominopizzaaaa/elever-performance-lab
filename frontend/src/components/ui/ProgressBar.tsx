import { cx } from '@/lib/format';

interface ProgressBarProps {
  /** 0–100. Values above 100 are clamped. */
  value: number;
  label?: string;
  caption?: string;
  className?: string;
}

/** Thin neon meter used for weekly goals. */
export function ProgressBar({ value, label, caption, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div className={className}>
      {label || caption ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label ? <span className="hud-label">{label}</span> : null}
          {caption ? <span className="font-display text-[11px] tabular-nums text-white/55">{caption}</span> : null}
        </div>
      ) : null}
      <div
        className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cx('h-full rounded-full bg-accent transition-[width] duration-700 ease-out')}
          style={{ width: `${pct}%`, boxShadow: '0 0 12px rgb(var(--accent-rgb) / 0.8)' }}
        />
      </div>
    </div>
  );
}

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

/** Circular gauge for the dashboard's headline goal. */
export function ProgressRing({ value, size = 92, strokeWidth = 6, children }: ProgressRingProps) {
  const pct = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(255 255 255 / 0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--accent-rgb))"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms ease-out', filter: 'drop-shadow(0 0 6px rgb(var(--accent-rgb) / 0.8))' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
