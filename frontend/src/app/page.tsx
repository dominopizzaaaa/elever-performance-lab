'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KioskShell } from '@/components/layout/KioskShell';
import { Wordmark } from '@/components/layout/Wordmark';
import { ConfirmMember } from '@/components/auth/ConfirmMember';
import { NeonButton } from '@/components/ui/NeonButton';
import { Panel } from '@/components/ui/Panel';
import { useSession } from '@/providers/SessionProvider';
import { useToast } from '@/providers/ToastProvider';
import { api, ApiError } from '@/lib/api';
import { cx } from '@/lib/format';
import type { MemberIdentity } from '@/lib/types';

/** The three hard-coded members, offered as one-tap shortcuts for the demo. */
const DEMO_MEMBERS = ['Dominic', 'Kean Hean', 'Chin An'] as const;

const FEATURES = [
  { title: 'Live set logging', detail: 'Reps, load and effort captured between sets.' },
  { title: 'Progress analytics', detail: 'Weight lifted, streaks and estimated max-lift trends.' },
  { title: 'AI form analysis', detail: 'Video technique scoring — coming soon.' },
] as const;

/** Scrolling status strip along the bottom of the scan screen. */
const TICKER_ITEMS = [
  'Terminal 01 · main floor',
  'Set logging · online',
  'Progress analytics · online',
  'AI form analysis · calibrating',
  'Card reader · ready',
  'Data store · synced',
] as const;

export default function LandingPage() {
  const { user, isRestoring, scanIn } = useSession();
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  /**
   * Scan-in is two steps: resolve the typed name, then confirm it is the right
   * person. Holding the resolved member here is what lets the second screen say
   * whose profile is about to open.
   */
  const [pending, setPending] = useState<MemberIdentity | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Already scanned in (e.g. after a refresh) — go straight to the dashboard.
  useEffect(() => {
    if (!isRestoring && user) router.replace('/dashboard');
  }, [isRestoring, user, router]);

  useEffect(() => {
    if (!pending) inputRef.current?.focus();
  }, [pending]);

  /** Step 1 — who is this? */
  async function handleLookup(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setError('Enter your name to scan in');
      inputRef.current?.focus();
      return;
    }

    setIsScanning(true);
    setError(null);
    try {
      const { member } = await api.lookupMember(trimmed);
      setConfirmError(null);
      setPending(member);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not reach the reader. Try again.');
      inputRef.current?.focus();
    } finally {
      setIsScanning(false);
    }
  }

  /** Step 2 — is that you? */
  async function handleConfirm() {
    if (!pending) return;

    setIsScanning(true);
    setConfirmError(null);
    try {
      const member = await scanIn(pending.name);
      toast.success(`Welcome back, ${member.name}`, member.tagline);
      router.push('/dashboard');
    } catch (caught) {
      setConfirmError(
        caught instanceof ApiError ? caught.message : 'Could not reach the reader. Try again.',
      );
    } finally {
      setIsScanning(false);
    }
  }

  function cancelConfirm() {
    setPending(null);
    setConfirmError(null);
  }

  return (
    <KioskShell bare>
      <div className="flex min-h-[calc(100vh-8rem)] flex-col justify-center gap-10 py-8">
        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                             */}
        {/* ---------------------------------------------------------------- */}
        <section className="text-center">
          <div className="flex justify-center">
            <div className="animate-float">
              <Wordmark size="lg" className="flex-col gap-4 sm:flex-row sm:gap-5" />
            </div>
          </div>

          <p className="mx-auto mt-7 max-w-lg text-balance text-base leading-relaxed text-white/50 sm:text-lg">
            Step onto the floor. The lab is already tracking — every set, every kilo, every rep,
            rendered on your own performance model.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="chip">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-lime" aria-hidden />
              Terminal online
            </span>
            <span className="chip">Portrait kiosk · 1080 × 1920</span>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Card reader                                                      */}
        {/* ---------------------------------------------------------------- */}
        <Panel accent edge brackets className="overflow-hidden p-6 sm:p-8">
          {/* Sweeping reader beam */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-24 animate-scan-down"
            style={{
              background:
                'linear-gradient(to bottom, transparent, rgb(var(--accent-rgb) / 0.13), transparent)',
            }}
            aria-hidden
          />

          {pending ? (
            <ConfirmMember
              member={pending}
              onConfirm={() => void handleConfirm()}
              onCancel={cancelConfirm}
              isOpening={isScanning}
              error={confirmError}
            />
          ) : (
            <div className="relative">
              <h2 className="text-center font-display text-lg font-bold uppercase tracking-[0.2em] text-white sm:text-xl">
                Enter your name to begin
              </h2>
              <p className="mt-2 text-center text-sm text-white/40">
                Typing your name simulates tapping your member card on the reader.
              </p>

              <form
                className="mt-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleLookup(name);
                }}
              >
                <div>
                  <input
                    ref={inputRef}
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="Your name"
                    autoComplete="off"
                    autoCapitalize="words"
                    spellCheck={false}
                    aria-label="Member name"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'scan-error' : undefined}
                    className={cx(
                      'field h-16 text-center font-display text-xl font-bold uppercase tracking-[0.18em]',
                      error && '!border-neon-red/60',
                    )}
                  />
                </div>

                {error ? (
                  <p id="scan-error" role="alert" className="mt-3 text-center text-sm text-neon-red">
                    {error}
                  </p>
                ) : null}

                <NeonButton
                  type="submit"
                  size="lg"
                  fullWidth
                  isLoading={isScanning}
                  className="mt-5"
                  icon={!isScanning ? <span aria-hidden>▶</span> : undefined}
                >
                  {isScanning ? 'Reading card' : 'Scan in'}
                </NeonButton>
              </form>

              {/* Demo shortcuts */}
              <div className="mt-7 border-t border-white/[0.07] pt-5">
                <p className="hud-label text-center">Registered members</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {DEMO_MEMBERS.map((member) => (
                    <button
                      key={member}
                      type="button"
                      disabled={isScanning}
                      onClick={() => {
                        setName(member);
                        void handleLookup(member);
                      }}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65 transition hover:border-accent/50 hover:bg-accent-soft hover:text-accent disabled:opacity-40"
                    >
                      {member}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-center text-xs text-white/25">
                  Tap a name, confirm it&apos;s you, and your profile opens.
                </p>
              </div>
            </div>
          )}
        </Panel>

        {/* ---------------------------------------------------------------- */}
        {/* Feature strip                                                    */}
        {/* ---------------------------------------------------------------- */}
        <section className="grid gap-3 sm:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <Panel key={feature.title} className="p-4">
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
                {String(index + 1).padStart(2, '0')}
              </p>
              <p className="mt-2 font-display text-sm font-bold uppercase tracking-[0.1em] text-white">
                {feature.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/40">{feature.detail}</p>
            </Panel>
          ))}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Status ticker                                                    */}
        {/* ---------------------------------------------------------------- */}
        <div
          className="relative overflow-hidden border-y border-white/[0.06] py-2.5"
          aria-label="Terminal status"
        >
          <div className="flex w-max animate-ticker">
            {/* Duplicated once so the -50% translation loops seamlessly. */}
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
                {TICKER_ITEMS.map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-3 whitespace-nowrap px-6 font-display text-[10px] font-semibold uppercase tracking-[0.24em] text-white/30"
                  >
                    <span className="h-1 w-1 rounded-full bg-accent" aria-hidden />
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-white/25">
          Staff?{' '}
          <Link
            href="/admin"
            className="font-display uppercase tracking-[0.16em] text-white/45 underline decoration-white/20 underline-offset-4 transition hover:text-accent"
          >
            Open the admin panel
          </Link>
        </p>
      </div>
    </KioskShell>
  );
}
