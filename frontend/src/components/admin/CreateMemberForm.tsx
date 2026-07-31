'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/providers/ToastProvider';
import { NeonButton } from '@/components/ui/NeonButton';
import { NumberStepper, TextField } from '@/components/ui/Field';
import type { User } from '@/lib/types';

interface CreateMemberFormProps {
  token: string;
  onCreated: (user: User) => void;
  onCancel: () => void;
}

/** Registers a new member. They start on an empty onboarding plan. */
export function CreateMemberForm({ token, onCreated, onCancel }: CreateMemberFormProps) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [age, setAge] = useState(25);
  const [weight, setWeight] = useState(75);
  const [tagline, setTagline] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    if (name.trim().length < 2) {
      setError('Enter the member name');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const { user } = await api.admin.createMember(
        {
          name: name.trim(),
          age,
          weightKg: weight,
          ...(tagline.trim() ? { tagline: tagline.trim() } : {}),
        },
        token,
      );
      onCreated(user);
      toast.success(`${user.name} registered`, `They scan in by typing "${user.name}" at the kiosk.`);
      setName('');
      setTagline('');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not create that member');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <TextField
        label="Full name"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          if (error) setError(null);
        }}
        placeholder="e.g. Wei Ling"
        hint="This is the name they type on the kiosk to scan in."
        error={error ?? undefined}
        autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <NumberStepper label="Age" value={age} onChange={setAge} min={10} max={100} />
        <NumberStepper
          label="Body weight"
          value={weight}
          onChange={setWeight}
          step={0.5}
          min={30}
          max={300}
          precision={1}
          suffix="kg"
        />
      </div>

      <TextField
        label="Tagline"
        value={tagline}
        onChange={(event) => setTagline(event.target.value)}
        placeholder="Optional — shown on their dashboard"
      />

      <div className="flex gap-2">
        <NeonButton type="submit" fullWidth isLoading={isSaving}>
          Register member
        </NeonButton>
        <NeonButton type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </NeonButton>
      </div>
    </form>
  );
}
