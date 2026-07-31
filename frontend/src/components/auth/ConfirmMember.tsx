'use client';

import { useEffect } from 'react';
import { NeonButton } from '@/components/ui/NeonButton';
import type { MemberIdentity } from '@/lib/types';

interface ConfirmMemberProps {
  /** Who the kiosk thinks is standing there — echoed back for confirmation. */
  member: MemberIdentity;
  onConfirm: () => void;
  onCancel: () => void;
  isOpening: boolean;
  error: string | null;
}

/**
 * Confirm step of scan-in.
 *
 * On a shared floor screen the mistake that actually happens is a near-miss on
 * the name — two members whose names start the same, or the kiosk still holding
 * the last person's session. So the resolved name is shown large, with the
 * member number under it, and nothing opens until someone says yes.
 */
export function ConfirmMember({ member, onConfirm, onCancel, isOpening, error }: ConfirmMemberProps) {
  // Enter opens, Escape goes back — staff test the kiosk with a keyboard.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
      if (event.key === 'Enter' && !isOpening) onConfirm();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel, onConfirm, isOpening]);

  return (
    <div className="relative">
      <p className="hud-label text-center">Confirm it&apos;s you</p>

      <h2 className="mt-2 text-center font-display text-2xl font-bold uppercase tracking-[0.14em] text-white sm:text-3xl">
        {member.name}
      </h2>
      <p className="mt-1.5 text-center font-display text-[10px] uppercase tracking-[0.22em] text-white/35">
        {member.memberNumber} · {member.tier}
      </p>

      <p className="mx-auto mt-5 max-w-sm text-center text-sm leading-relaxed text-white/45">
        This opens {member.name.split(' ')[0]}&apos;s profile and today&apos;s training log.
      </p>

      {error ? (
        <p role="alert" className="mt-4 text-center text-sm text-neon-red">
          {error}
        </p>
      ) : null}

      <div className="mx-auto mt-6 flex max-w-sm flex-col gap-2">
        <NeonButton
          size="lg"
          fullWidth
          onClick={onConfirm}
          isLoading={isOpening}
          icon={!isOpening ? <span aria-hidden>▶</span> : undefined}
          autoFocus
        >
          {isOpening ? 'Opening profile' : "Yes, that's me"}
        </NeonButton>
        <NeonButton variant="ghost" size="lg" fullWidth onClick={onCancel} disabled={isOpening}>
          Not me — go back
        </NeonButton>
      </div>
    </div>
  );
}
