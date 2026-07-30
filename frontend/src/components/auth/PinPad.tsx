'use client';

import { useEffect, useState } from 'react';
import { cx } from '@/lib/format';
import type { MemberIdentity } from '@/lib/types';

interface PinPadProps {
  /** Who the kiosk thinks is standing there — echoed back for confirmation. */
  member: MemberIdentity;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  isVerifying: boolean;
  error: string | null;
  /** Clears the entered digits — bump this after a rejected PIN. */
  clearSignal: number;
}

const PIN_LENGTH = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

/**
 * Confirm-and-unlock step of scan-in.
 *
 * The name is shown large and first: on a shared floor screen the common
 * mistake is not a stranger guessing a PIN, it is the kiosk still holding the
 * last person's session — so the question asked here is "is this you?" before
 * it is "what is your PIN?".
 *
 * Digits are entered on-screen rather than typed. Nothing is echoed but the
 * count, so a PIN cannot be read over the shoulder of whoever is at the front
 * of the queue.
 */
export function PinPad({ member, onSubmit, onCancel, isVerifying, error, clearSignal }: PinPadProps) {
  const [pin, setPin] = useState('');

  useEffect(() => {
    setPin('');
  }, [clearSignal]);

  function press(key: (typeof KEYS)[number]) {
    if (isVerifying) return;
    if (key === 'clear') return setPin('');
    if (key === 'back') return setPin((current) => current.slice(0, -1));

    const next = `${pin}${key}`.slice(0, PIN_LENGTH);
    setPin(next);
    if (next.length === PIN_LENGTH) onSubmit(next);
  }

  // A physical keyboard is faster for staff testing the kiosk, and harmless.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') return onCancel();
      if (event.key === 'Backspace') return press('back');
      if (/^\d$/.test(event.key)) return press(event.key as (typeof KEYS)[number]);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  return (
    <div className="relative">
      <p className="hud-label text-center">Confirm it&apos;s you</p>

      <h2 className="mt-2 text-center font-display text-2xl font-bold uppercase tracking-[0.14em] text-white sm:text-3xl">
        {member.name}
      </h2>
      <p className="mt-1.5 text-center font-display text-[10px] uppercase tracking-[0.22em] text-white/35">
        {member.memberNumber} · {member.tier}
      </p>

      <p className="mt-5 text-center text-sm text-white/45">
        Not you?{' '}
        <button
          type="button"
          onClick={onCancel}
          className="font-display uppercase tracking-[0.14em] text-accent underline decoration-accent/40 underline-offset-4 transition hover:decoration-accent"
        >
          Go back
        </button>
      </p>

      {/* Entered digits — count only, never the values. */}
      <div className="mt-6 flex justify-center gap-3" aria-hidden>
        {Array.from({ length: PIN_LENGTH }, (_, index) => (
          <span
            key={index}
            className={cx(
              'h-4 w-4 rounded-full border-2 transition',
              index < pin.length ? 'border-accent bg-accent' : 'border-white/20 bg-transparent',
            )}
            style={
              index < pin.length ? { boxShadow: '0 0 12px rgb(var(--accent-rgb) / 0.8)' } : undefined
            }
          />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {pin.length} of {PIN_LENGTH} digits entered
      </p>

      <p className="mt-4 text-center text-sm text-white/40">
        {isVerifying ? 'Checking your PIN…' : 'Enter your 4-digit PIN'}
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-center text-sm text-neon-red">
          {error}
        </p>
      ) : null}

      {/* Keypad — 72px+ targets, reachable on a wall-mounted portrait screen. */}
      <div className="mx-auto mt-5 grid max-w-xs grid-cols-3 gap-2.5">
        {KEYS.map((key) => {
          const isDigit = key !== 'clear' && key !== 'back';
          return (
            <button
              key={key}
              type="button"
              disabled={isVerifying}
              onClick={() => press(key)}
              aria-label={key === 'back' ? 'Delete last digit' : key === 'clear' ? 'Clear PIN' : key}
              className={cx(
                'flex h-16 items-center justify-center rounded-xl border font-display font-bold tabular-nums transition disabled:opacity-40',
                isDigit
                  ? 'border-white/10 bg-white/[0.04] text-2xl text-white hover:border-accent/50 hover:bg-accent-soft hover:text-accent active:brightness-95'
                  : 'border-white/[0.07] bg-transparent text-[10px] uppercase tracking-[0.16em] text-white/40 hover:text-white/75',
              )}
            >
              {key === 'back' ? '⌫' : key === 'clear' ? 'Clear' : key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
