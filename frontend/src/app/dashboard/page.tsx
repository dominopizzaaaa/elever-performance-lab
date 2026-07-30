'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { KioskShell } from '@/components/layout/KioskShell';
import { PageHeading } from '@/components/layout/PageHeading';
import { AiBodyAvatar } from '@/components/avatar/AiBodyAvatar';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { StatTile } from '@/components/ui/StatTile';
import { ProgressBar, ProgressRing } from '@/components/ui/ProgressBar';
import { Badge, ErrorNote, LoadingPanel } from '@/components/ui/Feedback';
import { Sparkline } from '@/components/charts/Sparkline';
import { ProfilePanel } from '@/components/profile/ProfilePanel';
import { PersonalRecords } from '@/components/profile/PersonalRecords';
import { TodaySessionPanel } from '@/components/workout/TodaySessionPanel';
import { PlanPanel } from '@/components/workout/PlanPanel';
import { useRequireSession, useSession } from '@/providers/SessionProvider';
import { api, ApiError } from '@/lib/api';
import { formatDelta, formatVolume } from '@/lib/format';
import type { MuscleGroupKey, UserSummary, WorkoutSession } from '@/lib/types';

/**
 * Member dashboard — the kiosk's main screen.
 *
 * Section order is chosen for a tall portrait panel: identity and body model at
 * eye level, today's log (the part that gets touched) in the middle, then plan
 * and profile context below the fold. Everything is one column; nothing relies
 * on horizontal space.
 */
export default function DashboardPage() {
  const { user, token, isRestoring } = useRequireSession();
  const { setUser } = useSession();

  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!user || !token) return;
      setError(null);
      try {
        const [summaryResult, todayResult] = await Promise.all([
          api.getSummary(user.id, token, signal),
          api.getTodaySession(user.id, token, signal),
        ]);
        setSummary(summaryResult.summary);
        setSession(todayResult.session);
      } catch (caught) {
        if ((caught as Error).name === 'AbortError') return;
        setError(caught instanceof ApiError ? caught.message : 'Could not load your dashboard');
      } finally {
        setIsLoading(false);
      }
    },
    [user, token],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /** Recompute derived stats after a write so the HUD and avatar stay truthful. */
  const refreshSummary = useCallback(async () => {
    if (!user || !token) return;
    try {
      const { summary: fresh } = await api.getSummary(user.id, token);
      setSummary(fresh);
    } catch {
      /* session state is already correct; stats catch up on the next load */
    }
  }, [user, token]);

  const handleSessionChange = useCallback(
    (next: WorkoutSession | null) => {
      setSession(next);
      void refreshSummary();
    },
    [refreshSummary],
  );

  /** Groups worked in today's session — these pulse on the avatar. */
  const activeGroups = useMemo<MuscleGroupKey[]>(() => {
    if (!session) return [];
    return [
      ...new Set(
        session.exercises
          .filter((exercise) => exercise.sets.length > 0)
          .map((exercise) => exercise.muscleGroup),
      ),
    ];
  }, [session]);

  const weeklyTonnage = useMemo(() => summary?.weekly.map((week) => week.volumeKg) ?? [], [summary]);

  if (isRestoring || (isLoading && !summary)) {
    return (
      <KioskShell>
        <LoadingPanel label="Loading your model" />
      </KioskShell>
    );
  }

  // useRequireSession redirects to the scan screen when there is no member.
  if (!user || !token) {
    return (
      <KioskShell>
        <LoadingPanel label="Returning to scan" />
      </KioskShell>
    );
  }

  const deltaPct = summary?.weekOverWeek.volumeDeltaPct ?? null;

  return (
    <KioskShell>
      <PageHeading
        eyebrow="Member terminal"
        title={`Welcome, ${user.name.split(' ')[0]}`}
        detail={user.tagline}
        action={
          session && session.metrics.sets > 0 ? <Badge tone="live">Training</Badge> : <Badge>Idle</Badge>
        }
      />

      <div className="flex flex-col gap-4">
        {error ? <ErrorNote message={error} onRetry={() => void load()} /> : null}

        {/* ---------------------------------------------------------------- */}
        {/* Body model + weekly goals                                        */}
        {/* ---------------------------------------------------------------- */}
        <Panel accent edge brackets className="overflow-hidden p-5">
          <PanelHeader label="Performance model" title="Body scan" />

          <div className="mt-3 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <AiBodyAvatar
              muscleLoad={summary?.muscleLoad ?? {}}
              activeGroups={activeGroups}
              className="w-full sm:flex-1"
            />

            <div className="flex w-full flex-col items-center gap-4 sm:w-48">
              <ProgressRing value={summary?.thisWeek.volumeGoalPct ?? 0}>
                <span className="text-2xl font-semibold tabular-nums leading-none text-white">
                  {summary?.thisWeek.volumeGoalPct ?? 0}
                  <span className="text-sm text-white/40">%</span>
                </span>
                <span className="hud-label mt-1">Weekly</span>
              </ProgressRing>

              <div className="w-full">
                <ProgressBar
                  label="Sessions"
                  value={summary?.thisWeek.sessionGoalPct ?? 0}
                  caption={`${summary?.thisWeek.sessions ?? 0} / ${user.goals.weeklySessions}`}
                />
                <ProgressBar
                  className="mt-3"
                  label="Tonnage"
                  value={summary?.thisWeek.volumeGoalPct ?? 0}
                  caption={`${formatVolume(summary?.thisWeek.volumeKg ?? 0)} / ${formatVolume(
                    user.goals.weeklyVolumeKg,
                  )}`}
                />
              </div>
            </div>
          </div>

          <p className="mt-4 border-t border-white/[0.06] pt-3 text-xs leading-relaxed text-white/35">
            Brightness tracks how much volume each region absorbed over the last 14 days. Posterior groups
            (back, hamstrings, glutes, triceps) show as lateral bands on a front-facing model.
          </p>
        </Panel>

        {/* ---------------------------------------------------------------- */}
        {/* Headline stats                                                   */}
        {/* ---------------------------------------------------------------- */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile
            label="Streak"
            value={summary?.streakDays ?? 0}
            unit={summary?.streakDays === 1 ? 'day' : 'days'}
            tone="accent"
            hint={summary?.streakDays ? 'Keep it alive' : 'Train today to start'}
          />
          {/* Neutral tone on purpose: a week in progress always compares badly
              against a completed one, so colouring it red would be misleading. */}
          <StatTile
            label="This week"
            value={formatVolume(summary?.thisWeek.volumeKg ?? 0)}
            hint={
              deltaPct === null
                ? 'No prior week'
                : `${formatDelta(deltaPct, '%')} vs last week · in progress`
            }
          />
          <StatTile label="Sessions" value={summary?.totals.sessions ?? 0} hint="All time" />
          <StatTile
            label="Total moved"
            value={formatVolume(summary?.totals.volumeKg ?? 0)}
            hint={`${summary?.totals.sets ?? 0} sets logged`}
          />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Today's log                                                      */}
        {/* ---------------------------------------------------------------- */}
        <TodaySessionPanel
          user={user}
          token={token}
          session={session}
          onSessionChange={handleSessionChange}
        />

        {/* ---------------------------------------------------------------- */}
        {/* Trailing 8 weeks                                                 */}
        {/* ---------------------------------------------------------------- */}
        {weeklyTonnage.length > 1 ? (
          <Panel className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="hud-label">Trailing 8 weeks</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                  {formatVolume(summary?.totals.volumeKg ?? 0)}
                  <span className="ml-2 text-xs font-normal text-white/35">total tonnage</span>
                </p>
              </div>
              <Sparkline values={weeklyTonnage} width={150} height={38} label="Weekly tonnage trend" />
            </div>
          </Panel>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Profile, plan, records                                           */}
        {/* ---------------------------------------------------------------- */}
        <ProfilePanel user={user} token={token} onUpdated={setUser} />
        <PlanPanel plan={user.currentPlan} activeDayKey={session?.planDayKey ?? null} />
        <PersonalRecords records={user.personalRecords} />
      </div>
    </KioskShell>
  );
}
