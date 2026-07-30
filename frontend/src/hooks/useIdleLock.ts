'use client';

import { useEffect, useRef } from 'react';

/**
 * Kiosk auto-lock: a shared gym screen must not leave a member's data on
 * display after they walk away. Any pointer/key/touch activity resets the timer.
 *
 * @param onIdle    called once when the timeout elapses
 * @param enabled   pass false at the scan screen (nothing to lock)
 * @param timeoutMs 0 disables the lock entirely
 */
export function useIdleLock(onIdle: () => void, enabled: boolean, timeoutMs: number): void {
  const callback = useRef(onIdle);
  callback.current = onIdle;

  useEffect(() => {
    if (!enabled || timeoutMs <= 0) return;

    let timer = window.setTimeout(() => callback.current(), timeoutMs);

    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => callback.current(), timeoutMs);
    };

    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;
    for (const event of events) {
      window.addEventListener(event, reset, { passive: true });
    }

    return () => {
      window.clearTimeout(timer);
      for (const event of events) window.removeEventListener(event, reset);
    };
  }, [enabled, timeoutMs]);
}

/** Idle timeout from env, in milliseconds. Defaults to 10 minutes. */
export function idleTimeoutMs(): number {
  const seconds = Number.parseInt(process.env.NEXT_PUBLIC_KIOSK_IDLE_TIMEOUT ?? '', 10);
  return Number.isFinite(seconds) ? seconds * 1000 : 600_000;
}
