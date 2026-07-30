'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { KioskShell } from '@/components/layout/KioskShell';
import { PageHeading } from '@/components/layout/PageHeading';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { StatTile } from '@/components/ui/StatTile';
import { EmptyState, ErrorNote, LoadingPanel } from '@/components/ui/Feedback';
import { VolumeBarChart } from '@/components/charts/VolumeBarChart';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { HorizontalBars } from '@/components/charts/HorizontalBars';
import { SessionTimeline } from '@/components/history/SessionTimeline';
import { useRequireSession } from '@/providers/SessionProvider';
import { api, ApiError } from '@/lib/api';
import { cx, formatDelta, formatNumber, formatVolume, formatWeekLabel } from '@/lib/format';
import type { UserSummary, WorkoutSession } from '@/lib/types';

type RangeKey = '4w' | '8w' | 'all';

const RANGES: { key: RangeKey; label: string; weeks: number | null }[] = [
  { key: '4w', label: '4 weeks', weeks: 4 },
  { key: '8w', label: '8 weeks', weeks: 8 },
  { key: 'all', label: 'All time', weeks: null },
];

/**
 * Workout history: weekly weight lifted, per-lift strength trends and a full session
 * timeline.
 *
 * Strength is shown as small multiples (one chart per lift) rather than several
 * series on shared axes — converging 1RM lines are unreadable and would need a
 * categorical palette to tell apart.
 */
export default function HistoryPage() {
  const { user, token, isRestoring } = useRequireSession();

  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeKey>('8w');

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!user || !token) return;
      setError(null);
      try {
        const [summaryResult, sessionsResult] = await Promise.all([
          api.getSummary(user.id, token, signal),
          api.listSessions(user.id, token, { limit: 200 }, signal),
        ]);
        setSummary(summaryResult.summary);
        setSessions(sessionsResult.sessions);
      } catch (caught) {
        if ((caught as Error).name === 'AbortError') return;
        setError(caught instanceof ApiError ? caught.message : 'Could not load your history');
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

  const selectedRange = RANGES.find((option) => option.key === range) ?? RANGES[1];

  const weeklyData = useMemo(() => {
    const weeks = summary?.weekly ?? [];
    const sliced = selectedRange.weeks ? weeks.slice(-selectedRange.weeks) : weeks;
    return sliced.map((week) => ({
      label: formatWeekLabel(week.weekKey),
      value: week.volumeKg,
      meta: [
        { label: 'Sessions', value: String(week.sessions) },
        { label: 'Sets', value: String(week.sets) },
      ],
    }));
  }, [summary, selectedRange]);

  const visibleSessions = useMemo(() => {
    if (!selectedRange.weeks) return sessions;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - selectedRange.weeks * 7);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    return sessions.filter((session) => session.date >= cutoffKey);
  }, [sessions, selectedRange]);

  const focusData = useMemo(() => {
    const split = summary?.focusSplit ?? {};
    return Object.entries(split)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [summary]);

  const muscleData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const session of visibleSessions) {
      for (const exercise of session.exercises) {
        const volume = exercise.sets.reduce((sum, set) => sum + set.reps * set.weightKg, 0);
        if (volume <= 0) continue;
        const key = exercise.muscleGroup;
        totals.set(key, (totals.get(key) ?? 0) + volume);
      }
    }
    return [...totals.entries()]
      .map(([label, value]) => ({ label, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [visibleSessions]);

  if (isRestoring || (isLoading && !summary)) {
    return (
      <KioskShell>
        <LoadingPanel label="Rebuilding your timeline" />
      </KioskShell>
    );
  }

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
        eyebrow="Archive"
        title="Workout history"
        detail="Every session you have logged in the lab, with the weight and strength trends derived from it."
      />

      <div className="flex flex-col gap-4">
        {error ? <ErrorNote message={error} onRetry={() => void load()} /> : null}

        {/* Range filter — one row above the charts */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Date range">
          {RANGES.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setRange(option.key)}
              aria-pressed={range === option.key}
              className={cx(
                'rounded-lg border px-3.5 py-2 font-display text-[10px] font-semibold uppercase tracking-[0.16em] transition',
                range === option.key
                  ? 'border-accent/50 bg-accent-soft text-accent'
                  : 'border-white/10 bg-white/[0.03] text-white/45 hover:border-white/25 hover:text-white/75',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatTile label="Sessions" value={visibleSessions.length} hint={selectedRange.label} />
          <StatTile
            label="Weight lifted"
            value={formatVolume(visibleSessions.reduce((sum, session) => sum + session.metrics.volumeKg, 0))}
            hint={selectedRange.label}
          />
          <StatTile
            label="Sets"
            value={formatNumber(visibleSessions.reduce((sum, session) => sum + session.metrics.sets, 0))}
            hint={selectedRange.label}
          />
          {/* Neutral tone: the current week is still being filled in. */}
          <StatTile
            label="Week on week"
            value={deltaPct === null ? '—' : formatDelta(deltaPct, '%')}
            hint="Weight lifted · week in progress"
          />
        </div>

        {/* Weekly weight lifted */}
        <Panel className="p-5">
          <PanelHeader
            label="Training load"
            title="Weekly weight lifted"
            action={
              <span className="font-display text-[10px] uppercase tracking-[0.16em] text-white/30">
                kg moved
              </span>
            }
          />
          {weeklyData.length > 0 ? (
            <VolumeBarChart
              className="mt-4"
              data={weeklyData}
              seriesLabel="Weight lifted"
              unit="kg"
              withTable
            />
          ) : (
            <EmptyState title="No data in this range" />
          )}
        </Panel>

        {/* Strength trends — small multiples */}
        <Panel className="p-5">
          <PanelHeader
            label="Strength"
            title="Estimated max lift"
            action={
              <span className="font-display text-[10px] uppercase tracking-[0.16em] text-white/30">
                Heaviest single you could lift
              </span>
            }
          />

          {summary && summary.strengthTrends.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {summary.strengthTrends.map((trend) => (
                <div key={trend.exercise} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate font-display text-[11px] font-bold uppercase tracking-[0.1em] text-white">
                      {trend.exercise}
                    </p>
                    <p
                      className={cx(
                        'shrink-0 text-xs font-semibold tabular-nums',
                        trend.changeKg > 0
                          ? 'text-neon-lime'
                          : trend.changeKg < 0
                            ? 'text-neon-red'
                            : 'text-white/45',
                      )}
                    >
                      {formatDelta(trend.changeKg, ' kg')}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[11px] tabular-nums text-white/35">
                    now {trend.latest} kg · best {trend.best} kg
                  </p>
                  <TrendLineChart
                    className="mt-2"
                    height={130}
                    data={trend.points.map((point) => ({
                      date: point.date,
                      value: point.estimatedOneRepMax,
                    }))}
                    seriesLabel={`${trend.exercise} estimated max lift`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Not enough data yet"
              detail="Log the same lift on two different days and its trend will appear here."
            />
          )}
        </Panel>

        {/* Splits */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel className="p-5">
            <PanelHeader label="Balance" title="Volume by muscle group" />
            {muscleData.length > 0 ? (
              <HorizontalBars
                className="mt-4"
                data={muscleData}
                seriesLabel="Weight lifted by muscle group"
                unit=" kg"
              />
            ) : (
              <EmptyState title="No volume in this range" />
            )}
          </Panel>

          <Panel className="p-5">
            <PanelHeader label="Split" title="Sessions by focus" />
            {focusData.length > 0 ? (
              <HorizontalBars className="mt-4" data={focusData} seriesLabel="Sessions by focus" />
            ) : (
              <EmptyState title="No sessions yet" />
            )}
          </Panel>
        </div>

        {/* Timeline */}
        <div>
          <PanelHeader
            label="Timeline"
            title={`${visibleSessions.length} sessions`}
            className="mb-3"
          />
          {visibleSessions.length > 0 ? (
            <SessionTimeline sessions={visibleSessions} />
          ) : (
            <Panel className="p-5">
              <EmptyState
                title="Nothing logged in this range"
                detail="Widen the range or head back to the dashboard to start a session."
              />
            </Panel>
          )}
        </div>
      </div>
    </KioskShell>
  );
}
