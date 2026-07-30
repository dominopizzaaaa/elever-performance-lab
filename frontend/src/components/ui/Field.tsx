'use client';

import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { cx } from '@/lib/format';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  /** Suffix rendered inside the field, e.g. `kg`. */
  suffix?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, suffix, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={fieldId} className="hud-label mb-1.5 block">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cx('field', suffix && 'pr-12', error && '!border-neon-red/60')}
          {...rest}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-display text-[11px] uppercase tracking-widest text-white/35">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={`${fieldId}-error`} className="mt-1.5 text-xs text-neon-red">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-xs text-white/35">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, options, className, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={fieldId} className="hud-label mb-1.5 block">
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        id={fieldId}
        className={cx('field appearance-none bg-none pr-9', error && '!border-neon-red/60')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%23ffffff66' stroke-width='1.5'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.9rem center',
          backgroundSize: '0.7rem',
        }}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-void-800 text-white">
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="mt-1.5 text-xs text-neon-red">{error}</p> : null}
    </div>
  );
});

interface NumberStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  /** Number of decimals to display and round to. */
  precision?: number;
  className?: string;
}

/**
 * Big touch target for logging reps and weight — typing on a wall-mounted
 * screen is slow, so ± buttons flank the value.
 */
export function NumberStepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  suffix,
  precision = 0,
  className,
}: NumberStepperProps) {
  const clamp = (next: number) => {
    const bounded = Math.min(max, Math.max(min, next));
    const factor = 10 ** precision;
    return Math.round(bounded * factor) / factor;
  };

  return (
    <div className={className}>
      <p className="hud-label mb-1.5">{label}</p>
      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          className="w-11 shrink-0 rounded-xl border border-white/10 bg-white/[0.03] font-display text-lg text-white/70 transition hover:border-accent/50 hover:text-accent disabled:opacity-30"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            type="number"
            inputMode="decimal"
            value={Number.isFinite(value) ? value : ''}
            step={step}
            min={min}
            max={max}
            onChange={(event) => {
              const parsed = Number.parseFloat(event.target.value);
              onChange(Number.isFinite(parsed) ? clamp(parsed) : min);
            }}
            className={cx('field text-center font-display text-xl font-bold tabular-nums', suffix && 'pr-9')}
            aria-label={label}
          />
          {suffix ? (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-widest text-white/30">
              {suffix}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          className="w-11 shrink-0 rounded-xl border border-white/10 bg-white/[0.03] font-display text-lg text-white/70 transition hover:border-accent/50 hover:text-accent disabled:opacity-30"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
