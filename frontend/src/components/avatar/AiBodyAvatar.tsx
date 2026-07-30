'use client';

import { useId, useMemo } from 'react';
import type { Gender, MuscleGroupKey } from '@/lib/types';
import { cx } from '@/lib/format';
import {
  AURA_GROUP,
  CANVAS,
  getDetailPaths,
  getMuscleGroupLabels,
  getMuscleRegionPaths,
  getSilhouettePath,
} from './muscleRegions';

interface AiBodyAvatarProps {
  /** Normalised 0–1 load per muscle group over the trailing 14 days. */
  muscleLoad: Partial<Record<MuscleGroupKey, number>>;
  /** Groups trained in today's session — these pulse. */
  activeGroups?: MuscleGroupKey[];
  /** Shapes the figure's build. Defaults to a male build. */
  gender?: Gender;
  /** Shown as a readout under the figure when provided. */
  heightCm?: number | null;
  weightKg?: number | null;
  className?: string;
  /** Renders the intensity legend under the figure. */
  showLegend?: boolean;
}

/** Horizontal contour lines inside the body — the "scanned model" texture. */
const CONTOURS = Array.from({ length: 26 }, (_, index) => 26 + index * 15);

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * Holographic body scan.
 *
 * The figure is a real silhouette with anatomically placed muscle groups laid
 * over it (see `muscleRegions.ts`), lit by how much volume each group has
 * absorbed recently: bright regions are being hammered, dim ones neglected. So
 * a member reads their split off the body itself, not off a chart.
 *
 * Groups on the back of the body cannot be drawn on a front-facing figure, so
 * they light up as flank bands, and conditioning work — which belongs to no one
 * muscle — drives the aura ring around the whole figure instead.
 */
export function AiBodyAvatar({
  muscleLoad,
  activeGroups = [],
  gender = 'male',
  heightCm,
  weightKg,
  className,
  showLegend = true,
}: AiBodyAvatarProps) {
  const uid = useId().replace(/:/g, '');
  const active = useMemo(() => new Set(activeGroups), [activeGroups]);

  const silhouette = useMemo(() => getSilhouettePath(gender), [gender]);
  const regions = useMemo(() => getMuscleRegionPaths(gender), [gender]);
  const details = useMemo(() => getDetailPaths(gender), [gender]);

  const auraIntensity = clamp01(muscleLoad[AURA_GROUP] ?? 0);

  const legend = useMemo(
    () =>
      getMuscleGroupLabels()
        .map((group) => ({ ...group, intensity: clamp01(muscleLoad[group.key] ?? 0) }))
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 6),
    [muscleLoad],
  );

  return (
    <div className={cx('relative flex flex-col items-center', className)}>
      {/* Ambient glow behind the figure */}
      <div
        className="pointer-events-none absolute left-1/2 top-[46%] h-[80%] w-[62%] -translate-x-1/2 -translate-y-1/2 animate-pulse-glow rounded-[50%] blur-3xl"
        style={{ background: 'radial-gradient(circle, rgb(var(--accent-rgb) / 0.2), transparent 70%)' }}
        aria-hidden
      />

      <div className="relative w-full max-w-[260px]">
        <svg
          viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
          className="relative w-full overflow-visible"
          role="img"
          aria-label="Body scan showing which muscle groups you have trained most in the last 14 days"
        >
          <defs>
            {/* Body mass: darker at the edges so the figure has volume. */}
            <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#060a14" />
              <stop offset="42%" stopColor="#101a2e" />
              <stop offset="58%" stopColor="#101a2e" />
              <stop offset="100%" stopColor="#060a14" />
            </linearGradient>

            {/* Accent light pooling around the chest and hips. */}
            <radialGradient id={`${uid}-core`} cx="50%" cy="30%" r="62%">
              <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.2" />
              <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0" />
            </radialGradient>

            {/* Rim light: the outline is brightest across the shoulders. */}
            <linearGradient id={`${uid}-rim`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.45" />
              <stop offset="22%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.95" />
              <stop offset="70%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.6" />
              <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.35" />
            </linearGradient>

            <linearGradient id={`${uid}-scan`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0" />
              <stop offset="50%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0.5" />
              <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity="0" />
            </linearGradient>

            <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id={`${uid}-rim-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Everything inside the body is clipped to it — nothing spills. */}
            <clipPath id={`${uid}-body-clip`}>
              <path d={silhouette} />
            </clipPath>
          </defs>

          {/* Conditioning aura */}
          <ellipse
            cx={CANVAS.width / 2}
            cy={CANVAS.height / 2 + 8}
            rx={100}
            ry={214}
            fill="none"
            stroke="rgb(var(--accent-rgb))"
            strokeOpacity={0.08 + auraIntensity * 0.32}
            strokeWidth={auraIntensity > 0.5 ? 1.3 : 0.8}
            strokeDasharray="3 11"
            className="animate-spin-slow"
            style={{ transformOrigin: 'center' }}
          />

          {/* Body mass */}
          <path d={silhouette} fill={`url(#${uid}-body)`} />

          <g clipPath={`url(#${uid}-body-clip)`}>
            <rect width={CANVAS.width} height={CANVAS.height} fill={`url(#${uid}-core)`} />

            {/* Scan contours */}
            <g stroke="rgb(var(--accent-rgb))" strokeOpacity={0.07} strokeWidth={0.5}>
              {CONTOURS.map((y) => (
                <line key={y} x1={0} y1={y} x2={CANVAS.width} y2={y} />
              ))}
            </g>

            {/* Load-mapped muscle groups */}
            {regions.map((region) => {
              const intensity = clamp01(muscleLoad[region.key] ?? 0);
              const isActive = active.has(region.key);

              // Flank bands are an indication, not anatomy — keep them quieter
              // than the groups that really are on the front of the body.
              const scale = region.posterior ? 0.78 : 1;
              const fillOpacity = (0.06 + intensity * 0.68) * scale;
              const strokeOpacity = (0.2 + intensity * 0.5) * scale;

              return (
                <g
                  key={region.key}
                  className={isActive ? 'animate-pulse-glow' : undefined}
                  filter={intensity > 0.55 || isActive ? `url(#${uid}-glow)` : undefined}
                  // Without an explicit box the pulse would scale about the SVG
                  // origin and throw the region across the canvas.
                  style={isActive ? { transformBox: 'fill-box', transformOrigin: 'center' } : undefined}
                >
                  <title>{`${region.label}: ${Math.round(intensity * 100)}% of peak load`}</title>
                  {region.paths.map((path, index) => (
                    <path
                      key={index}
                      d={path}
                      fill="rgb(var(--accent-rgb))"
                      fillOpacity={fillOpacity}
                      stroke="rgb(var(--accent-rgb))"
                      strokeOpacity={strokeOpacity}
                      strokeWidth={0.7}
                    />
                  ))}
                </g>
              );
            })}

            {/* Collarbones, sternum, ab divisions, knee lines */}
            <g fill="none" stroke="rgb(var(--accent-rgb))" strokeOpacity={0.3} strokeWidth={0.7} strokeLinecap="round">
              {details.map((path, index) => (
                <path key={index} d={path} />
              ))}
            </g>

            {/* Sweeping scan band, contained by the body */}
            <rect
              x={0}
              y={0}
              width={CANVAS.width}
              height={64}
              fill={`url(#${uid}-scan)`}
              className="animate-scan-down"
              style={{ transformBox: 'view-box' }}
            />
          </g>

          {/* Rim light, drawn last so it reads as an edge */}
          <path
            d={silhouette}
            fill="none"
            stroke={`url(#${uid}-rim)`}
            strokeWidth={1.1}
            strokeLinejoin="round"
            filter={`url(#${uid}-rim-glow)`}
          />
        </svg>
      </div>

      {heightCm || weightKg ? (
        <div className="mt-1 flex items-center gap-3 font-display text-xs font-semibold uppercase tracking-[0.1em] text-white/60">
          {heightCm ? <span>{heightCm} cm</span> : null}
          {heightCm && weightKg ? <span className="text-white/20">·</span> : null}
          {weightKg ? <span>{weightKg} kg</span> : null}
        </div>
      ) : null}

      {showLegend ? (
        <>
          <p className="mt-3 text-center text-xs leading-relaxed text-white/40">
            Places you&apos;ve trained most over the last 14 days — brighter means more work done.
          </p>
          <div className="mt-2 grid w-full grid-cols-3 gap-1.5">
            {legend.map((item) => (
              <div
                key={item.key}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5"
                title={item.posterior ? 'On your back — shown as a band down your side' : undefined}
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
        </>
      ) : null}
    </div>
  );
}
