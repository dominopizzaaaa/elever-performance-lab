'use client';

import { NeonButton } from '@/components/ui/NeonButton';

interface IdleLockWarningProps {
  secondsLeft: number;
  onStay: () => void;
  onScanOut: () => void;
}

/**
 * Countdown shown in the last seconds before the kiosk locks itself.
 *
 * Any touch anywhere already resets the idle timer, so this is as much a notice
 * as a dialog — but the explicit buttons matter: someone reading their plan
 * gets an obvious way to stay, and someone who has finished gets a one-tap exit
 * instead of walking away from a screen full of their own data.
 */
export function IdleLockWarning({ secondsLeft, onStay, onScanOut }: IdleLockWarningProps) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-lock-title"
      aria-describedby="idle-lock-detail"
      className="fixed inset-0 z-50 flex items-center justify-center bg-void-900/80 px-5 backdrop-blur-md"
    >
      <div className="w-full max-w-sm rounded-2xl border border-neon-red/35 bg-void-800/95 p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-neon-red/50 bg-neon-red/10">
          <span
            className="font-display text-3xl font-bold tabular-nums text-neon-red"
            aria-hidden
          >
            {secondsLeft}
          </span>
        </div>

        <h2
          id="idle-lock-title"
          className="mt-5 font-display text-lg font-bold uppercase tracking-[0.16em] text-white"
        >
          Locking in {secondsLeft}s
        </h2>
        <p id="idle-lock-detail" className="mt-2 text-sm leading-relaxed text-white/50">
          Still there? The kiosk signs you out automatically so nobody else sees your profile.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <NeonButton size="lg" fullWidth onClick={onStay} autoFocus>
            I&apos;m still here
          </NeonButton>
          <NeonButton size="md" variant="danger" fullWidth onClick={onScanOut}>
            Scan out now
          </NeonButton>
        </div>
      </div>
    </div>
  );
}
