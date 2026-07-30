'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Feedback';
import { NeonButton } from '@/components/ui/NeonButton';
import { SetLogger } from './SetLogger';
import { cx, formatTime, formatWeight } from '@/lib/format';
import type { LoggedSet, SessionExercise, WorkoutSession } from '@/lib/types';

interface ExerciseCardProps {
  sessionId: string;
  exercise: SessionExercise;
  token: string;
  index: number;
  onUpdated: (session: WorkoutSession) => void;
  /** Completed sessions render read-only. */
  readOnly?: boolean;
  /**
   * Accordion state, owned by the parent. Only one exercise is open at a time so
   * the member is never scrolling past four collapsed loggers to reach theirs.
   */
  isExpanded: boolean;
  onToggle: () => void;
}

/** One exercise: prescribed target, the sets logged so far, and the logger. */
export function ExerciseCard({
  sessionId,
  exercise,
  token,
  index,
  onUpdated,
  readOnly = false,
  isExpanded,
  onToggle,
}: ExerciseCardProps) {
  const toast = useToast();
  const [isRemoving, setIsRemoving] = useState(false);

  const volume = exercise.sets.reduce((total, set) => total + set.reps * set.weightKg, 0);
  const isComplete = exercise.sets.length >= (exercise.targetSets ?? Infinity);

  async function handleRemoveExercise() {
    setIsRemoving(true);
    try {
      const { session } = await api.removeExercise(sessionId, exercise.id, token);
      onUpdated(session);
      toast.info(`${exercise.name} removed`);
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'Could not remove that exercise');
      setIsRemoving(false);
    }
  }

  return (
    <Panel className={cx('overflow-hidden transition', isRemoving && 'opacity-40')}>
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-white/[0.02]"
      >
        <span
          className={cx(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border font-display text-xs font-bold tabular-nums',
            isComplete
              ? 'border-neon-lime/40 bg-neon-lime/10 text-neon-lime'
              : 'border-white/10 bg-white/[0.03] text-white/45',
          )}
          aria-hidden
        >
          {isComplete ? '✓' : String(index + 1).padStart(2, '0')}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-bold uppercase tracking-[0.08em] text-white">
            {exercise.name}
          </span>
          <span className="mt-0.5 block text-xs text-white/40">
            {exercise.targetSets} × {exercise.targetReps}
            {exercise.targetWeightKg > 0 ? ` @ ${formatWeight(exercise.targetWeightKg)}` : ''}
            <span className="mx-1.5 text-white/20">·</span>
            <span className="capitalize">{exercise.muscleGroup}</span>
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="block text-sm font-semibold tabular-nums text-white">
            {exercise.sets.length}
            <span className="text-white/30">/{exercise.targetSets}</span>
          </span>
          {volume > 0 ? (
            <span className="block text-[11px] tabular-nums text-white/35">{Math.round(volume)} kg</span>
          ) : null}
        </span>

        <span className={cx('shrink-0 text-white/25 transition', isExpanded && 'rotate-180')} aria-hidden>
          ▾
        </span>
      </button>

      {isExpanded ? (
        <div className="border-t border-white/[0.06] p-4 pt-3.5">
          {/* Logged sets */}
          {exercise.sets.length > 0 ? (
            <ul className="mb-3.5 flex flex-col gap-1.5">
              {exercise.sets.map((set, setIndex) => (
                <SetRow
                  key={set.id}
                  set={set}
                  index={setIndex}
                  sessionId={sessionId}
                  exerciseId={exercise.id}
                  token={token}
                  readOnly={readOnly}
                  onUpdated={onUpdated}
                />
              ))}
            </ul>
          ) : (
            <p className="mb-3.5 rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs text-white/30">
              No sets logged yet
            </p>
          )}

          {!readOnly ? (
            <>
              <SetLogger sessionId={sessionId} exercise={exercise} token={token} onLogged={onUpdated} />

              <button
                type="button"
                onClick={handleRemoveExercise}
                disabled={isRemoving}
                className="mt-3 w-full rounded-lg py-2 font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25 transition hover:text-neon-red disabled:opacity-40"
              >
                Remove exercise
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}

interface SetRowProps {
  set: LoggedSet;
  index: number;
  sessionId: string;
  exerciseId: string;
  token: string;
  readOnly: boolean;
  onUpdated: (session: WorkoutSession) => void;
}

/** A logged set, with inline correction and delete. */
function SetRow({ set, index, sessionId, exerciseId, token, readOnly, onUpdated }: SetRowProps) {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [reps, setReps] = useState(set.reps);
  const [weight, setWeight] = useState(set.weightKg);
  const [isBusy, setIsBusy] = useState(false);

  async function handleSave() {
    setIsBusy(true);
    try {
      const { session } = await api.updateSet(sessionId, exerciseId, set.id, { reps, weightKg: weight }, token);
      onUpdated(session);
      setIsEditing(false);
      toast.success('Set corrected');
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'Could not update that set');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete() {
    setIsBusy(true);
    try {
      const { session } = await api.removeSet(sessionId, exerciseId, set.id, token);
      onUpdated(session);
      toast.info('Set deleted');
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'Could not delete that set');
      setIsBusy(false);
    }
  }

  if (isEditing) {
    return (
      <li className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft px-2.5 py-2">
        <span className="hud-label w-8 shrink-0">{String(index + 1).padStart(2, '0')}</span>
        <input
          type="number"
          value={weight}
          step={2.5}
          min={0}
          onChange={(event) => setWeight(Number.parseFloat(event.target.value) || 0)}
          aria-label="Weight in kilograms"
          className="min-w-0 flex-1 rounded-md border border-white/15 bg-void-800 px-2 py-1 text-sm tabular-nums text-white"
        />
        <span className="shrink-0 text-xs text-white/35">kg ×</span>
        <input
          type="number"
          value={reps}
          min={1}
          onChange={(event) => setReps(Number.parseInt(event.target.value, 10) || 1)}
          aria-label="Reps"
          className="w-16 shrink-0 rounded-md border border-white/15 bg-void-800 px-2 py-1 text-sm tabular-nums text-white"
        />
        <NeonButton size="sm" onClick={handleSave} isLoading={isBusy}>
          Save
        </NeonButton>
        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="shrink-0 px-1 text-white/35 transition hover:text-white"
          aria-label="Cancel edit"
        >
          ×
        </button>
      </li>
    );
  }

  return (
    <li
      className={cx(
        'flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2',
        isBusy && 'opacity-40',
      )}
    >
      <span className="hud-label w-8 shrink-0">{String(index + 1).padStart(2, '0')}</span>

      <span className="min-w-0 flex-1 text-sm tabular-nums text-white">
        {formatWeight(set.weightKg)}
        <span className="mx-1.5 text-white/25">×</span>
        {set.reps}
        {set.rpe !== null ? <span className="ml-2 text-xs text-white/35">RPE {set.rpe}</span> : null}
      </span>

      <span className="shrink-0 text-[11px] tabular-nums text-white/25">{formatTime(set.completedAt)}</span>

      {!readOnly ? (
        <span className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            disabled={isBusy}
            className="rounded px-1.5 py-0.5 text-[11px] text-white/30 transition hover:text-accent"
            aria-label={`Edit set ${index + 1}`}
          >
            edit
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isBusy}
            className="rounded px-1.5 py-0.5 text-white/30 transition hover:text-neon-red"
            aria-label={`Delete set ${index + 1}`}
          >
            ×
          </button>
        </span>
      ) : null}
    </li>
  );
}

/** Small status pill reused by the session header. */
export function SessionStatusBadge({ status }: { status: WorkoutSession['status'] }) {
  if (status === 'completed') return <Badge tone="success">Completed</Badge>;
  if (status === 'in_progress') return <Badge tone="live">Live</Badge>;
  return <Badge>Planned</Badge>;
}
