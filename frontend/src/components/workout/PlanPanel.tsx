'use client';

import { useState } from 'react';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Feedback';
import { cx, formatWeight } from '@/lib/format';
import type { WorkoutPlan } from '@/lib/types';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface PlanPanelProps {
  plan: WorkoutPlan;
  /** Plan day key of today's session, highlighted in the list. */
  activeDayKey?: string | null;
}

/** The member's current programme: phase, notes and every prescribed day. */
export function PlanPanel({ plan, activeDayKey }: PlanPanelProps) {
  const today = new Date().getDay();
  const [openDay, setOpenDay] = useState<string | null>(activeDayKey ?? null);

  if (plan.days.length === 0) {
    return (
      <Panel className="p-5">
        <PanelHeader label="Current plan" title={plan.name} />
        <p className="mt-3 text-sm text-white/40">
          No days assigned yet — a coach will build this out after your assessment.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-5">
      <PanelHeader
        label="Current plan"
        title={plan.name}
        action={<Badge tone="accent">{plan.focus}</Badge>}
      />

      <p className="mt-2 font-display text-[11px] uppercase tracking-[0.16em] text-white/40">{plan.phase}</p>

      {plan.notes ? (
        <p className="mt-3 rounded-lg border-l-2 border-accent/50 bg-white/[0.02] py-2 pl-3 pr-2 text-sm leading-relaxed text-white/55">
          {plan.notes}
        </p>
      ) : null}

      <ul className="mt-4 flex flex-col gap-1.5">
        {plan.days.map((day) => {
          const isToday = day.weekdays.includes(today);
          const isActive = day.key === activeDayKey;
          const isOpen = openDay === day.key;

          return (
            <li key={day.key}>
              <button
                type="button"
                onClick={() => setOpenDay(isOpen ? null : day.key)}
                aria-expanded={isOpen}
                className={cx(
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition',
                  isActive
                    ? 'border-accent/40 bg-accent-soft'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-xs font-bold uppercase tracking-[0.1em] text-white">
                    {day.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-white/35">
                    {day.weekdays.map((weekday) => WEEKDAY_LABELS[weekday]).join(' · ')}
                    <span className="mx-1.5 text-white/20">|</span>
                    {day.exercises.length} exercises
                  </span>
                </span>

                {isActive ? (
                  <Badge tone="accent">Today</Badge>
                ) : isToday ? (
                  <Badge>Scheduled</Badge>
                ) : null}

                <span className={cx('text-white/25 transition', isOpen && 'rotate-180')} aria-hidden>
                  ▾
                </span>
              </button>

              {isOpen ? (
                <ul className="mt-1 flex flex-col gap-1 pl-3">
                  {day.exercises.map((exercise) => (
                    <li
                      key={exercise.name}
                      className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 text-sm"
                    >
                      <span className="min-w-0 truncate text-white/65">{exercise.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-white/35">
                        {exercise.targetSets} × {exercise.targetReps}
                        {exercise.targetWeightKg > 0 ? ` · ${formatWeight(exercise.targetWeightKg)}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
