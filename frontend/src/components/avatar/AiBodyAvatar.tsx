'use client';

import { useCallback, useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Gender, MuscleGroupKey } from '@/lib/types';
import { cx } from '@/lib/format';
import {
  AURA_GROUP,
  CANVAS,
  getDetailPaths,
  getMuscleGroupLabels,
  getMuscleRegionPaths,
  getSilhouettePath,
  heatColor,
  heatScaleSamples,
  type BodyView,
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

/** Degrees of spin per pixel dragged. Tuned so a thumb-width flips the figure. */
const DRAG_SENSITIVITY = 0.7;

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Which face is pointing at the viewer at `angle` degrees. */
function viewAt(angle: number): BodyView {
  const normalised = ((angle % 360) + 360) % 360;
  return normalised > 90 && normalised < 270 ? 'back' : 'front';
}

/**
 * Holographic body scan.
 *
 * The figure is a real silhouette with anatomically placed muscle groups laid
 * over it (see `muscleRegions.ts`), heat-mapped by how much volume each group
 * has absorbed recently: cold blue means untouched, deep red means hammered. So
 * a member reads their split off the body itself, not off a chart.
 *
 * It spins. Lats, triceps, glutes and hamstrings live on the back of the body,
 * so they are drawn on the back of the figure — drag it round (or hit the
 * button) to see them. Hovering any region lights it up and names it.
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
  const active = useMemo(() => new Set(activeGroups), [activeGroups]);

  /** Committed + in-flight rotation, in degrees. Snaps to a multiple of 180. */
  const [angle, setAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState<MuscleGroupKey | null>(null);
  const drag = useRef<{ pointerId: number; startX: number; startAngle: number; moved: number } | null>(
    null,
  );

  const view = viewAt(angle);
  const silhouette = useMemo(() => getSilhouettePath(gender), [gender]);
  const auraIntensity = clamp01(muscleLoad[AURA_GROUP] ?? 0);

  const legend = useMemo(
    () =>
      getMuscleGroupLabels()
        .map((group) => ({ ...group, intensity: clamp01(muscleLoad[group.key] ?? 0) }))
        .sort((a, b) => b.intensity - a.intensity),
    [muscleLoad],
  );

  const hoveredEntry = hovered ? legend.find((item) => item.key === hovered) : null;

  const flip = useCallback(() => setAngle((current) => Math.round(current / 180) * 180 + 180), []);

  /** Turns the figure to whichever face `key` is drawn on. */
  const showGroup = useCallback((target: BodyView) => {
    setAngle((current) => {
      const snapped = Math.round(current / 180) * 180;
      return viewAt(snapped) === target ? snapped : snapped + 180;
    });
  }, []);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    // Ignore secondary buttons so a right-click never leaves the figure mid-spin.
    if (event.button !== 0) return;
    drag.current = { pointerId: event.pointerId, startX: event.clientX, startAngle: angle, moved: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;

    const dx = event.clientX - state.startX;
    state.moved = Math.max(state.moved, Math.abs(dx));
    // A real drag is a spin, not a hover — drop the highlight so the label does
    // not flicker between regions as the body sweeps past the cursor.
    if (state.moved > 6 && hovered) setHovered(null);
    setAngle(state.startAngle + dx * DRAG_SENSITIVITY);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    drag.current = null;
    setIsDragging(false);
    setAngle((current) => Math.round(current / 180) * 180);
  }

  return (
    <div className={cx('relative flex flex-col items-center', className)}>
      {/* Ambient glow behind the figure */}
      <div
        className="pointer-events-none absolute left-1/2 top-[46%] h-[80%] w-[62%] -translate-x-1/2 -translate-y-1/2 animate-pulse-glow rounded-[50%] blur-3xl"
        style={{ background: 'radial-gradient(circle, rgb(var(--accent-rgb) / 0.2), transparent 70%)' }}
        aria-hidden
      />

      {/* Which way round the figure is, plus whatever is under the cursor. */}
      <div className="relative z-10 flex h-6 items-center gap-2">
        {hoveredEntry ? (
          <span
            className="rounded-full border px-3 py-1 font-display text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{
              borderColor: `rgb(${heatColor(hoveredEntry.intensity)} / 0.6)`,
              backgroundColor: `rgb(${heatColor(hoveredEntry.intensity)} / 0.16)`,
              color: `rgb(${heatColor(hoveredEntry.intensity)})`,
            }}
          >
            {hoveredEntry.label} · {Math.round(hoveredEntry.intensity * 100)}%
          </span>
        ) : (
          <span className="font-display text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
            {view === 'front' ? 'Front' : 'Back'} view
          </span>
        )}
      </div>

      {/* Spin stage. Two faces of one card: front at 0°, back at 180°. */}
      <div
        className="relative w-full max-w-[260px] cursor-grab touch-pan-y select-none active:cursor-grabbing"
        style={{ perspective: '900px' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="relative w-full"
          style={{
            transform: `rotateY(${angle}deg)`,
            transformStyle: 'preserve-3d',
            transition: isDragging ? 'none' : 'transform 550ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          <BodyFace
            view="front"
            gender={gender}
            silhouette={silhouette}
            muscleLoad={muscleLoad}
            activeGroups={active}
            auraIntensity={auraIntensity}
            hovered={hovered}
            onHover={setHovered}
          />
          <div className="absolute inset-0" style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}>
            <BodyFace
              view="back"
              gender={gender}
              silhouette={silhouette}
              muscleLoad={muscleLoad}
              activeGroups={active}
              auraIntensity={auraIntensity}
              hovered={hovered}
              onHover={setHovered}
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={flip}
        className="mt-1 flex items-center gap-2 rounded-full border border-white/[0.09] bg-white/[0.03] px-4 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50 transition hover:border-accent/50 hover:bg-accent-soft hover:text-accent"
      >
        <span aria-hidden>⟲</span>
        Turn around
      </button>
      <p className="mt-1 text-center text-[11px] text-white/25">Or drag the figure to spin it.</p>

      {heightCm || weightKg ? (
        <div className="mt-2 flex items-center gap-3 font-display text-xs font-semibold uppercase tracking-[0.1em] text-white/60">
          {heightCm ? <span>{heightCm} cm</span> : null}
          {heightCm && weightKg ? <span className="text-white/20">·</span> : null}
          {weightKg ? <span>{weightKg} kg</span> : null}
        </div>
      ) : null}

      {showLegend ? (
        <>
          {/* Colour scale — the key to everything on the figure. */}
          <div className="mt-4 w-full">
            <div
              className="h-1.5 w-full rounded-full"
              style={{
                background: `linear-gradient(to right, ${heatScaleSamples()
                  .map((color) => `rgb(${color})`)
                  .join(', ')})`,
              }}
              aria-hidden
            />
            <div className="mt-1.5 flex justify-between font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-white/35">
              <span>Not trained</span>
              <span>Hammered</span>
            </div>
          </div>

          <p className="mt-3 text-center text-xs leading-relaxed text-white/40">
            The redder a place is, the more work it has taken in the last 14 days. Blue means you
            haven&apos;t touched it.
          </p>

          <div className="mt-3 grid w-full grid-cols-3 gap-1.5">
            {legend.map((item) => (
              <button
                key={item.key}
                type="button"
                onMouseEnter={() => setHovered(item.key)}
                onMouseLeave={() => setHovered((current) => (current === item.key ? null : current))}
                onClick={() => showGroup(item.view)}
                title={
                  item.view === 'back'
                    ? 'On your back — turn the figure around to see it'
                    : 'On the front of the figure'
                }
                className={cx(
                  'rounded-lg border px-2 py-1.5 text-left transition',
                  hovered === item.key
                    ? 'border-white/25 bg-white/[0.06]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:border-white/15',
                )}
              >
                <p className="flex items-center gap-1 font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  <span className="truncate">{item.label}</span>
                  {item.view === 'back' ? <span className="shrink-0 text-white/25">↻</span> : null}
                </p>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full transition-[width] duration-1000"
                    style={{
                      width: `${Math.max(3, item.intensity * 100)}%`,
                      backgroundColor: `rgb(${heatColor(item.intensity)})`,
                      boxShadow: `0 0 8px rgb(${heatColor(item.intensity)} / 0.7)`,
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

interface BodyFaceProps {
  view: BodyView;
  gender: Gender;
  silhouette: string;
  muscleLoad: Partial<Record<MuscleGroupKey, number>>;
  activeGroups: Set<MuscleGroupKey>;
  auraIntensity: number;
  hovered: MuscleGroupKey | null;
  onHover: (key: MuscleGroupKey | null) => void;
}

/** One side of the figure. Two of these make the spinnable card. */
function BodyFace({
  view,
  gender,
  silhouette,
  muscleLoad,
  activeGroups,
  auraIntensity,
  hovered,
  onHover,
}: BodyFaceProps) {
  const uid = `${useId().replace(/:/g, '')}-${view}`;
  const regions = useMemo(() => getMuscleRegionPaths(gender, view), [gender, view]);
  const details = useMemo(() => getDetailPaths(gender, view), [gender, view]);

  return (
    <svg
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      className="relative w-full overflow-visible"
      style={{ backfaceVisibility: 'hidden' }}
      role="img"
      aria-label={`${view === 'front' ? 'Front' : 'Back'} of your body scan, showing which muscle groups you have trained most in the last 14 days`}
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

        {/* Heat-mapped muscle groups */}
        {regions.map((region) => {
          const intensity = clamp01(muscleLoad[region.key] ?? 0);
          const isActive = activeGroups.has(region.key);
          const isHovered = hovered === region.key;
          const color = heatColor(intensity);

          return (
            <g
              key={region.key}
              className={cx('cursor-pointer', isActive && 'animate-pulse-glow')}
              filter={intensity > 0.55 || isActive || isHovered ? `url(#${uid}-glow)` : undefined}
              // Without an explicit box the pulse would scale about the SVG
              // origin and throw the region across the canvas.
              style={isActive ? { transformBox: 'fill-box', transformOrigin: 'center' } : undefined}
              onPointerEnter={() => onHover(region.key)}
              onPointerLeave={() => onHover(null)}
            >
              <title>{`${region.label}: ${Math.round(intensity * 100)}% of peak load`}</title>
              {region.paths.map((path, index) => (
                <path
                  key={index}
                  d={path}
                  fill={`rgb(${color})`}
                  fillOpacity={Math.min(1, 0.22 + intensity * 0.66 + (isHovered ? 0.2 : 0))}
                  stroke={`rgb(${color})`}
                  strokeOpacity={isHovered ? 1 : 0.45 + intensity * 0.4}
                  strokeWidth={isHovered ? 1.7 : 0.8}
                />
              ))}
            </g>
          );
        })}

        {/* Collarbones and abs on the front; spine and shoulder blades on the back */}
        <g
          className="pointer-events-none"
          fill="none"
          stroke="rgb(var(--accent-rgb))"
          strokeOpacity={0.3}
          strokeWidth={0.7}
          strokeLinecap="round"
        >
          {details.map((path, index) => (
            <path key={index} d={path} />
          ))}
        </g>

        {/* Sweeping scan band, contained by the body */}
        <rect
          className="pointer-events-none animate-scan-down"
          x={0}
          y={0}
          width={CANVAS.width}
          height={64}
          fill={`url(#${uid}-scan)`}
          style={{ transformBox: 'view-box' }}
        />
      </g>

      {/* Rim light, drawn last so it reads as an edge */}
      <path
        className="pointer-events-none"
        d={silhouette}
        fill="none"
        stroke={`url(#${uid}-rim)`}
        strokeWidth={1.1}
        strokeLinejoin="round"
        filter={`url(#${uid}-rim-glow)`}
      />
    </svg>
  );
}
