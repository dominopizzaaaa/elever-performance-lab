import type { ReactNode } from 'react';

interface PageHeadingProps {
  eyebrow: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}

/** Consistent page title block: eyebrow, title, one line of context. */
export function PageHeading({ eyebrow, title, detail, action }: PageHeadingProps) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="hud-label">{eyebrow}</p>
        <h1 className="mt-1.5 font-display text-2xl font-black uppercase tracking-[0.06em] text-white sm:text-3xl">
          {title}
        </h1>
        {detail ? <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white/45">{detail}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
