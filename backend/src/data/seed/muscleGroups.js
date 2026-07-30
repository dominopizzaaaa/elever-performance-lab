/**
 * Canonical muscle groups. These keys are shared with the frontend AI body
 * avatar, which lights up regions based on recent training volume, so keep the
 * list and the avatar's SVG region map in sync.
 * @see frontend/src/components/avatar/muscleRegions.ts
 */
export const MUSCLE_GROUPS = [
  { key: 'chest', label: 'Chest' },
  { key: 'back', label: 'Back' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'biceps', label: 'Biceps' },
  { key: 'triceps', label: 'Triceps' },
  { key: 'forearms', label: 'Forearms' },
  { key: 'core', label: 'Core' },
  { key: 'glutes', label: 'Glutes' },
  { key: 'quads', label: 'Quads' },
  { key: 'hamstrings', label: 'Hamstrings' },
  { key: 'calves', label: 'Calves' },
  { key: 'conditioning', label: 'Conditioning' },
];

export const MUSCLE_GROUP_KEYS = MUSCLE_GROUPS.map((group) => group.key);
