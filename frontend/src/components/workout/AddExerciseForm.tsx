'use client';

import { useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useExerciseLibrary } from '@/hooks/useExerciseLibrary';
import { useToast } from '@/providers/ToastProvider';
import { NeonButton } from '@/components/ui/NeonButton';
import { NumberStepper, SelectField, TextField } from '@/components/ui/Field';
import type { MuscleGroupKey, WorkoutSession } from '@/lib/types';

interface AddExerciseFormProps {
  sessionId: string;
  token: string;
  /** Exercise names already in the session — filtered out of suggestions. */
  existingNames: string[];
  onAdded: (session: WorkoutSession) => void;
  onCancel: () => void;
}

/**
 * "Add today's exercise". The name field is backed by the exercise library so
 * muscle group and prescribed targets fill themselves in, but free text is
 * accepted for anything not in the catalogue.
 */
export function AddExerciseForm({ sessionId, token, existingNames, onAdded, onCancel }: AddExerciseFormProps) {
  const { library } = useExerciseLibrary();
  const toast = useToast();

  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroupKey | ''>('');
  const [targetSets, setTargetSets] = useState(3);
  const [targetReps, setTargetReps] = useState(10);
  const [targetWeight, setTargetWeight] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const taken = useMemo(() => new Set(existingNames.map((item) => item.toLowerCase())), [existingNames]);

  const suggestions = useMemo(() => {
    if (!library) return [];
    const query = name.trim().toLowerCase();
    return library.exercises
      .filter((exercise) => !taken.has(exercise.name.toLowerCase()))
      .filter((exercise) => (query ? exercise.name.toLowerCase().includes(query) : true))
      .slice(0, 8);
  }, [library, name, taken]);

  const muscleOptions = useMemo(
    () => [
      { value: '', label: 'Auto-detect from library' },
      ...(library?.muscleGroups ?? []).map((group) => ({ value: group.key, label: group.label })),
    ],
    [library],
  );

  async function handleSubmit() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Pick or type an exercise name');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const { session } = await api.addExercise(
        sessionId,
        {
          name: trimmed,
          ...(muscleGroup ? { muscleGroup } : {}),
          targetSets,
          targetReps,
          ...(targetWeight > 0 ? { targetWeightKg: targetWeight } : {}),
        },
        token,
      );
      onAdded(session);
      toast.success(`${trimmed} added`, 'Log your first set when you are ready.');
      setName('');
      setMuscleGroup('');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not add that exercise');
    } finally {
      setIsSaving(false);
    }
  }

  /** Selecting a suggestion also seeds the targets from the catalogue entry. */
  function applySuggestion(exerciseName: string, group: MuscleGroupKey) {
    setName(exerciseName);
    setMuscleGroup(group);
    setError(null);
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <TextField
        label="Exercise"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          if (error) setError(null);
        }}
        placeholder="Start typing, e.g. Back Squat"
        autoComplete="off"
        error={error ?? undefined}
        autoFocus
      />

      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((exercise) => (
            <button
              key={exercise.name}
              type="button"
              onClick={() => applySuggestion(exercise.name, exercise.muscleGroup)}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/60 transition hover:border-accent/50 hover:text-accent"
            >
              {exercise.name}
            </button>
          ))}
        </div>
      ) : null}

      <SelectField
        label="Muscle group"
        value={muscleGroup}
        onChange={(event) => setMuscleGroup(event.target.value as MuscleGroupKey | '')}
        options={muscleOptions}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <NumberStepper label="Target sets" value={targetSets} onChange={setTargetSets} min={1} max={20} />
        <NumberStepper label="Target reps" value={targetReps} onChange={setTargetReps} min={1} max={100} />
        <NumberStepper
          label="Target load"
          value={targetWeight}
          onChange={setTargetWeight}
          step={2.5}
          min={0}
          max={500}
          precision={1}
          suffix="kg"
        />
      </div>

      <div className="flex gap-2">
        <NeonButton type="submit" isLoading={isSaving} fullWidth>
          Add exercise
        </NeonButton>
        <NeonButton type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </NeonButton>
      </div>
    </form>
  );
}
