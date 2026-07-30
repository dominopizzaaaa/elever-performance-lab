'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useSession } from '@/providers/SessionProvider';
import { idleTimeoutMs, useIdleLock } from '@/hooks/useIdleLock';
import { cx } from '@/lib/format';
import { BackdropFx } from './BackdropFx';
import { Wordmark } from './Wordmark';

interface KioskShellProps {
  children: ReactNode;
  /** Hides the nav rail — used on the landing/scan screen. */
  bare?: boolean;
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', glyph: '◈' },
  { href: '/history', label: 'History', glyph: '◴' },
  { href: '/analytics', label: 'AI Lab', glyph: '◉' },
  { href: '/admin', label: 'Admin', glyph: '⬡' },
] as const;

/**
 * Portrait-first kiosk chrome.
 *
 * The screen this is built for is a 1080×1920 panel mounted vertically, so the
 * content is a single centred column with a fixed bottom nav bar within thumb
 * reach. On desktop it stays centred and capped rather than stretching wide.
 */
export function KioskShell({ children, bare = false }: KioskShellProps) {
  const { user, scanOut } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [clock, setClock] = useState<string>('');

  // Auto-lock back to the scan screen so a member's data does not sit on a
  // shared gym display after they leave.
  useIdleLock(
    () => {
      if (user) scanOut();
    },
    Boolean(user),
    idleTimeoutMs(),
  );

  // Rendered client-side only: a server-rendered clock would hydrate stale.
  useEffect(() => {
    const tick = () =>
      setClock(
        new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()),
      );
    tick();
    const timer = window.setInterval(tick, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div data-accent={user?.accentColor ?? 'cyan'} className="relative min-h-screen">
      <BackdropFx />

      {/* Top status strip */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-void-900/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
          <Link href={user ? '/dashboard' : '/'} className="rounded-lg transition hover:opacity-80">
            <Wordmark size="sm" compact />
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden font-display text-[10px] uppercase tracking-[0.22em] text-white/30 sm:inline">
              {clock || '--:--'}
            </span>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white">
                    {user.name}
                  </p>
                  <p className="font-display text-[9px] uppercase tracking-[0.2em] text-white/35">
                    {user.memberNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={scanOut}
                  className="rounded-lg border border-white/10 px-2.5 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50 transition hover:border-neon-red/50 hover:text-neon-red"
                >
                  Scan out
                </button>
              </div>
            ) : (
              <span className="chip">Awaiting scan</span>
            )}
          </div>
        </div>
      </header>

      {/* Content column — the portrait "panel" */}
      <main
        className={cx(
          'relative mx-auto w-full max-w-[900px] px-4 pt-5 sm:px-6',
          bare ? 'pb-10' : 'pb-32',
        )}
      >
        {children}
      </main>

      {/* Bottom nav — fixed within thumb reach on a tall screen */}
      {!bare ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-void-900/85 backdrop-blur-xl"
          aria-label="Kiosk sections"
        >
          <div className="mx-auto grid w-full max-w-[900px] grid-cols-4 gap-1 px-3 py-2 sm:px-6">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => router.push(item.href)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cx(
                    'group relative flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 transition',
                    isActive ? 'bg-accent-soft' : 'hover:bg-white/[0.04]',
                  )}
                >
                  <span
                    className={cx(
                      'text-lg leading-none transition',
                      isActive ? 'text-accent' : 'text-white/35 group-hover:text-white/60',
                    )}
                    aria-hidden
                  >
                    {item.glyph}
                  </span>
                  <span
                    className={cx(
                      'font-display text-[9px] font-semibold uppercase tracking-[0.16em] transition',
                      isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70',
                    )}
                  >
                    {item.label}
                  </span>
                  {isActive ? (
                    <span
                      className="absolute inset-x-4 top-0 h-px bg-accent"
                      style={{ boxShadow: '0 0 10px rgb(var(--accent-rgb) / 0.9)' }}
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
