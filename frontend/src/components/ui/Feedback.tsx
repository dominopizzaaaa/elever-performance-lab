import type { ReactNode } from 'react';
import { cx } from '@/lib/format';

/** Full-panel loading state with the Elever pulse. */
export function LoadingPanel({ label = 'Syncing' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="relative h-12 w-12">
        <span className="absolute inset-0 rounded-full border border-accent/30" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent" />
        <span className="absolute inset-2 animate-pulse-glow rounded-full bg-accent/20" />
      </div>
      <p className="hud-label">{label}</p>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  detail?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({ title, detail, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {icon ? <div className="text-white/20">{icon}</div> : null}
      <p className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-white/60">{title}</p>
      {detail ? <p className="max-w-sm text-sm leading-relaxed text-white/35">{detail}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Inline error with a retry affordance. */
export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neon-red/30 bg-neon-red/[0.07] px-4 py-3">
      <p className="text-sm text-neon-red/90">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 underline decoration-neon-red/40 underline-offset-4 transition hover:text-white"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'live' | 'success' | 'warn';
  className?: string;
}

const BADGE_TONES = {
  neutral: 'border-white/12 bg-white/[0.04] text-white/60',
  accent: 'border-accent/40 bg-accent-soft text-accent',
  live: 'border-neon-lime/40 bg-neon-lime/10 text-neon-lime',
  success: 'border-neon-lime/30 bg-neon-lime/[0.07] text-neon-lime/90',
  warn: 'border-neon-amber/40 bg-neon-amber/10 text-neon-amber',
} as const;

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-display text-[10px] font-semibold uppercase tracking-[0.16em]',
        BADGE_TONES[tone],
        className,
      )}
    >
      {tone === 'live' ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-lime" aria-hidden />
      ) : null}
      {children}
    </span>
  );
}
