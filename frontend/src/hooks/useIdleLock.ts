'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface IdleLockOptions {
  /** Called once when the timeout elapses. */
  onIdle: () => void;
  /** Pass false at the scan screen (nothing to lock). */
  enabled: boolean;
  /** 0 disables the lock entirely. */
  timeoutMs: number;
  /** How long before the lock the countdown warning appears. */
  warningMs: number;
}

interface IdleLockState {
  /** Whole seconds left, while inside the warning window. `null` otherwise. */
  secondsLeft: number | null;
  /** Puts the full timeout back on the clock. */
  reset: () => void;
}

/**
 * Kiosk auto-lock: a shared gym screen must not leave a member's data on
 * display after they walk away. Any pointer/key/touch activity resets the timer.
 *
 * The last few seconds are surfaced as a countdown rather than locking without
 * warning — someone reading their plan between sets is idle by input but very
 * much still standing there, and being dumped to the scan screen mid-read is
 * worse than the second it costs them to tap "I'm still here".
 */
export function useIdleLock({ onIdle, enabled, timeoutMs, warningMs }: IdleLockOptions): IdleLockState {
  const callback = useRef(onIdle);
  callback.current = onIdle;

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  /** Shared with the effect so the exported `reset` can push the deadline out. */
  const deadline = useRef(0);

  const reset = useCallback(() => {
    deadline.current = Date.now() + timeoutMs;
    setSecondsLeft(null);
  }, [timeoutMs]);

  useEffect(() => {
    if (!enabled || timeoutMs <= 0) {
      setSecondsLeft(null);
      return;
    }

    deadline.current = Date.now() + timeoutMs;
    let fired = false;

    // One coarse interval rather than nested timeouts: it doubles as the
    // countdown tick and re-reads the clock, so a suspended tab cannot drift.
    const timer = window.setInterval(() => {
      if (fired) return;
      const remaining = deadline.current - Date.now();

      if (remaining <= 0) {
        fired = true;
        window.clearInterval(timer);
        setSecondsLeft(null);
        callback.current();
        return;
      }

      setSecondsLeft(remaining <= warningMs ? Math.ceil(remaining / 1000) : null);
    }, 250);

    const onActivity = () => {
      if (fired) return;
      deadline.current = Date.now() + timeoutMs;
      setSecondsLeft((current) => (current === null ? current : null));
    };

    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;
    for (const event of events) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      window.clearInterval(timer);
      for (const event of events) window.removeEventListener(event, onActivity);
    };
  }, [enabled, timeoutMs, warningMs]);

  return { secondsLeft, reset };
}

/**
 * Idle timeout from env, in milliseconds. Defaults to 90 seconds.
 *
 * Short on purpose: the previous 10 minutes meant someone who finished and
 * walked off without scanning out left their weight, goals and PRs on a screen
 * the next person in the queue was already standing in front of.
 */
export function idleTimeoutMs(): number {
  const seconds = Number.parseInt(process.env.NEXT_PUBLIC_KIOSK_IDLE_TIMEOUT ?? '', 10);
  return Number.isFinite(seconds) ? seconds * 1000 : 90_000;
}

/** How long the "still there?" countdown runs for. Defaults to 15 seconds. */
export function idleWarningMs(): number {
  const seconds = Number.parseInt(process.env.NEXT_PUBLIC_KIOSK_IDLE_WARNING ?? '', 10);
  const warning = Number.isFinite(seconds) ? seconds * 1000 : 15_000;
  // Never let the warning outlast the timeout it belongs to.
  return Math.min(warning, Math.max(0, idleTimeoutMs() - 1000));
}
