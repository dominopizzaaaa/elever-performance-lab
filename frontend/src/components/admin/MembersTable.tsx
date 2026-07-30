'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { NeonButton } from '@/components/ui/NeonButton';
import { Badge } from '@/components/ui/Feedback';
import { cx, formatRelativeDate, formatVolume, formatWeight } from '@/lib/format';
import type { UserWithStats } from '@/lib/types';

interface MembersTableProps {
  members: UserWithStats[];
  token: string;
  /** Filters the session log to one member. */
  selectedUserId: string | null;
  onSelect: (userId: string | null) => void;
  onChanged: () => void;
}

/**
 * Member roster. Cards rather than a wide table, because the admin panel is
 * viewed on the same portrait kiosk as everything else.
 */
export function MembersTable({ members, token, selectedUserId, onSelect, onChanged }: MembersTableProps) {
  const toast = useToast();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(member: UserWithStats) {
    setBusyId(member.id);
    try {
      const result = await api.admin.deleteMember(member.id, token);
      toast.success(
        `${member.name} removed`,
        `${result.removedSessions} session${result.removedSessions === 1 ? '' : 's'} deleted with them.`,
      );
      setConfirmId(null);
      if (selectedUserId === member.id) onSelect(null);
      onChanged();
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'Could not remove that member');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map((member) => {
        const isSelected = selectedUserId === member.id;
        const isConfirming = confirmId === member.id;

        return (
          <Panel
            key={member.id}
            className={cx('p-4 transition', isSelected && 'border-accent/40', busyId === member.id && 'opacity-40')}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-sm font-bold uppercase tracking-[0.08em] text-white">
                    {member.name}
                  </p>
                  <Badge tone="accent">{member.tier}</Badge>
                  {member.stats.thisWeekSessions > 0 ? (
                    <Badge tone="success">{member.stats.thisWeekSessions} this week</Badge>
                  ) : null}
                </div>
                <p className="mt-1 font-display text-[10px] uppercase tracking-[0.18em] text-white/30">
                  {member.memberNumber} · {member.slug}
                </p>
              </div>

              <div className="flex shrink-0 gap-1.5">
                <NeonButton
                  size="sm"
                  variant={isSelected ? 'outline' : 'ghost'}
                  onClick={() => onSelect(isSelected ? null : member.id)}
                >
                  {isSelected ? 'Viewing' : 'Logs'}
                </NeonButton>
              </div>
            </div>

            {/* Stats row */}
            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-3 sm:grid-cols-6">
              {[
                { label: 'Age', value: `${member.age}` },
                { label: 'Weight', value: formatWeight(member.weightKg) },
                { label: 'Sessions', value: `${member.stats.sessions}` },
                { label: 'Lifted', value: formatVolume(member.stats.volumeKg) },
                { label: 'Streak', value: `${member.stats.streakDays}d` },
                {
                  label: 'Last seen',
                  value: member.stats.lastSessionDate
                    ? formatRelativeDate(member.stats.lastSessionDate)
                    : 'Never',
                },
              ].map((stat) => (
                <div key={stat.label}>
                  <dt className="hud-label">{stat.label}</dt>
                  <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-white">{stat.value}</dd>
                </div>
              ))}
            </dl>

            {/* Danger zone */}
            <div className="mt-3 flex items-center justify-end gap-2 border-t border-white/[0.06] pt-3">
              {isConfirming ? (
                <>
                  <p className="mr-auto text-xs text-neon-red">
                    Delete {member.name} and all {member.stats.sessions} sessions?
                  </p>
                  <NeonButton size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                    Keep
                  </NeonButton>
                  <NeonButton
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(member)}
                    isLoading={busyId === member.id}
                  >
                    Delete
                  </NeonButton>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(member.id)}
                  className="font-display text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25 transition hover:text-neon-red"
                >
                  Remove member
                </button>
              )}
            </div>
          </Panel>
        );
      })}

      {members.length === 0 ? (
        <Panel className="p-5">
          <PanelHeader label="Roster" title="No members yet" />
        </Panel>
      ) : null}
    </div>
  );
}
