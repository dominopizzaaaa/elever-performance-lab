import { z } from 'zod';
import { MUSCLE_GROUP_KEYS } from '../data/seed/muscleGroups.js';

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date');

const weightKg = z
  .number({ invalid_type_error: 'Weight must be a number' })
  .min(0, 'Weight cannot be negative')
  .max(1000, 'Weight looks unrealistic (max 1000 kg)');

const reps = z
  .number({ invalid_type_error: 'Reps must be a number' })
  .int('Reps must be a whole number')
  .min(1, 'Log at least 1 rep')
  .max(500, 'Reps look unrealistic (max 500)');

const rpe = z
  .number()
  .min(1, 'RPE ranges from 1 to 10')
  .max(10, 'RPE ranges from 1 to 10')
  .nullable()
  .optional();

const muscleGroup = z.enum(/** @type {[string, ...string[]]} */ (MUSCLE_GROUP_KEYS));

const gender = z.enum(['male', 'female']);

export const scanSchema = z.object({
  name: z
    .string({ required_error: 'Enter your name to scan in' })
    .trim()
    .min(2, 'Enter at least 2 characters')
    .max(60, 'That name is too long'),
});

export const adminLoginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(60),
  password: z.string().min(1, 'Password is required').max(200),
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).max(60).optional(),
    age: z.number().int().min(10, 'Age must be at least 10').max(100).optional(),
    weightKg: weightKg.optional(),
    heightCm: z.number().min(80).max(260).optional(),
    gender: gender.optional(),
    bodyFatPct: z.number().min(2).max(60).nullable().optional(),
    restingHr: z.number().int().min(30).max(140).nullable().optional(),
    tagline: z.string().trim().max(140).optional(),
    tier: z.string().trim().max(40).optional(),
    goals: z
      .object({
        weeklySessions: z.number().int().min(1).max(14).optional(),
        weeklyVolumeKg: z.number().min(0).max(500_000).optional(),
        targetWeightKg: weightKg.optional(),
        focus: z.string().trim().max(60).optional(),
      })
      .optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(60),
  age: z.number().int().min(10).max(100),
  weightKg,
  heightCm: z.number().min(80).max(260).optional(),
  gender: gender.optional(),
  bodyFatPct: z.number().min(2).max(60).nullable().optional(),
  tier: z.string().trim().max(40).optional(),
  tagline: z.string().trim().max(140).optional(),
  accentColor: z.enum(['cyan', 'magenta', 'lime', 'violet', 'amber']).optional(),
});

export const createSessionSchema = z.object({
  date: dateKey.optional(),
  title: z.string().trim().min(1).max(80).optional(),
  focus: z.string().trim().min(1).max(40).optional(),
  planDayKey: z.string().trim().max(60).nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
  /** Seed the session with the plan day's prescribed exercises. */
  fromPlanDay: z.string().trim().max(60).optional(),
});

export const updateSessionSchema = z
  .object({
    title: z.string().trim().min(1).max(80).optional(),
    focus: z.string().trim().min(1).max(40).optional(),
    notes: z.string().trim().max(1000).optional(),
    status: z.enum(['in_progress', 'completed', 'planned']).optional(),
    bodyWeightKg: weightKg.nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });

export const createExerciseSchema = z.object({
  name: z.string().trim().min(2, 'Exercise name is required').max(80),
  muscleGroup: muscleGroup.optional(),
  targetSets: z.number().int().min(1).max(20).optional(),
  targetReps: z.number().int().min(1).max(100).optional(),
  targetWeightKg: weightKg.optional(),
  notes: z.string().trim().max(300).optional(),
});

export const updateExerciseSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    muscleGroup: muscleGroup.optional(),
    targetSets: z.number().int().min(1).max(20).optional(),
    targetReps: z.number().int().min(1).max(100).optional(),
    targetWeightKg: weightKg.optional(),
    notes: z.string().trim().max(300).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });

export const createSetSchema = z.object({
  reps,
  weightKg,
  rpe,
  note: z.string().trim().max(200).optional(),
});

export const updateSetSchema = z
  .object({
    reps: reps.optional(),
    weightKg: weightKg.optional(),
    rpe,
    note: z.string().trim().max(200).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });

export const analyticsUploadSchema = z.object({
  exercise: z.string().trim().min(2, 'Tell us which lift this is').max(80),
  fileName: z.string().trim().min(1).max(200),
  fileSizeBytes: z.number().int().min(1).max(2_000_000_000),
  durationSeconds: z.number().min(0).max(3600).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const sessionQuerySchema = z.object({
  from: dateKey.optional(),
  to: dateKey.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});
