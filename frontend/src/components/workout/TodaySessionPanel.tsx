'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { NeonButton } from '@/components/ui/NeonButton';
import { EmptyState } from '@/components/ui/Feedback';
import { ExerciseCard, SessionStatusBadge } from './ExerciseCard';
import { AddExerciseForm } from './AddExerciseForm';
import { formatVolume } from '@/lib/format';
import type { User, WorkoutSession } from '@/lib/types';

interface TodaySessionPanelProps {
  user: User;
  token: string;
  session: WorkoutSession | null;
  onSessionChange: (session: WorkoutSession | null) => void;
}

/**
 * Today's training log — the panel a member actually stands in front of.
 *
 * Every mutation returns the recalculated session from the API and replaces
 * local state wholesale, so the displayed tonnage can never drift out of sync
 * with what is on disk.
 */
export function TodaySessionPanel({ user, token, session, onSessionChange }: TodaySessionPanelProps) {
  const toast = useToast();
  const [isStarting, setIsStarting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [openExerciseId, setOpenExerciseId] = useState<string | null>(null);

  /** The exercise a member most likely wants next: the first with sets outstanding. */
  const nextExerciseId = useMemo(() => {
    if (!session) return null;
    const pending = session.exercises.find((exercise) => exercise.sets.length < exercise.targetSets);
    return (pending ?? session.exercises[0])?.id ?? null;
  }, [session]);

  // Open the due exercise by default, and follow along as sets are completed.
  useEffect(() => {
    setOpenExerciseId((current) => {
      if (current && session?.exercises.some((exercise) => exercise.id === current)) return current;
      return nextExerciseId;
    });
  }, [nextExerciseId, session]);

  async function handleStart() {
    setIsStarting(true);
    try {
      const { session: started } = await api.startTodaySession(user.id, token);
      onSessionChange(started);
      toast.success(
        started.title === 'Open Session' ? 'Session started' : `${started.title} loaded`,
        started.exercises.length > 0
          ? `${started.exercises.length} exercises pulled from ${user.currentPlan.name}.`
          : 'Add your first exercise to begin.',
      );
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'Could not start a session');
    } finally {
      setIsStarting(false);
    }
  }

  async function handleFinish() {
    if (!session) return;
    setIsFinishing(true);
    try {
      const nextStatus = session.status === 'completed' ? 'in_progress' : 'completed';
      const { session: updated } = await api.updateSession(session.id, { status: nextStatus }, token);
      onSessionChange(updated);
      toast.success(
        nextStatus === 'completed' ? 'Session complete' : 'Session reopened',
        nextStatus === 'completed'
          ? `${formatVolume(updated.metrics.volumeKg)} moved across ${updated.metrics.sets} sets.`
          : undefined,
      );
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'Could not update the session');
    } finally {
      setIsFinishing(false);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* No session yet                                                         */
  /* ---------------------------------------------------------------------- */
  if (!session) {
    return (
      <Panel accent edge className="p-5">
        <PanelHeader label="Today" title="Nothing logged yet" />
        <EmptyState
          title="Start today's session"
          detail={`We'll pre-load whichever day of ${user.currentPlan.name} is due, then you can log sets as you go.`}
          action={
            <NeonButton size="lg" onClick={handleStart} isLoading={isStarting}>
              Start training
            </NeonButton>
          }
        />
      </Panel>
    );
  }

  const isCompleted = session.status === 'completed';

  return (
    <div className="flex flex-col gap-3">
      {/* Session header */}
      <Panel accent edge className="p-5">
        <PanelHeader
          label="Today's session"
          title={session.title}
          action={<SessionStatusBadge status={session.status} />}
        />

        <div className="mt-4 grid grid-cols-4 gap-2 border-t border-white/[0.06] pt-4">
          {[
            { label: 'Volume', value: formatVolume(session.metrics.volumeKg) },
            { label: 'Sets', value: String(session.metrics.sets) },
            { label: 'Reps', value: String(session.metrics.reps) },
            {
              label: 'Top set',
              value: session.metrics.topSetKg > 0 ? `${session.metrics.topSetKg} kg` : '—',
            },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="hud-label">{stat.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </Panel>

      {/* Exercises */}
      {session.exercises.length > 0 ? (
        <div className="flex flex-col gap-2">
          {session.exercises.map((exercise, index) => (
            <ExerciseCard
              key={exercise.id}
              sessionId={session.id}
              exercise={exercise}
              token={token}
              index={index}
              onUpdated={onSessionChange}
              readOnly={isCompleted}
              isExpanded={openExerciseId === exercise.id}
              onToggle={() =>
                setOpenExerciseId((current) => (current === exercise.id ? null : exercise.id))
              }
            />
          ))}
        </div>
      ) : (
        <Panel className="p-4">
          <EmptyState
            title="No exercises yet"
            detail="Add the first movement of the session below."
          />
        </Panel>
      )}

      {/* Add exercise */}
      {!isCompleted ? (
        <Panel className="p-4">
          {isAdding ? (
            <AddExerciseForm
              sessionId={session.id}
              token={token}
              existingNames={session.exercises.map((exercise) => exercise.name)}
              onAdded={(updated) => {
                onSessionChange(updated);
                setIsAdding(false);
              }}
              onCancel={() => setIsAdding(false)}
            />
          ) : (
            <NeonButton
              variant="outline"
              fullWidth
              size="lg"
              onClick={() => setIsAdding(true)}
              icon={<span aria-hidden>+</span>}
            >
              Add exercise
            </NeonButton>
          )}
        </Panel>
      ) : null}

      {/* Finish / reopen */}
      <NeonButton
        variant={isCompleted ? 'ghost' : 'primary'}
        size="lg"
        fullWidth
        onClick={handleFinish}
        isLoading={isFinishing}
        disabled={!isCompleted && session.metrics.sets === 0}
      >
        {isCompleted ? 'Reopen session' : 'Finish session'}
      </NeonButton>
    </div>
  );
}
