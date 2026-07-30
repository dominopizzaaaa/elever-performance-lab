'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { cx } from '@/lib/format';

type ToastTone = 'success' | 'error' | 'info' | 'record';

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  detail?: string;
}

interface ToastContextValue {
  push: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
  record: (title: string, detail?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { ring: string; icon: string; glyph: string }> = {
  success: { ring: 'border-neon-lime/40', icon: 'text-neon-lime', glyph: '✓' },
  error: { ring: 'border-neon-red/50', icon: 'text-neon-red', glyph: '!' },
  info: { ring: 'border-neon-cyan/40', icon: 'text-neon-cyan', glyph: 'i' },
  record: { ring: 'border-neon-amber/50', icon: 'text-neon-amber', glyph: '★' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = nextId.current;
      nextId.current += 1;
      setToasts((current) => [...current.slice(-3), { ...toast, id }]);
      // PRs linger a little longer — they are worth reading.
      window.setTimeout(() => dismiss(id), toast.tone === 'record' ? 6500 : 4000);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, detail) => push({ tone: 'success', title, detail }),
      error: (title, detail) => push({ tone: 'error', title, detail }),
      info: (title, detail) => push({ tone: 'info', title, detail }),
      record: (title, detail) => push({ tone: 'record', title, detail }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((toast) => {
          const tone = TONE_STYLES[toast.tone];
          return (
            <div
              key={toast.id}
              className={cx(
                'pointer-events-auto flex w-full max-w-md animate-fade-up items-start gap-3 rounded-xl border bg-void-800/95 px-4 py-3 shadow-neon-lg backdrop-blur-xl',
                tone.ring,
              )}
            >
              <span
                className={cx(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current font-display text-xs font-bold',
                  tone.icon,
                )}
                aria-hidden
              >
                {tone.glyph}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold tracking-wide text-white">{toast.title}</p>
                {toast.detail ? <p className="mt-0.5 text-sm text-white/60">{toast.detail}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="shrink-0 rounded px-1 text-white/30 transition hover:text-white/70"
                aria-label="Dismiss notification"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
