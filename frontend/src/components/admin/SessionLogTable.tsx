'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { NeonButton } from '@/components/ui/NeonButton';
import { Badge, EmptyState } from '@/components/ui/Feedback';
import { cx, formatDate, formatVolume } from '@/lib/format';
import type { AdminSession } from '@/lib/types';

interface SessionLogTableProps {
  sessions: AdminSession[];
  token: string;
  onChanged: () => void;
}

/** Cross-member workout log with delete, for correcting bad kiosk entries. */
export function SessionLogTable({ sessions, token, onChanged }: SessionLogTableProps) {
  const toast = useToast();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function handleDelete(session: AdminSession) {
    setBusyId(session.id);
    try {
      await api.admin.deleteSession(session.id, token);
      toast.success('Session deleted', `${session.userName} · ${formatDate(session.date)}`);
      setConfirmId(null);
      onChanged();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'Could not delete that session');
    } finally {
      setBusyId(null);
    }
  }

  if (sessions.length === 0) {
    return (
      <Panel className="p-5">
        <PanelHeader label="Workout logs" title="No sessions" />
        <EmptyState title="Nothing logged" detail="Sessions appear here as members train." />
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {sessions.map((session) => {
        const isConfirming = confirmId === session.id;
        const isExpanded = expandedId === session.id;

        return (
          <Panel
            key={session.id}
            className={cx('overflow-hidden', busyId === session.id && 'opacity-40')}
          >
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : session.id)}
              aria-expanded={isExpanded}
              className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-white/[0.02]"
            >
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-xs font-bold uppercase tracking-[0.1em] text-white">
                    {session.userName}
                  </span>
                  <Badge tone={session.status === 'completed' ? 'success' : 'live'}>{session.status}</Badge>
                </span>
                <span className="mt-1 block truncate text-[11px] text-white/40">
                  {formatDate(session.date)} · {session.title}
                </span>
              </span>

              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold tabular-nums text-white">
                  {formatVolume(session.metrics.volumeKg)}
                </span>
                <span className="block text-[11px] tabular-nums text-white/35">
                  {session.metrics.sets} sets
                </span>
              </span>

              <span className={cx('shrink-0 text-white/25 transition', isExpanded && 'rotate-180')} aria-hidden>
                ▾
              </span>
            </button>

            {isExpanded ? (
              <div className="border-t border-white/[0.06] p-3.5">
                <ul className="flex flex-col gap-1">
                  {session.exercises.map((exercise) => (
                    <li key={exercise.id} className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate text-white/60">{exercise.name}</span>
                      <span className="shrink-0 tabular-nums text-white/35">
                        {exercise.sets.length} × sets
                        {exercise.sets.length > 0
                          ? ` · top ${Math.max(...exercise.sets.map((set) => set.weightKg))} kg`
                          : ''}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/[0.06] pt-3">
                  {isConfirming ? (
                    <>
                      <p className="mr-auto text-xs text-neon-red">Delete this session permanently?</p>
                      <NeonButton size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                        Keep
                      </NeonButton>
                      <NeonButton
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(session)}
                        isLoading={busyId === session.id}
                      >
                        Delete
                      </NeonButton>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmId(session.id)}
                      className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25 transition hover:text-neon-red"
                    >
                      Delete session
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </Panel>
        );
      })}
    </div>
  );
}
