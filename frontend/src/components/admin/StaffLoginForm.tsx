'use client';

import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { NeonButton } from '@/components/ui/NeonButton';
import { TextField } from '@/components/ui/Field';
import { ApiError } from '@/lib/api';

interface StaffLoginFormProps {
  onSignIn: (username: string, password: string) => Promise<unknown>;
}

/** Staff sign-in gate for the admin panel. */
export function StaffLoginForm({ onSignIn }: StaffLoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!username.trim() || !password) {
      setError('Enter your staff username and password');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSignIn(username.trim(), password);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not sign in');
      setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <Panel accent edge brackets className="overflow-hidden p-6 sm:p-8">
        <div className="text-center">
          <span
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-accent/40 bg-accent-soft font-display text-lg text-accent"
            aria-hidden
          >
            ⬡
          </span>
          <h2 className="mt-4 font-display text-lg font-bold uppercase tracking-[0.18em] text-white">
            Staff access
          </h2>
          <p className="mt-2 text-sm text-white/40">
            The admin panel manages members and their training logs.
          </p>
        </div>

        <form
          className="mt-6 flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <TextField
            label="Username"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
              if (error) setError(null);
            }}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />

          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (error) setError(null);
            }}
            autoComplete="current-password"
            error={error ?? undefined}
          />

          <NeonButton type="submit" size="lg" fullWidth isLoading={isSubmitting}>
            Sign in
          </NeonButton>
        </form>

        <p className="mt-5 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-xs leading-relaxed text-white/35">
          Demo credentials — <span className="text-white/60">coach / elever-lab-2026</span>. Passwords are
          scrypt-hashed in <code className="text-white/50">admins.json</code>; change them before any real
          deployment.
        </p>
      </Panel>
    </div>
  );
}
