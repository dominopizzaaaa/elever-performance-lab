'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { KioskShell } from '@/components/layout/KioskShell';
import { PageHeading } from '@/components/layout/PageHeading';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { StatTile } from '@/components/ui/StatTile';
import { NeonButton } from '@/components/ui/NeonButton';
import { Badge, EmptyState, ErrorNote, LoadingPanel } from '@/components/ui/Feedback';
import { HorizontalBars } from '@/components/charts/HorizontalBars';
import { StaffLoginForm } from '@/components/admin/StaffLoginForm';
import { CreateMemberForm } from '@/components/admin/CreateMemberForm';
import { MembersTable } from '@/components/admin/MembersTable';
import { SessionLogTable } from '@/components/admin/SessionLogTable';
import { useStaffSession } from '@/hooks/useStaffSession';
import { api, ApiError } from '@/lib/api';
import { cx, formatBytes, formatNumber, formatRelativeDate, formatVolume } from '@/lib/format';
import type { AdminOverview, AdminSession, UserWithStats, VideoUpload } from '@/lib/types';

type Tab = 'overview' | 'members' | 'logs' | 'videos';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'members', label: 'Members' },
  { key: 'logs', label: 'Workout logs' },
  { key: 'videos', label: 'Video queue' },
];

/**
 * Staff admin panel.
 *
 * The staff session is stored separately from the member kiosk session, so a
 * coach signing in here never disturbs whoever is scanned in on the floor.
 */
export default function AdminPage() {
  const { admin, token, isRestoring, signIn, signOut } = useStaffSession();

  const [tab, setTab] = useState<Tab>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [members, setMembers] = useState<UserWithStats[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [uploads, setUploads] = useState<VideoUpload[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const [overviewResult, membersResult, sessionsResult, uploadsResult] = await Promise.all([
          api.admin.overview(token, signal),
          api.admin.members(token, signal),
          api.admin.sessions(token, { limit: 80 }, signal),
          api.admin.videoUploads(token, signal),
        ]);
        setOverview(overviewResult.overview);
        setMembers(membersResult.users);
        setSessions(sessionsResult.sessions);
        setUploads(uploadsResult.uploads);
      } catch (caught) {
        if ((caught as Error).name === 'AbortError') return;
        if (caught instanceof ApiError && caught.status === 401) {
          signOut();
          return;
        }
        setError(caught instanceof ApiError ? caught.message : 'Could not load admin data');
      } finally {
        setIsLoading(false);
      }
    },
    [token, signOut],
  );

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [token, load]);

  const filteredSessions = useMemo(
    () => (selectedUserId ? sessions.filter((session) => session.userId === selectedUserId) : sessions),
    [sessions, selectedUserId],
  );

  const tonnageByMember = useMemo(
    () =>
      members
        .map((member) => ({ label: member.name, value: member.stats.volumeKg }))
        .sort((a, b) => b.value - a.value),
    [members],
  );

  /* ---------------------------------------------------------------------- */
  /* Auth gate                                                              */
  /* ---------------------------------------------------------------------- */
  if (isRestoring) {
    return (
      <KioskShell>
        <LoadingPanel label="Checking staff credentials" />
      </KioskShell>
    );
  }

  if (!admin || !token) {
    return (
      <KioskShell>
        <PageHeading eyebrow="Restricted" title="Admin panel" detail="Staff sign-in required." />
        <StaffLoginForm onSignIn={signIn} />
      </KioskShell>
    );
  }

  const selectedMember = members.find((member) => member.id === selectedUserId) ?? null;

  return (
    <KioskShell>
      <PageHeading
        eyebrow="Staff terminal"
        title="Admin panel"
        detail={`Signed in as ${admin.displayName}.`}
        action={
          <div className="flex items-center gap-2">
            <NeonButton size="sm" variant="ghost" onClick={() => void load()} isLoading={isLoading}>
              Refresh
            </NeonButton>
            <NeonButton size="sm" variant="danger" onClick={signOut}>
              Sign out
            </NeonButton>
          </div>
        }
      />

      <div className="flex flex-col gap-4">
        {error ? <ErrorNote message={error} onRetry={() => void load()} /> : null}

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Admin sections">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => setTab(item.key)}
              className={cx(
                'rounded-lg border px-3.5 py-2 font-display text-[10px] font-semibold uppercase tracking-[0.16em] transition',
                tab === item.key
                  ? 'border-accent/50 bg-accent-soft text-accent'
                  : 'border-white/10 bg-white/[0.03] text-white/45 hover:border-white/25 hover:text-white/75',
              )}
            >
              {item.label}
              {item.key === 'videos' && uploads.length > 0 ? (
                <span className="ml-1.5 text-white/40">({uploads.length})</span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Overview                                                         */}
        {/* ---------------------------------------------------------------- */}
        {tab === 'overview' ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatTile label="Members" value={overview?.counts.members ?? 0} tone="accent" />
              <StatTile
                label="Sessions today"
                value={overview?.counts.sessionsToday ?? 0}
                hint="Across the floor"
              />
              <StatTile
                label="7-day tonnage"
                value={formatVolume(overview?.volume.last7DaysKg ?? 0)}
                hint={`${formatNumber(overview?.volume.last7DaysSets ?? 0)} sets`}
              />
              <StatTile
                label="Video queue"
                value={overview?.counts.queuedVideoUploads ?? 0}
                hint="Awaiting AI"
              />
            </div>

            <Panel className="p-5">
              <PanelHeader label="All time" title="Tonnage by member" />
              {tonnageByMember.length > 0 ? (
                <HorizontalBars
                  className="mt-4"
                  data={tonnageByMember}
                  seriesLabel="Tonnage by member"
                  unit=" kg"
                />
              ) : (
                <EmptyState title="No data yet" />
              )}
            </Panel>

            <Panel className="p-5">
              <PanelHeader
                label="Live feed"
                title="Recent activity"
                action={
                  <span className="font-display text-[10px] uppercase tracking-[0.16em] text-white/30">
                    {overview?.recentActivity.length ?? 0} entries
                  </span>
                }
              />
              {overview && overview.recentActivity.length > 0 ? (
                <ul className="mt-4 flex flex-col gap-1.5">
                  {overview.recentActivity.slice(0, 12).map((entry) => (
                    <li
                      key={entry.sessionId}
                      className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[11px] font-bold uppercase tracking-[0.1em] text-white">
                          {entry.userName}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-white/35">
                          {formatRelativeDate(entry.date)} · {entry.title}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-xs font-semibold tabular-nums text-white">
                          {formatVolume(entry.volumeKg)}
                        </span>
                        <span className="block text-[10px] tabular-nums text-white/30">{entry.sets} sets</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="Quiet floor" detail="No sessions logged yet." />
              )}
            </Panel>
          </>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Members                                                          */}
        {/* ---------------------------------------------------------------- */}
        {tab === 'members' ? (
          <>
            <Panel className="p-4">
              {isCreating ? (
                <CreateMemberForm
                  token={token}
                  onCreated={() => {
                    setIsCreating(false);
                    void load();
                  }}
                  onCancel={() => setIsCreating(false)}
                />
              ) : (
                <NeonButton
                  variant="outline"
                  fullWidth
                  size="lg"
                  onClick={() => setIsCreating(true)}
                  icon={<span aria-hidden>+</span>}
                >
                  Register new member
                </NeonButton>
              )}
            </Panel>

            <MembersTable
              members={members}
              token={token}
              selectedUserId={selectedUserId}
              onSelect={(userId) => {
                setSelectedUserId(userId);
                if (userId) setTab('logs');
              }}
              onChanged={() => void load()}
            />
          </>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Workout logs                                                     */}
        {/* ---------------------------------------------------------------- */}
        {tab === 'logs' ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="hud-label">Filter</span>
              <button
                type="button"
                onClick={() => setSelectedUserId(null)}
                aria-pressed={selectedUserId === null}
                className={cx(
                  'rounded-lg border px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.16em] transition',
                  selectedUserId === null
                    ? 'border-accent/50 bg-accent-soft text-accent'
                    : 'border-white/10 bg-white/[0.03] text-white/45 hover:text-white/75',
                )}
              >
                All members
              </button>
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelectedUserId(member.id)}
                  aria-pressed={selectedUserId === member.id}
                  className={cx(
                    'rounded-lg border px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.16em] transition',
                    selectedUserId === member.id
                      ? 'border-accent/50 bg-accent-soft text-accent'
                      : 'border-white/10 bg-white/[0.03] text-white/45 hover:text-white/75',
                  )}
                >
                  {member.name}
                </button>
              ))}
            </div>

            <PanelHeader
              label="Workout logs"
              title={
                selectedMember
                  ? `${filteredSessions.length} sessions · ${selectedMember.name}`
                  : `${filteredSessions.length} sessions`
              }
            />

            <SessionLogTable sessions={filteredSessions} token={token} onChanged={() => void load()} />
          </>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Video queue (AI Analytics placeholder)                           */}
        {/* ---------------------------------------------------------------- */}
        {tab === 'videos' ? (
          <Panel className="p-5">
            <PanelHeader
              label="AI analytics"
              title="Video queue"
              action={<Badge tone="warn">Pipeline offline</Badge>}
            />

            <p className="mt-3 text-sm leading-relaxed text-white/40">
              Members can submit videos already. Nothing processes them until the vision pipeline ships —
              these records exist so the backlog is ready on day one.
            </p>

            {uploads.length === 0 ? (
              <EmptyState title="Queue empty" detail="No members have submitted a video yet." />
            ) : (
              <ul className="mt-4 flex flex-col gap-1.5">
                {uploads.map((upload) => {
                  const owner = members.find((member) => member.id === upload.userId);
                  return (
                    <li
                      key={upload.id}
                      className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-[11px] font-bold uppercase tracking-[0.1em] text-white">
                          {owner?.name ?? 'Unknown member'} · {upload.exercise}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-white/35">
                          {upload.fileName} · {formatBytes(upload.fileSizeBytes)} ·{' '}
                          {formatRelativeDate(upload.createdAt.slice(0, 10))}
                        </span>
                      </span>
                      <Badge tone="warn">{upload.status}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        ) : null}
      </div>
    </KioskShell>
  );
}
