import { readJson } from '../lib/jsonStore.js';

const FILE = 'exercise-library.json';

export async function getLibrary() {
  const data = await readJson(FILE);
  return {
    muscleGroups: data.muscleGroups ?? [],
    exercises: data.exercises ?? [],
  };
}

/**
 * Looks up a catalogue entry by name so logged exercises inherit the right
 * muscle group without the member having to pick one.
 * @param {string} name
 */
export async function findExerciseByName(name) {
  const { exercises } = await getLibrary();
  const needle = String(name ?? '').trim().toLowerCase();
  return exercises.find((exercise) => exercise.name.toLowerCase() === needle) ?? null;
}
