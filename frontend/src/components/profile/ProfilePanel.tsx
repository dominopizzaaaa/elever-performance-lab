'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { Panel } from '@/components/ui/Panel';
import { NeonButton } from '@/components/ui/NeonButton';
import { NumberStepper } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Feedback';
import { formatLongDate, formatWeight } from '@/lib/format';
import type { User } from '@/lib/types';

interface ProfilePanelProps {
  user: User;
  token: string;
  onUpdated: (user: User) => void;
}

/**
 * Member identity and body stats, editable in place.
 *
 * Weight edits are appended to `weightHistory` on the server, so the JSON file
 * keeps a trend rather than just the latest number.
 */
export function ProfilePanel({ user, token, onUpdated }: ProfilePanelProps) {
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [weight, setWeight] = useState(user.weightKg);
  const [age, setAge] = useState(user.age);
  const [bodyFat, setBodyFat] = useState(user.bodyFatPct ?? 0);
  const [targetWeight, setTargetWeight] = useState(user.goals.targetWeightKg);
  const [weeklySessions, setWeeklySessions] = useState(user.goals.weeklySessions);

  function resetForm(source: User) {
    setWeight(source.weightKg);
    setAge(source.age);
    setBodyFat(source.bodyFatPct ?? 0);
    setTargetWeight(source.goals.targetWeightKg);
    setWeeklySessions(source.goals.weeklySessions);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const { user: updated } = await api.updateUser(
        user.id,
        {
          weightKg: weight,
          age,
          bodyFatPct: bodyFat > 0 ? bodyFat : null,
          goals: { targetWeightKg: targetWeight, weeklySessions },
        },
        token,
      );
      onUpdated(updated);
      resetForm(updated);
      setIsEditing(false);
      toast.success('Profile saved', 'Your stats are stored on the lab server.');
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : 'Could not save your profile');
    } finally {
      setIsSaving(false);
    }
  }

  const bmi = user.heightCm ? user.weightKg / (user.heightCm / 100) ** 2 : null;

  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-black uppercase tracking-[0.04em] text-white">
              {user.name}
            </h2>
            <Badge tone="accent">{user.tier}</Badge>
          </div>
          <p className="mt-1.5 text-sm text-white/45">{user.tagline}</p>
          <p className="mt-1 font-display text-[10px] uppercase tracking-[0.2em] text-white/25">
            {user.memberNumber} · member since {formatLongDate(user.joinedAt)}
          </p>
        </div>

        {!isEditing ? (
          <NeonButton size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
            Edit
          </NeonButton>
        ) : null}
      </div>

      {isEditing ? (
        <div className="mt-5 border-t border-white/[0.06] pt-4">
          <div className="grid grid-cols-2 gap-3">
            <NumberStepper
              label="Body weight"
              value={weight}
              onChange={setWeight}
              step={0.1}
              min={30}
              max={300}
              precision={1}
              suffix="kg"
            />
            <NumberStepper label="Age" value={age} onChange={setAge} min={10} max={100} />
            <NumberStepper
              label="Body fat"
              value={bodyFat}
              onChange={setBodyFat}
              step={0.1}
              min={0}
              max={60}
              precision={1}
              suffix="%"
            />
            <NumberStepper
              label="Target weight"
              value={targetWeight}
              onChange={setTargetWeight}
              step={0.5}
              min={30}
              max={300}
              precision={1}
              suffix="kg"
            />
            <NumberStepper
              label="Sessions / week"
              value={weeklySessions}
              onChange={setWeeklySessions}
              min={1}
              max={14}
              className="col-span-2"
            />
          </div>

          <div className="mt-4 flex gap-2">
            <NeonButton fullWidth onClick={handleSave} isLoading={isSaving}>
              Save profile
            </NeonButton>
            <NeonButton
              variant="ghost"
              onClick={() => {
                resetForm(user);
                setIsEditing(false);
              }}
            >
              Cancel
            </NeonButton>
          </div>
        </div>
      ) : (
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/[0.06] pt-4 sm:grid-cols-4">
          {[
            { label: 'Weight', value: formatWeight(user.weightKg) },
            { label: 'Age', value: `${user.age} yrs` },
            { label: 'Height', value: user.heightCm ? `${user.heightCm} cm` : '—' },
            { label: 'Body fat', value: user.bodyFatPct !== null ? `${user.bodyFatPct}%` : '—' },
            { label: 'Resting HR', value: user.restingHr ? `${user.restingHr} bpm` : '—' },
            { label: 'BMI', value: bmi ? bmi.toFixed(1) : '—' },
            { label: 'Target', value: formatWeight(user.goals.targetWeightKg) },
            { label: 'Goal focus', value: user.goals.focus },
          ].map((item) => (
            <div key={item.label}>
              <dt className="hud-label">{item.label}</dt>
              <dd className="mt-1 truncate text-base font-semibold tabular-nums text-white">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}
