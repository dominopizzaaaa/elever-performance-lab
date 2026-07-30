'use client';

import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Feedback';
import { cx, formatDate, formatRelativeDate, formatVolume, formatWeight } from '@/lib/format';
import type { WorkoutSession } from '@/lib/types';

interface SessionTimelineProps {
  sessions: WorkoutSession[];
}

/**
 * Vertical timeline of past sessions.
 *
 * A portrait screen scrolls naturally, so the timeline runs top-down with a
 * glowing spine; each node expands to reveal the exact sets that were logged.
 */
export function SessionTimeline({ sessions }: SessionTimelineProps) {
  const [openId, setOpenId] = useState<string | null>(sessions[0]?.id ?? null);

  return (
    <ol className="relative flex flex-col gap-2.5">
      {/* Timeline spine */}
      <span
        className="pointer-events-none absolute bottom-4 left-[13px] top-4 w-px"
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgb(var(--accent-rgb) / 0.4), rgb(var(--accent-rgb) / 0.08))',
        }}
        aria-hidden
      />

      {sessions.map((session) => {
        const isOpen = openId === session.id;

        return (
          <li key={session.id} className="relative pl-9">
            {/* Node */}
            <span
              className={cx(
                'absolute left-1.5 top-4 h-[13px] w-[13px] rounded-full border-2 transition',
                session.status === 'completed'
                  ? 'border-accent bg-void-900'
                  : 'border-white/25 bg-void-900',
              )}
              style={
                session.status === 'completed'
                  ? { boxShadow: '0 0 10px rgb(var(--accent-rgb) / 0.8)' }
                  : undefined
              }
              aria-hidden
            />

            <Panel className="overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : session.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-white/[0.02]"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-display text-sm font-bold uppercase tracking-[0.08em] text-white">
                      {session.title}
                    </span>
                    <Badge tone={session.status === 'completed' ? 'success' : 'neutral'}>{session.focus}</Badge>
                  </span>
                  <span className="mt-1 block text-xs text-white/40">
                    {formatRelativeDate(session.date)}
                    <span className="mx-1.5 text-white/20">·</span>
                    {formatDate(session.date)}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums text-white">
                    {formatVolume(session.metrics.volumeKg)}
                  </span>
                  <span className="block text-[11px] tabular-nums text-white/35">
                    {session.metrics.sets} {session.metrics.sets === 1 ? 'set' : 'sets'} ·{' '}
                    {session.metrics.exerciseCount} {session.metrics.exerciseCount === 1 ? 'lift' : 'lifts'}
                  </span>
                </span>

                <span className={cx('shrink-0 text-white/25 transition', isOpen && 'rotate-180')} aria-hidden>
                  ▾
                </span>
              </button>

              {isOpen ? (
                <div className="border-t border-white/[0.06] p-4">
                  {/* Session rollup */}
                  <div className="mb-3 grid grid-cols-4 gap-2">
                    {[
                      { label: 'Reps', value: String(session.metrics.reps) },
                      { label: 'Top set', value: `${session.metrics.topSetKg} kg` },
                      {
                        label: 'Est. 1RM',
                        value: session.metrics.bestEstimatedOneRepMax
                          ? `${session.metrics.bestEstimatedOneRepMax} kg`
                          : '—',
                      },
                      {
                        label: 'Avg RPE',
                        value: session.metrics.averageRpe !== null ? String(session.metrics.averageRpe) : '—',
                      },
                    ].map((stat) => (
                      <div key={stat.label}>
                        <p className="hud-label">{stat.label}</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-white">{stat.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Exercise breakdown */}
                  <ul className="flex flex-col gap-2">
                    {session.exercises.map((exercise) => (
                      <li key={exercise.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="min-w-0 truncate font-display text-[11px] font-bold uppercase tracking-[0.1em] text-white/80">
                            {exercise.name}
                          </p>
                          <p className="shrink-0 text-[11px] capitalize text-white/30">{exercise.muscleGroup}</p>
                        </div>

                        {exercise.sets.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {exercise.sets.map((set, index) => (
                              <span
                                key={set.id}
                                className="rounded-md border border-white/[0.08] bg-void-800/70 px-2 py-1 text-[11px] tabular-nums text-white/65"
                                title={`Set ${index + 1}${set.rpe !== null ? ` · RPE ${set.rpe}` : ''}`}
                              >
                                {formatWeight(set.weightKg)}
                                <span className="mx-1 text-white/25">×</span>
                                {set.reps}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1.5 text-[11px] text-white/25">No sets logged</p>
                        )}
                      </li>
                    ))}
                  </ul>

                  {session.notes ? (
                    <p className="mt-3 border-l-2 border-accent/40 pl-3 text-sm italic text-white/45">
                      {session.notes}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </Panel>
          </li>
        );
      })}
    </ol>
  );
}
