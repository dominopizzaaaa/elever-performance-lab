'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cx } from '@/lib/format';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface NeonButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'border-transparent text-void-900 bg-accent shadow-neon hover:brightness-110 active:brightness-95 font-semibold',
  outline:
    'border-accent/45 text-accent bg-accent-soft hover:bg-accent/20 hover:border-accent/70',
  ghost: 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white',
  danger: 'border-neon-red/40 bg-neon-red/10 text-neon-red hover:bg-neon-red/20 hover:border-neon-red/70',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-[11px] tracking-[0.14em] gap-1.5',
  md: 'px-5 py-2.5 text-xs tracking-[0.18em] gap-2',
  lg: 'px-7 py-4 text-sm tracking-[0.2em] gap-2.5',
};

/**
 * The kiosk's primary control. Sized for touch (44px+ at `md`) and driven by
 * the accent CSS variable so it re-tints per member.
 */
export const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(function NeonButton(
  { variant = 'primary', size = 'md', isLoading = false, icon, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cx(
        'relative inline-flex items-center justify-center rounded-xl border font-display font-semibold uppercase',
        'transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {isLoading ? (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
});
