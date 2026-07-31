/**
 * Exercise catalogue powering the kiosk's "Add exercise" autocomplete.
 * `equipment` and `pattern` exist so the future AI Analytics module can decide
 * which form-analysis model applies to an uploaded video.
 */
export const EXERCISE_LIBRARY = [
  // Chest
  { name: 'Barbell Bench Press', muscleGroup: 'chest', equipment: 'barbell', pattern: 'horizontal-push', videoAnalysis: true },
  { name: 'Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell', pattern: 'horizontal-push', videoAnalysis: true },
  { name: 'Cable Fly', muscleGroup: 'chest', equipment: 'cable', pattern: 'isolation' },
  { name: 'Machine Chest Press', muscleGroup: 'chest', equipment: 'machine', pattern: 'horizontal-push' },
  { name: 'Weighted Dip', muscleGroup: 'chest', equipment: 'bodyweight', pattern: 'vertical-push' },

  // Back
  { name: 'Deadlift', muscleGroup: 'back', equipment: 'barbell', pattern: 'hinge', videoAnalysis: true },
  { name: 'Barbell Row', muscleGroup: 'back', equipment: 'barbell', pattern: 'horizontal-pull', videoAnalysis: true },
  { name: 'Pull-Up', muscleGroup: 'back', equipment: 'bodyweight', pattern: 'vertical-pull', videoAnalysis: true },
  { name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'cable', pattern: 'vertical-pull' },
  { name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'cable', pattern: 'horizontal-pull' },
  { name: 'Chest-Supported Row', muscleGroup: 'back', equipment: 'machine', pattern: 'horizontal-pull' },
  { name: 'Rack Pull', muscleGroup: 'back', equipment: 'barbell', pattern: 'hinge' },

  // Shoulders
  { name: 'Overhead Press', muscleGroup: 'shoulders', equipment: 'barbell', pattern: 'vertical-push', videoAnalysis: true },
  { name: 'Seated Dumbbell Press', muscleGroup: 'shoulders', equipment: 'dumbbell', pattern: 'vertical-push' },
  { name: 'Lateral Raise', muscleGroup: 'shoulders', equipment: 'dumbbell', pattern: 'isolation' },
  { name: 'Face Pull', muscleGroup: 'shoulders', equipment: 'cable', pattern: 'horizontal-pull' },
  { name: 'Rear Delt Fly', muscleGroup: 'shoulders', equipment: 'dumbbell', pattern: 'isolation' },

  // Arms
  { name: 'Barbell Curl', muscleGroup: 'biceps', equipment: 'barbell', pattern: 'isolation' },
  { name: 'Incline Dumbbell Curl', muscleGroup: 'biceps', equipment: 'dumbbell', pattern: 'isolation' },
  { name: 'Hammer Curl', muscleGroup: 'biceps', equipment: 'dumbbell', pattern: 'isolation' },
  { name: 'Cable Triceps Pushdown', muscleGroup: 'triceps', equipment: 'cable', pattern: 'isolation' },
  { name: 'Skull Crusher', muscleGroup: 'triceps', equipment: 'barbell', pattern: 'isolation' },
  { name: 'Overhead Cable Extension', muscleGroup: 'triceps', equipment: 'cable', pattern: 'isolation' },
  { name: 'Farmer Carry', muscleGroup: 'forearms', equipment: 'dumbbell', pattern: 'carry' },

  // Legs
  { name: 'Back Squat', muscleGroup: 'quads', equipment: 'barbell', pattern: 'squat', videoAnalysis: true },
  { name: 'Front Squat', muscleGroup: 'quads', equipment: 'barbell', pattern: 'squat', videoAnalysis: true },
  { name: 'Hack Squat', muscleGroup: 'quads', equipment: 'machine', pattern: 'squat' },
  { name: 'Leg Press', muscleGroup: 'quads', equipment: 'machine', pattern: 'squat' },
  { name: 'Walking Lunge', muscleGroup: 'quads', equipment: 'dumbbell', pattern: 'lunge', videoAnalysis: true },
  { name: 'Bulgarian Split Squat', muscleGroup: 'glutes', equipment: 'dumbbell', pattern: 'lunge', videoAnalysis: true },
  { name: 'Romanian Deadlift', muscleGroup: 'hamstrings', equipment: 'barbell', pattern: 'hinge', videoAnalysis: true },
  { name: 'Hip Thrust', muscleGroup: 'glutes', equipment: 'barbell', pattern: 'hinge' },
  { name: 'Seated Leg Curl', muscleGroup: 'hamstrings', equipment: 'machine', pattern: 'isolation' },
  { name: 'Leg Extension', muscleGroup: 'quads', equipment: 'machine', pattern: 'isolation' },
  { name: 'Standing Calf Raise', muscleGroup: 'calves', equipment: 'machine', pattern: 'isolation' },

  // Power / athletic
  { name: 'Power Clean', muscleGroup: 'back', equipment: 'barbell', pattern: 'olympic', videoAnalysis: true },
  { name: 'Trap Bar Jump', muscleGroup: 'quads', equipment: 'barbell', pattern: 'jump', videoAnalysis: true },
  { name: 'Box Jump', muscleGroup: 'quads', equipment: 'bodyweight', pattern: 'jump', videoAnalysis: true },
  { name: 'Medicine Ball Slam', muscleGroup: 'core', equipment: 'other', pattern: 'throw' },

  // Badminton specific — court patterns loaded on the gym floor
  { name: 'Split-Step Drop Jump', muscleGroup: 'quads', equipment: 'bodyweight', pattern: 'jump', videoAnalysis: true },
  { name: 'Lateral Court Bound', muscleGroup: 'glutes', equipment: 'bodyweight', pattern: 'jump', videoAnalysis: true },
  { name: 'Net Lunge', muscleGroup: 'quads', equipment: 'dumbbell', pattern: 'lunge', videoAnalysis: true },
  { name: 'Overhead Med-Ball Smash Throw', muscleGroup: 'shoulders', equipment: 'other', pattern: 'throw' },
  { name: 'Rotational Med-Ball Throw', muscleGroup: 'core', equipment: 'other', pattern: 'throw' },
  { name: 'Wrist Pronation', muscleGroup: 'forearms', equipment: 'dumbbell', pattern: 'isolation' },
  { name: 'Resisted Shoulder External Rotation', muscleGroup: 'shoulders', equipment: 'cable', pattern: 'isolation' },
  { name: 'Shadow Footwork Drill', muscleGroup: 'conditioning', equipment: 'bodyweight', pattern: 'footwork' },
  { name: 'Court Sprint Intervals', muscleGroup: 'conditioning', equipment: 'bodyweight', pattern: 'conditioning' },

  // Core / conditioning
  { name: 'Hanging Leg Raise', muscleGroup: 'core', equipment: 'bodyweight', pattern: 'isolation' },
  { name: 'Cable Crunch', muscleGroup: 'core', equipment: 'cable', pattern: 'isolation' },
  { name: 'Weighted Plank', muscleGroup: 'core', equipment: 'bodyweight', pattern: 'anti-extension' },
  { name: 'Ab Wheel Rollout', muscleGroup: 'core', equipment: 'other', pattern: 'anti-extension' },
  { name: 'Assault Bike Intervals', muscleGroup: 'conditioning', equipment: 'machine', pattern: 'conditioning' },
  { name: 'Rowing Intervals', muscleGroup: 'conditioning', equipment: 'machine', pattern: 'conditioning' },
  { name: 'Sled Push', muscleGroup: 'conditioning', equipment: 'other', pattern: 'conditioning' },
];
