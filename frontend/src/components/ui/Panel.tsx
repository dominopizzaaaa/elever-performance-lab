import type { ReactNode } from 'react';
import { cx } from '@/lib/format';

interface PanelProps {
  children: ReactNode;
  className?: string;
  /** Adds the accent-tinted border + outer glow. */
  accent?: boolean;
  /** Adds the fading hairline along the top edge. */
  edge?: boolean;
  /** Adds corner registration brackets. */
  brackets?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside';
}

/** Standard glassy surface used for every card on the kiosk. */
export function Panel({
  children,
  className,
  accent = false,
  edge = false,
  brackets = false,
  as: Tag = 'div',
}: PanelProps) {
  return (
    <Tag
      className={cx(
        accent ? 'panel-accent' : 'panel',
        edge && 'edge-glow',
        brackets && 'corner-brackets',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

interface PanelHeaderProps {
  label: string;
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** `LABEL` / big title / right-aligned action, the layout every panel repeats. */
export function PanelHeader({ label, title, action, className }: PanelHeaderProps) {
  return (
    <div className={cx('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <p className="hud-label">{label}</p>
        {title ? (
          <h2 className="mt-1.5 font-display text-lg font-bold tracking-wide text-white">{title}</h2>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
