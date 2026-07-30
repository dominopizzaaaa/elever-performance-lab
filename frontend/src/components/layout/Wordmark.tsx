import { cx } from '@/lib/format';

interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Hides the "Performance Lab" line — used in tight headers. */
  compact?: boolean;
}

const SIZES = {
  sm: { mark: 'h-7 w-7', title: 'text-sm', sub: 'text-[8px]' },
  md: { mark: 'h-10 w-10', title: 'text-xl', sub: 'text-[10px]' },
  lg: { mark: 'h-16 w-16', title: 'text-4xl sm:text-5xl', sub: 'text-xs sm:text-sm' },
} as const;

/** The Elever "E" monogram inside a hex frame, plus the wordmark. */
export function Wordmark({ size = 'md', className, compact = false }: WordmarkProps) {
  const scale = SIZES[size];

  return (
    <div className={cx('flex items-center gap-3', className)}>
      <div className={cx('relative shrink-0', scale.mark)}>
        <svg viewBox="0 0 48 48" className="h-full w-full" role="img" aria-label="Elever Performance Lab">
          <defs>
            <linearGradient id="epl-mark" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.95" />
              <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          {/* Hex frame */}
          <path
            d="M24 2 43 13v22L24 46 5 35V13Z"
            fill="rgb(var(--accent-rgb) / 0.07)"
            stroke="url(#epl-mark)"
            strokeWidth="1.6"
          />
          {/* Stylised "E" as three ascending bars */}
          <g fill="rgb(var(--accent-rgb))">
            <rect x="16" y="14" width="17" height="3.4" rx="1.7" />
            <rect x="16" y="22.3" width="12" height="3.4" rx="1.7" opacity="0.85" />
            <rect x="16" y="30.6" width="17" height="3.4" rx="1.7" />
          </g>
        </svg>
        <div
          className="absolute inset-0 -z-10 blur-lg"
          style={{ background: 'radial-gradient(circle, rgb(var(--accent-rgb) / 0.5), transparent 70%)' }}
          aria-hidden
        />
      </div>

      <div className="min-w-0">
        <p
          className={cx(
            'font-display font-black uppercase leading-none tracking-[0.14em] text-white',
            scale.title,
          )}
        >
          Elever
        </p>
        {!compact ? (
          <p
            className={cx(
              'mt-1 font-display font-semibold uppercase leading-none tracking-[0.42em] text-white/40',
              scale.sub,
            )}
          >
            Performance Lab
          </p>
        ) : null}
      </div>
    </div>
  );
}
