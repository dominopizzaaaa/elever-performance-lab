/**
 * Shapes returned by the Express API. Kept hand-written (rather than generated)
 * so the kiosk has one obvious place to look when the contract changes.
 * @see backend/src/services
 */

export type AccentColor = 'cyan' | 'magenta' | 'lime' | 'violet' | 'amber';

export type Gender = 'male' | 'female';

export type MuscleGroupKey =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'glutes'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'conditioning';

export interface MuscleGroup {
  key: MuscleGroupKey;
  label: string;
}

export interface LibraryExercise {
  name: string;
  muscleGroup: MuscleGroupKey;
  equipment: string;
  pattern: string;
  videoAnalysis?: boolean;
}

export interface ExerciseLibrary {
  muscleGroups: MuscleGroup[];
  exercises: LibraryExercise[];
}

export interface PersonalRecord {
  exercise: string;
  weightKg: number;
  reps: number;
  achievedAt: string;
  estimatedOneRepMax?: number;
  note?: string;
}

export interface PlanExercise {
  name: string;
  muscleGroup: MuscleGroupKey;
  targetSets: number;
  targetReps: number;
  targetWeightKg: number;
}

export interface PlanDay {
  key: string;
  label: string;
  focus: string;
  weekdays: number[];
  exercises: PlanExercise[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  phase: string;
  focus: string;
  startedAt: string;
  sessionsPerWeek: number;
  notes: string;
  days: PlanDay[];
}

export interface Goals {
  weeklySessions: number;
  weeklyVolumeKg: number;
  targetWeightKg: number;
  focus: string;
}

/** The little the kiosk resolves from a typed name — enough to confirm "is this you?". */
export interface MemberIdentity {
  id: string;
  name: string;
  memberNumber: string;
  tier: string;
}

export interface User {
  id: string;
  name: string;
  slug: string;
  memberNumber: string;
  age: number;
  weightKg: number;
  heightCm: number | null;
  gender: Gender;
  bodyFatPct: number | null;
  restingHr: number | null;
  tier: string;
  joinedAt: string;
  accentColor: AccentColor;
  tagline: string;
  goals: Goals;
  personalRecords: PersonalRecord[];
  weightHistory?: { date: string; weightKg: number }[];
  currentPlan: WorkoutPlan;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithStats extends User {
  stats: {
    sessions: number;
    volumeKg: number;
    streakDays: number;
    lastSessionDate: string | null;
    thisWeekSessions: number;
  };
}

export interface LoggedSet {
  id: string;
  reps: number;
  weightKg: number;
  rpe: number | null;
  note?: string;
  completedAt: string;
  editedAt?: string;
  source: string;
}

export interface SessionExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroupKey;
  targetSets: number;
  targetReps: number;
  targetWeightKg: number;
  notes?: string;
  sets: LoggedSet[];
  createdAt: string;
}

export type SessionStatus = 'planned' | 'in_progress' | 'completed';

export interface SessionMetrics {
  sessionId: string;
  date: string;
  title: string;
  focus: string;
  status: SessionStatus;
  exerciseCount: number;
  volumeKg: number;
  sets: number;
  reps: number;
  topSetKg: number;
  bestEstimatedOneRepMax: number;
  averageRpe: number | null;
  muscleVolume: Partial<Record<MuscleGroupKey, number>>;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  date: string;
  planId: string | null;
  planDayKey: string | null;
  title: string;
  focus: string;
  status: SessionStatus;
  notes: string;
  bodyWeightKg: number | null;
  exercises: SessionExercise[];
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metrics: SessionMetrics;
}

export interface WeeklyVolumePoint {
  weekKey: string;
  weekStart: string;
  volumeKg: number;
  sessions: number;
  sets: number;
}

export interface StrengthTrend {
  exercise: string;
  muscleGroup: MuscleGroupKey;
  points: { date: string; estimatedOneRepMax: number; topWeightKg: number }[];
  best: number;
  latest: number;
  changeKg: number;
  changePct: number;
}

export interface UserSummary {
  userId: string;
  totals: { sessions: number; volumeKg: number; sets: number; reps: number };
  streakDays: number;
  thisWeek: {
    volumeKg: number;
    sessions: number;
    sets: number;
    volumeGoalPct: number;
    sessionGoalPct: number;
  };
  weekOverWeek: { volumeDeltaKg: number; volumeDeltaPct: number | null };
  weekly: WeeklyVolumePoint[];
  muscleLoad: Partial<Record<MuscleGroupKey, number>>;
  focusSplit: Record<string, number>;
  strengthTrends: StrengthTrend[];
  recentSessions: SessionMetrics[];
}

export interface StaffAccount {
  id: string;
  username: string;
  displayName: string;
  role: 'staff';
}

export interface AnalyticsStatus {
  enabled: boolean;
  headline: string;
  message: string;
  supportedLifts: { name: string; pattern: string; muscleGroup: MuscleGroupKey }[];
  roadmap: { phase: string; title: string; detail: string; status: string }[];
  maxUploadMb: number;
  acceptedFormats: string[];
}

export interface VideoUpload {
  id: string;
  userId: string;
  exercise: string;
  fileName: string;
  fileSizeBytes: number;
  durationSeconds: number | null;
  notes: string;
  status: 'queued' | 'processing' | 'complete' | 'failed';
  analysis: unknown | null;
  createdAt: string;
}

export interface AdminOverview {
  generatedAt: string;
  counts: { members: number; sessions: number; sessionsToday: number; queuedVideoUploads: number };
  volume: { last7DaysKg: number; last7DaysSets: number; allTimeKg: number };
  recentActivity: {
    sessionId: string;
    userId: string;
    userName: string;
    date: string;
    title: string;
    focus: string;
    status: SessionStatus;
    exerciseCount: number;
    sets: number;
    volumeKg: number;
    updatedAt: string;
  }[];
}

export interface AdminSession extends WorkoutSession {
  userName: string;
}
