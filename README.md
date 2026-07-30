# Elever Performance Lab

A futuristic gym terminal. A large portrait screen sits on the gym floor; a member
types their name to "scan in", sees their performance model, and logs reps and
loads between sets. Everything they change is written back to JSON files on the
server.

```
┌─ frontend ─────────────┐        ┌─ backend ──────────────┐
│ Next.js 15 · React 19  │  /api  │ Node + Express         │
│ TailwindCSS            │ ─────► │ JSON-file persistence  │
│ portrait kiosk UI      │  proxy │ scrypt + HMAC auth     │
└────────────────────────┘        └────────────────────────┘
```

---

## Quick start

```bash
npm install          # installs both workspaces
npm run seed         # creates the JSON "database" (safe: skips existing files)
npm run dev          # backend on :4000, kiosk on :3000
```

Open <http://localhost:3000> and scan in as **Dominic**, **Kean Hean** or **Chin An**.

| What | Where |
| --- | --- |
| Kiosk | <http://localhost:3000> |
| Admin panel | <http://localhost:3000/admin> |
| API health | <http://localhost:4000/api/health> |

**Demo staff logins** (for `/admin`): `coach` / `elever-lab-2026` · `frontdesk` / `welcome-to-elever`

Other commands:

```bash
npm run build        # production build of the kiosk
npm start            # run both in production mode
npm run smoke        # 32 end-to-end API checks against the real JSON files
npm run lint         # eslint
npm run typecheck    # tsc --noEmit
npm run seed -w backend -- --force   # reset the demo data
```

---

## The five screens

| Route | What it does |
| --- | --- |
| `/` | Hero + card reader. Typing a name simulates tapping a member card. |
| `/dashboard` | AI body avatar, weekly goals, today's log, plan, editable profile, PRs. |
| `/history` | Weekly tonnage chart, per-lift 1RM trends, muscle balance, session timeline. |
| `/analytics` | **Placeholder.** "Coming Soon: AI Form Analysis" + working video queue. |
| `/admin` | Staff-only. Floor overview, member CRUD, workout log management. |

### Logging a workout

1. Scan in → the dashboard offers **Start training**.
2. The session is pre-filled from whichever day of the member's plan is due
   (by weekday, falling back to whichever day has gone longest untrained).
3. Exercises are an accordion — the one with sets outstanding is open. Its stepper
   is prefilled from the previous set, so repeating a load is one tap on **Log set**.
4. Sets can be corrected or deleted inline. Exercises can be added from a
   46-movement library with autocomplete.
5. Beating a stored 1RM estimate promotes the set to a personal record and fires
   a toast.

Every one of those writes lands in `backend/src/data/workouts.json` immediately.

---

## Architecture

### Backend (`backend/`)

```
src/
  config/env.js          Environment + paths, fails fast on a prod dev-secret
  lib/
    jsonStore.js         Atomic writes + per-file serialised read-modify-write
    crypto.js            scrypt password hashing, HMAC-signed session tokens
    dates.js  ids.js  errors.js
  middleware/            auth · validate (zod) · errorHandler · requestLogger
  repositories/          Data access over the JSON files
  services/              Business logic (auth, users, workouts, metrics, admin, analytics)
  routes/                HTTP layer only
  schemas/               One zod schema per request body
  data/                  The "database" + the hard-coded seed sources
```

The layering is strict: routes validate and delegate, services own the rules,
repositories touch files. Nothing skips a layer.

**Why the JSON store is more than `fs.writeFile`:**

- **Atomic.** Data is written to a temp file in the same directory and renamed, so
  a crash mid-write can never leave a truncated database.
- **Serialised.** Read-modify-write cycles queue per file through a promise chain,
  so two members logging sets at the same moment cannot clobber each other.
- **Cached.** Reads are cached against the file's mtime — hot paths stay cheap, and
  hand-editing a JSON file on disk is still picked up.

### Frontend (`frontend/`)

```
src/
  app/                   One directory per route (App Router)
  components/
    avatar/              AI body avatar + its muscle-region geometry
    charts/              Hand-rolled SVG charts (no charting library)
    workout/             Session panel, exercise cards, set logger, add-exercise
    profile/  history/  admin/  layout/  ui/
  providers/             SessionProvider (member) · ToastProvider
  hooks/                 useStaffSession · useIdleLock · useExerciseLibrary
  lib/                   api.ts (typed client) · types.ts · format.ts · tokenStore.ts
```

Next.js proxies `/api/*` to Express (`next.config.mjs`), so the browser makes
same-origin requests and there are no CORS preflights in normal operation.

---

## Design notes

**Portrait first.** The target panel is 1080×1920. Every page is a single centred
column capped at 900px with a fixed bottom nav bar in thumb reach. Nothing
depends on horizontal space; wide screens just centre the column.

**One accent, re-tinted per member.** The palette is driven by a single CSS
variable (`--accent-rgb`) set from the member's `accentColor`, so scanning in as
Dominic (cyan), Kean Hean (lime) or Chin An (magenta) re-themes the entire
interface without swapping a class name.

**The AI body avatar** maps each muscle group's share of the last 14 days of
volume to its brightness. Posterior groups (back, hamstrings, glutes, triceps)
render as lateral bands, because a front-facing figure cannot show them honestly;
the legend underneath carries the precise numbers. Groups worked in today's
session pulse. Geometry lives in `components/avatar/muscleRegions.ts` and its
keys are kept in sync with `backend/src/data/seed/muscleGroups.js`.

**Charts are hand-rolled SVG** and deliberately single-series: bars capped with a
4px rounded data-end, 2px lines, hairline solid gridlines, hover tooltips, axis
text in ink tokens rather than the series colour, and a data-table fallback on
the tonnage chart. Six lifts' 1RM trends are **small multiples** rather than six
series on shared axes — converging lines are unreadable and would need a
categorical palette to tell apart.

**Week-over-week deltas are shown in neutral colour**, not red/green: the current
week is always mid-flight and would otherwise look like a collapse every Monday.

---

## Security

The two auth paths are deliberately different, because they defend different things.

**Member scan-in is not a security boundary.** It mirrors tapping a gym card on a
reader: anyone at the kiosk can scan in as any member. What it does guarantee is
that the token it mints only reaches that member's own data — the API rejects
cross-member reads and writes (`requireSelfOrStaff`), so a bug in the UI cannot
leak someone else's log.

**Staff login is a real boundary.** Passwords are scrypt-hashed in `admins.json`,
compared in constant time, and the endpoint runs a verification even for unknown
usernames so response timing cannot be used to enumerate accounts. Failures are
rate-limited (10 per 10 minutes) and return one generic message.

Also in place: HMAC-SHA256 signed tokens with expiry (members 2h, staff 1h),
strict zod validation that rejects unknown fields, a 256kb body cap, an origin
allow-list, separate `sessionStorage` keys for member and staff sessions, and a
kiosk idle lock that returns the screen to the scan prompt after 10 minutes.

`AUTH_SECRET` **must** be set when `NODE_ENV=production` — the server refuses to
boot with the development secret.

---

## Configuration

Both files are optional; the defaults work for local development.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | Express port |
| `AUTH_SECRET` | dev secret | **Required in production** |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated |
| `MEMBER_TOKEN_TTL` / `ADMIN_TOKEN_TTL` | `7200` / `3600` | Seconds |
| `LOG_LEVEL` | `short` | `none` \| `short` \| `verbose` |
| `API_PROXY_TARGET` | `http://localhost:4000` | Where Next proxies `/api` |
| `NEXT_PUBLIC_KIOSK_IDLE_TIMEOUT` | `600` | Seconds; `0` disables auto-lock |

---

## Seed data

`npm run seed` writes five files into `backend/src/data/`:

| File | Contents |
| --- | --- |
| `users.json` | The three hard-coded members: stats, goals, PRs, current plan |
| `workouts.json` | ~97 generated sessions across the trailing 8 weeks |
| `admins.json` | Staff accounts, scrypt-hashed |
| `exercise-library.json` | 46 movements with muscle group, equipment, movement pattern |
| `analytics-queue.json` | Video upload queue (empty) |

Profiles and plans are hand-written in `backend/src/data/seed/`. History is
*generated* from those plans by `sessions.seed.js` — a deterministic PRNG replays
each plan day backwards from today with linear progression, deload weeks and a
~10% miss rate, so the demo looks lived-in and is reproducible rather than being
thousands of lines of hand-typed sets. Dates are relative to the run date, so the
data is always current.

`npm run seed` never overwrites an existing file. Use `-- --force` to reset.

---

## AI Analytics — what is and is not built

The page, the upload flow and the queue are real: a member picks a video, and it
is recorded against their profile in `analytics-queue.json`. Staff see the backlog
at `/admin` → Video queue.

**Nothing analyses the video, and the binary is never uploaded.** Only file name,
size and the chosen lift are stored. `status` stays `queued` forever.

To make it live, in order:

1. **Accept the binary.** Add a multipart layer (multer/busboy) to
   `POST /api/analytics/uploads` and store to `env.uploadsDir` locally / object
   storage in production. Swap `handleFiles` in `app/analytics/page.tsx` from
   metadata-only to `FormData`.
2. **Queue it properly.** Replace `analyticsRepository` with a real job queue and
   return `202` with a job id.
3. **Run inference.** Worker: frame sampling → pose estimation (MoveNet /
   MediaPipe) → per-rep joint-angle series → rule + model scoring per movement
   pattern. The library's `pattern` field (`squat`, `hinge`, `horizontal-push`, …)
   already says which model applies, and `videoAnalysis: true` marks the 14 lifts
   targeted for launch.
4. **Persist and render.** Write `{ score, repBreakdown, faults[], keyframes[] }`
   onto the upload record, flip `status` to `complete`, and poll
   `GET /api/analytics/uploads` to render results instead of the queued chip.
5. **Close the loop.** Link a completed analysis to the logged exercise so the
   dashboard can show a technique score beside the tonnage.

Every one of those steps has a `TODO(ai-analytics)` marker at the code it touches:

```bash
grep -rn "TODO(ai-analytics)" backend/src backend/scripts frontend/src
```

---

## API

All routes are under `/api`. `Authorization: Bearer <token>` unless noted.

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/scan` | public | Scan in by name |
| `POST` | `/auth/staff/login` | public | Staff sign-in |
| `GET` | `/auth/me` | any | Resolve the current identity |
| `GET` | `/users` | staff | Roster with stats |
| `GET`/`PATCH` | `/users/:userId` | self or staff | Read / edit profile |
| `GET` | `/users/:userId/summary` | self or staff | Derived analytics |
| `GET` | `/users/:userId/sessions` | self or staff | History (`from`, `to`, `limit`) |
| `GET`/`POST` | `/users/:userId/sessions/today` | self or staff | Get / get-or-create today |
| `POST` | `/users/:userId/sessions` | self or staff | Create a session |
| `GET`/`PATCH`/`DELETE` | `/sessions/:sessionId` | owner or staff | Manage a session |
| `POST` | `/sessions/:id/exercises` | owner or staff | Add an exercise |
| `PATCH`/`DELETE` | `/sessions/:id/exercises/:exerciseId` | owner or staff | Edit / remove |
| `POST` | `/sessions/:id/exercises/:exerciseId/sets` | owner or staff | **Log a set** |
| `PATCH`/`DELETE` | `…/sets/:setId` | owner or staff | Correct / delete a set |
| `GET` | `/library/exercises` | public | Exercise catalogue |
| `GET` | `/analytics/status` | public | Feature status + roadmap |
| `GET`/`POST` | `/analytics/uploads` | any | Video queue (placeholder) |
| `GET` | `/admin/overview` | staff | Floor-wide stats |
| `GET`/`POST` | `/admin/members` | staff | List / create members |
| `PATCH`/`DELETE` | `/admin/members/:userId` | staff | Edit / remove a member |
| `GET` | `/admin/sessions` | staff | All sessions (`userId`, `limit`) |
| `DELETE` | `/admin/sessions/:sessionId` | staff | Delete a session |
| `GET`/`DELETE` | `/admin/video-uploads[/:id]` | staff | Manage the video queue |

Errors are always `{ "error": { "code", "message", "details?" } }`. Validation
failures come back as `400` with per-field messages.

---

## Extending it

- **Another member** — add an entry to `backend/src/data/seed/users.seed.js` and
  re-seed, or register them from the admin panel at runtime.
- **Another exercise** — add it to `exerciseLibrary.seed.js`. Set
  `videoAnalysis: true` to include it in the AI Analytics launch set.
- **Another page** — add a directory under `frontend/src/app/` and an entry to
  `NAV_ITEMS` in `components/layout/KioskShell.tsx`.
- **A real database** — replace the files in `src/repositories/`. Services, routes
  and the frontend are untouched; the repositories are the only code that knows
  data lives in JSON.
- **New muscle group** — add it to `muscleGroups.js` *and* `muscleRegions.ts`; the
  avatar and the backend share those keys.
