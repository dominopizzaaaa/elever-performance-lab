import Link from 'next/link';
import { Wordmark } from '@/components/layout/Wordmark';
import { BackdropFx } from '@/components/layout/BackdropFx';

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <BackdropFx />
      <Wordmark size="md" />
      <div>
        <p className="font-display text-6xl font-black tracking-widest neon-text">404</p>
        <p className="mt-3 text-sm text-white/45">
          That terminal route does not exist on this panel.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-xl border border-accent/45 bg-accent-soft px-6 py-3 font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent transition hover:bg-accent/20"
      >
        Back to scan screen
      </Link>
    </div>
  );
}
