'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { NeonButton } from '@/components/ui/NeonButton';
import { NumberStepper } from '@/components/ui/Field';
import { formatWeight } from '@/lib/format';
import type { SessionExercise, WorkoutSession } from '@/lib/types';

interface SetLoggerProps {
  sessionId: string;
  exercise: SessionExercise;
  token: string;
  onLogged: (session: WorkoutSession) => void;
}

/**
 * Between-sets logger.
 *
 * Prefilled from the member's previous set (or the plan's target if this is the
 * first), because the overwhelmingly common case is repeating the same load —
 * so the default action is one tap on "Log set".
 */
export function SetLogger({ sessionId, exercise, token, onLogged }: SetLoggerProps) {
  const toast = useToast();
  const lastSet = exercise.sets.at(-1);

  const [reps, setReps] = useState(lastSet?.reps ?? exercise.targetReps ?? 10);
  const [weight, setWeight] = useState(lastSet?.weightKg ?? exercise.targetWeightKg ?? 0);
  const [rpe, setRpe] = useState<number | null>(lastSet?.rpe ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Follow the most recent set as it changes (including after a delete/edit).
  useEffect(() => {
    const latest = exercise.sets.at(-1);
    if (latest) {
      setReps(latest.reps);
      setWeight(latest.weightKg);
      setRpe(latest.rpe);
    }
  }, [exercise.sets]);

  async function handleLog() {
    setIsSaving(true);
    setError(null);
    try {
      const result = await api.logSet(
        sessionId,
        exercise.id,
        { reps, weightKg: weight, ...(rpe !== null ? { rpe } : {}) },
        token,
      );
      onLogged(result.session);

      if (result.personalRecord) {
        toast.record(
          `New personal best · ${exercise.name}`,
          `${formatWeight(result.personalRecord.weightKg)} × ${result.personalRecord.reps} — an estimated max lift of ${
            result.personalRecord.estimatedOneRepMax
          } kg.`,
        );
      } else {
        toast.success(
          `Set ${exercise.sets.length + 1} logged`,
          `${formatWeight(weight)} × ${reps}${rpe !== null ? ` · effort ${rpe}/10` : ''}`,
        );
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not log that set');
    } finally {
      setIsSaving(false);
    }
  }

  const setsRemaining = Math.max(0, (exercise.targetSets ?? 0) - exercise.sets.length);

  return (
    <div className="rounded-xl border border-white/[0.07] bg-void-800/50 p-3.5">
      <div className="grid grid-cols-2 gap-3">
        <NumberStepper label="Reps" value={reps} onChange={setReps} min={1} max={200} />
        <NumberStepper
          label="Load"
          value={weight}
          onChange={setWeight}
          step={2.5}
          min={0}
          max={500}
          precision={1}
          suffix="kg"
        />
      </div>

      {/* Effort is optional — a quick tap scale rather than another stepper. */}
      <div className="mt-3">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <p className="hud-label">How hard was that set? · optional</p>
          <p className="text-[10px] text-white/25">1 = easy · 10 = all-out</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRpe(rpe === value ? null : value)}
              aria-pressed={rpe === value}
              className={
                rpe === value
                  ? 'min-w-10 rounded-lg border border-accent/60 bg-accent-soft px-2.5 py-1.5 text-xs font-semibold tabular-nums text-accent'
                  : 'min-w-10 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs tabular-nums text-white/50 transition hover:border-white/25 hover:text-white/80'
              }
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-neon-red">
          {error}
        </p>
      ) : null}

      <NeonButton onClick={handleLog} isLoading={isSaving} fullWidth className="mt-3.5" size="md">
        Log set {exercise.sets.length + 1}
        {setsRemaining > 0 ? ` · ${setsRemaining} to go` : ''}
      </NeonButton>
    </div>
  );
}
