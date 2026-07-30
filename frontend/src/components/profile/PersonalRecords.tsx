import { Panel, PanelHeader } from '@/components/ui/Panel';
import { EmptyState } from '@/components/ui/Feedback';
import { formatRelativeDate, formatWeight } from '@/lib/format';
import type { PersonalRecord } from '@/lib/types';

/** Estimated 1RM (Epley), mirroring the server's calculation. */
function estimateOneRepMax(weightKg: number, reps: number): number {
  if (!weightKg || !reps) return 0;
  return Math.round(weightKg * (1 + Math.min(reps, 12) / 30) * 10) / 10;
}

export function PersonalRecords({ records }: { records: PersonalRecord[] }) {
  const sorted = [...records].sort(
    (a, b) => estimateOneRepMax(b.weightKg, b.reps) - estimateOneRepMax(a.weightKg, a.reps),
  );

  return (
    <Panel className="p-5">
      <PanelHeader label="Personal records" title="Lifetime bests" />

      {sorted.length === 0 ? (
        <EmptyState title="No records yet" detail="Log a few heavy sets and they will land here automatically." />
      ) : (
        <ul className="mt-4 flex flex-col gap-1.5">
          {sorted.map((record) => {
            const estimate = record.estimatedOneRepMax ?? estimateOneRepMax(record.weightKg, record.reps);
            return (
              <li
                key={record.exercise}
                className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-xs font-bold uppercase tracking-[0.08em] text-white">
                    {record.exercise}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-white/35">
                    {formatRelativeDate(record.achievedAt)}
                    {record.note ? ` · ${record.note}` : ''}
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums text-white">
                    {record.weightKg > 0 ? formatWeight(record.weightKg) : 'Bodyweight'}
                    {record.reps > 1 ? <span className="text-white/35"> × {record.reps}</span> : null}
                  </span>
                  {estimate > 0 ? (
                    <span className="block text-[11px] tabular-nums text-white/30">~{estimate} kg max</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
