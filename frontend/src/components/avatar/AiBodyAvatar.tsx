'use client';

import { useId, useMemo } from 'react';
import type { MuscleGroupKey } from '@/lib/types';
import { cx } from '@/lib/format';
import {
  AURA_GROUP,
  CANVAS,
  FRAME_SHAPES,
  MUSCLE_REGIONS,
  mirrorShape,
  shapeTransform,
  type Shape,
} from './muscleRegions';

interface AiBodyAvatarProps {
  /** Normalised 0–1 load per muscle group over the trailing 14 days. */
  muscleLoad: Partial<Record<MuscleGroupKey, number>>;
  /** Groups trained in today's session — these pulse. */
  activeGroups?: MuscleGroupKey[];
  className?: string;
  /** Renders the intensity legend under the figure. */
  showLegend?: boolean;
}

function renderShape(shape: Shape, key: string, className: string, style?: React.CSSProperties) {
  const transform = shapeTransform(shape);
  if (shape.type === 'ellipse') {
    return (
      <ellipse
        key={key}
        cx={shape.cx}
        cy={shape.cy}
        rx={shape.rx}
        ry={shape.ry}
        transform={transform}
        className={className}
        style={style}
      />
    );
  }
  return (
    <rect
      key={key}
      x={shape.x}
      y={shape.y}
      width={shape.w}
      height={shape.h}
      rx={shape.rx}
      transform={transform}
      className={className}
      style={style}
    />
  );
}

/**
 * Holographic body scan.
 *
 * Each muscle region's fill opacity tracks how much volume it has absorbed
 * recently, so a member can see their split at a glance: bright regions are
 * being hammered, dim ones are being neglected. Posterior groups render as
 * lateral bands (a front-facing figure can't show them) and conditioning work
 * drives the aura ring instead of a body part.
 */
export function AiBodyAvatar({ muscleLoad, activeGroups = [], className, showLegend = true }: AiBodyAvatarProps) {
  const uid = useId().replace(/:/g, '');
  const active = useMemo(() => new Set(activeGroups), [activeGroups]);

  const auraIntensity = muscleLoad[AURA_GROUP] ?? 0;

  const legend = useMemo(
    () =>
      MUSCLE_REGIONS.map((region) => ({
        key: region.key,
        label: region.label,
        intensity: muscleLoad[region.key] ?? 0,
        posterior: region.posterior ?? false,
      }))
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 6),
    [muscleLoad],
  );

  return (
    <div className={cx('relative flex flex-col items-center', className)}>
      {/* Ambient glow behind the figure */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[85%] w-[70%] -translate-x-1/2 -translate-y-1/2 animate-pulse-glow rounded-[50%] blur-3xl"
        style={{ background: 'radial-gradient(circle, rgb(var(--accent-rgb) / 0.22), transparent 70%)' }}
        aria-hidden
      />

      <div className="relative w-full max-w-[250px]">
        <svg
          viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
          className="relative w-full"
          role="img"
          aria-label="Body scan showing which muscle groups you have trained most in the last 14 days"
        >
          <defs>
            <radialGradient id={`${uid}-core`} cx="50%" cy="35%" r="65%">
              <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.16" />
              <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.02" />
            </radialGradient>

            <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Sweeping scan band */}
            <linearGradient id={`${uid}-scan`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0" />
              <stop offset="50%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.55" />
              <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0" />
            </linearGradient>

            <clipPath id={`${uid}-clip`}>
              <rect x="0" y="0" width={CANVAS.width} height={CANVAS.height} />
            </clipPath>
          </defs>

          {/* Conditioning aura */}
          <ellipse
            cx={CANVAS.width / 2}
            cy={CANVAS.height / 2}
            rx={96}
            ry={212}
            fill="none"
            stroke="rgb(var(--accent-rgb))"
            strokeOpacity={0.1 + auraIntensity * 0.35}
            strokeWidth={auraIntensity > 0.5 ? 1.4 : 0.8}
            strokeDasharray="4 10"
            className="animate-spin-slow"
            style={{ transformOrigin: 'center' }}
          />

          {/* Static frame: head, neck, shins, feet */}
          <g fill={`url(#${uid}-core)`} stroke="rgb(var(--accent-rgb))" strokeOpacity={0.35} strokeWidth={0.9}>
            {FRAME_SHAPES.map((shape, index) => renderShape(shape, `frame-${index}`, ''))}
          </g>

          {/* Load-mapped muscle regions */}
          <g clipPath={`url(#${uid}-clip)`}>
            {MUSCLE_REGIONS.map((region) => {
              const intensity = Math.max(0, Math.min(1, muscleLoad[region.key] ?? 0));
              const isActive = active.has(region.key);

              // Dim posterior bands slightly: they are an indication, not anatomy.
              const scale = region.posterior ? 0.8 : 1;
              const fillOpacity = (0.07 + intensity * 0.72) * scale;
              const strokeOpacity = 0.22 + intensity * 0.5;

              const shapes = region.mirror
                ? region.shapes.flatMap((shape) => [shape, mirrorShape(shape)])
                : region.shapes;

              return (
                <g
                  key={region.key}
                  className={isActive ? 'animate-pulse-glow' : undefined}
                  filter={intensity > 0.55 || isActive ? `url(#${uid}-glow)` : undefined}
                >
                  <title>{`${region.label}: ${Math.round(intensity * 100)}% of peak load`}</title>
                  {shapes.map((shape, index) =>
                    renderShape(shape, `${region.key}-${index}`, '', {
                      fill: 'rgb(var(--accent-rgb))',
                      fillOpacity,
                      stroke: 'rgb(var(--accent-rgb))',
                      strokeOpacity,
                      strokeWidth: 0.8,
                    }),
                  )}
                </g>
              );
            })}
          </g>

          {/* Centre line + rib ticks for the "scanned model" look */}
          <g stroke="rgb(var(--accent-rgb))" strokeOpacity={0.16} strokeWidth={0.6}>
            <line x1={110} y1={92} x2={110} y2={330} strokeDasharray="2 6" />
            {[128, 140, 152, 164].map((y) => (
              <line key={y} x1={98} y1={y} x2={122} y2={y} />
            ))}
          </g>

          {/* Sweeping scan line */}
          <rect
            x="8"
            y="0"
            width={CANVAS.width - 16}
            height="46"
            fill={`url(#${uid}-scan)`}
            className="animate-scan-down"
            style={{ transformBox: 'view-box' }}
          />
        </svg>
      </div>

      {showLegend ? (
        <div className="mt-2 grid w-full grid-cols-3 gap-1.5">
          {legend.map((item) => (
            <div
              key={item.key}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5"
              title={item.posterior ? 'Posterior group — shown as a lateral band on the figure' : undefined}
            >
              <p className="truncate font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45">
                {item.label}
              </p>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-1000"
                  style={{
                    width: `${Math.max(3, item.intensity * 100)}%`,
                    boxShadow: '0 0 8px rgb(var(--accent-rgb) / 0.7)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
