import type {
  AdminOverview,
  AdminSession,
  AnalyticsStatus,
  ExerciseLibrary,
  LoggedSet,
  PersonalRecord,
  SessionExercise,
  StaffAccount,
  User,
  UserSummary,
  UserWithStats,
  VideoUpload,
  WorkoutSession,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api';

/** Error carrying the API's structured `{ code, message, details }` envelope. */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: { field: string; message: string }[] | unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Field-level messages, when the failure was a validation error. */
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {};
    return Object.fromEntries(
      (this.details as { field: string; message: string }[]).map((detail) => [detail.field, detail.message]),
    );
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal } = options;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      cache: 'no-store',
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(0, 'network_error', 'Cannot reach the Elever server. Is the API running?');
  }

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    const envelope = (payload.error ?? {}) as { code?: string; message?: string; details?: unknown };
    throw new ApiError(
      response.status,
      envelope.code ?? 'error',
      envelope.message ?? `Request failed with ${response.status}`,
      envelope.details,
    );
  }

  return payload as T;
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export const api = {
  /** Simulated card scan — resolves a typed name to a member. */
  scan: (name: string) =>
    request<{ token: string; expiresAt: string; user: User }>('/auth/scan', {
      method: 'POST',
      body: { name },
    }),

  staffLogin: (username: string, password: string) =>
    request<{ token: string; expiresAt: string; admin: StaffAccount }>('/auth/staff/login', {
      method: 'POST',
      body: { username, password },
    }),

  me: (token: string) =>
    request<{ role: 'member'; user: User } | { role: 'staff'; admin: StaffAccount }>('/auth/me', { token }),

  /* ---------------------------------------------------------------------- */
  /* Members                                                                 */
  /* ---------------------------------------------------------------------- */

  getUser: (userId: string, token: string) => request<{ user: User }>(`/users/${userId}`, { token }),

  updateUser: (userId: string, patch: Partial<User> | Record<string, unknown>, token: string) =>
    request<{ user: User }>(`/users/${userId}`, { method: 'PATCH', body: patch, token }),

  getSummary: (userId: string, token: string, signal?: AbortSignal) =>
    request<{ summary: UserSummary }>(`/users/${userId}/summary`, { token, signal }),

  /* ---------------------------------------------------------------------- */
  /* Sessions                                                                */
  /* ---------------------------------------------------------------------- */

  listSessions: (
    userId: string,
    token: string,
    query: { from?: string; to?: string; limit?: number } = {},
    signal?: AbortSignal,
  ) => {
    const search = new URLSearchParams();
    if (query.from) search.set('from', query.from);
    if (query.to) search.set('to', query.to);
    if (query.limit) search.set('limit', String(query.limit));
    const qs = search.toString();
    const suffix = qs ? `?${qs}` : '';
    return request<{ sessions: WorkoutSession[] }>(`/users/${userId}/sessions${suffix}`, { token, signal });
  },

  getTodaySession: (userId: string, token: string, signal?: AbortSignal) =>
    request<{ session: WorkoutSession | null }>(`/users/${userId}/sessions/today`, { token, signal }),

  /** Get-or-create today's session, pre-filled from the member's plan. */
  startTodaySession: (userId: string, token: string) =>
    request<{ session: WorkoutSession }>(`/users/${userId}/sessions/today`, { method: 'POST', token }),

  createSession: (
    userId: string,
    body: { date?: string; title?: string; focus?: string; fromPlanDay?: string },
    token: string,
  ) => request<{ session: WorkoutSession }>(`/users/${userId}/sessions`, { method: 'POST', body, token }),

  updateSession: (
    sessionId: string,
    patch: { title?: string; focus?: string; notes?: string; status?: string; bodyWeightKg?: number | null },
    token: string,
  ) => request<{ session: WorkoutSession }>(`/sessions/${sessionId}`, { method: 'PATCH', body: patch, token }),

  deleteSession: (sessionId: string, token: string) =>
    request<{ id: string }>(`/sessions/${sessionId}`, { method: 'DELETE', token }),

  /* ---------------------------------------------------------------------- */
  /* Exercises + sets                                                        */
  /* ---------------------------------------------------------------------- */

  addExercise: (
    sessionId: string,
    body: {
      name: string;
      muscleGroup?: string;
      targetSets?: number;
      targetReps?: number;
      targetWeightKg?: number;
    },
    token: string,
  ) =>
    request<{ session: WorkoutSession; exercise: SessionExercise }>(`/sessions/${sessionId}/exercises`, {
      method: 'POST',
      body,
      token,
    }),

  updateExercise: (
    sessionId: string,
    exerciseId: string,
    patch: Record<string, unknown>,
    token: string,
  ) =>
    request<{ session: WorkoutSession; exercise: SessionExercise }>(
      `/sessions/${sessionId}/exercises/${exerciseId}`,
      { method: 'PATCH', body: patch, token },
    ),

  removeExercise: (sessionId: string, exerciseId: string, token: string) =>
    request<{ session: WorkoutSession }>(`/sessions/${sessionId}/exercises/${exerciseId}`, {
      method: 'DELETE',
      token,
    }),

  /** Log reps + weight between sets. Returns a PR when the set beats the old one. */
  logSet: (
    sessionId: string,
    exerciseId: string,
    body: { reps: number; weightKg: number; rpe?: number | null },
    token: string,
  ) =>
    request<{
      session: WorkoutSession;
      set: LoggedSet;
      personalRecord: (PersonalRecord & { previousEstimatedOneRepMax: number | null }) | null;
    }>(`/sessions/${sessionId}/exercises/${exerciseId}/sets`, { method: 'POST', body, token }),

  updateSet: (
    sessionId: string,
    exerciseId: string,
    setId: string,
    patch: { reps?: number; weightKg?: number; rpe?: number | null },
    token: string,
  ) =>
    request<{ session: WorkoutSession; set: LoggedSet }>(
      `/sessions/${sessionId}/exercises/${exerciseId}/sets/${setId}`,
      { method: 'PATCH', body: patch, token },
    ),

  removeSet: (sessionId: string, exerciseId: string, setId: string, token: string) =>
    request<{ session: WorkoutSession }>(
      `/sessions/${sessionId}/exercises/${exerciseId}/sets/${setId}`,
      { method: 'DELETE', token },
    ),

  /* ---------------------------------------------------------------------- */
  /* Reference data                                                          */
  /* ---------------------------------------------------------------------- */

  getLibrary: (signal?: AbortSignal) => request<ExerciseLibrary>('/library/exercises', { signal }),

  /* ---------------------------------------------------------------------- */
  /* AI Analytics (placeholder)                                              */
  /* ---------------------------------------------------------------------- */

  getAnalyticsStatus: (signal?: AbortSignal) =>
    request<{ status: AnalyticsStatus }>('/analytics/status', { signal }),

  queueVideoUpload: (
    body: { exercise: string; fileName: string; fileSizeBytes: number; durationSeconds?: number; notes?: string },
    token: string,
  ) => request<{ upload: VideoUpload; message: string }>('/analytics/uploads', { method: 'POST', body, token }),

  listVideoUploads: (token: string, signal?: AbortSignal) =>
    request<{ uploads: VideoUpload[] }>('/analytics/uploads', { token, signal }),

  /* ---------------------------------------------------------------------- */
  /* Admin                                                                   */
  /* ---------------------------------------------------------------------- */

  admin: {
    overview: (token: string, signal?: AbortSignal) =>
      request<{ overview: AdminOverview }>('/admin/overview', { token, signal }),

    members: (token: string, signal?: AbortSignal) =>
      request<{ users: UserWithStats[] }>('/admin/members', { token, signal }),

    createMember: (
      body: { name: string; age: number; weightKg: number; heightCm?: number; tier?: string; tagline?: string },
      token: string,
    ) => request<{ user: User }>('/admin/members', { method: 'POST', body, token }),

    updateMember: (userId: string, patch: Record<string, unknown>, token: string) =>
      request<{ user: User }>(`/admin/members/${userId}`, { method: 'PATCH', body: patch, token }),

    deleteMember: (userId: string, token: string) =>
      request<{ id: string; removedSessions: number }>(`/admin/members/${userId}`, {
        method: 'DELETE',
        token,
      }),

    sessions: (token: string, query: { userId?: string; limit?: number } = {}, signal?: AbortSignal) => {
      const search = new URLSearchParams();
      if (query.userId) search.set('userId', query.userId);
      if (query.limit) search.set('limit', String(query.limit));
      const qs = search.toString();
      const suffix = qs ? `?${qs}` : '';
      return request<{ sessions: AdminSession[] }>(`/admin/sessions${suffix}`, { token, signal });
    },

    deleteSession: (sessionId: string, token: string) =>
      request<{ id: string }>(`/admin/sessions/${sessionId}`, { method: 'DELETE', token }),

    videoUploads: (token: string, signal?: AbortSignal) =>
      request<{ uploads: VideoUpload[] }>('/admin/video-uploads', { token, signal }),

    deleteVideoUpload: (uploadId: string, token: string) =>
      request<{ id: string }>(`/admin/video-uploads/${uploadId}`, { method: 'DELETE', token }),
  },
};
