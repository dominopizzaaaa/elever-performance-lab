import type { MuscleGroupKey } from '@/lib/types';

/**
 * Geometry for the AI body avatar.
 *
 * The figure is assembled from primitives on a 220×460 canvas rather than one
 * hand-tuned silhouette path, which keeps it easy to adjust and impossible to
 * break into an unreadable blob. Shapes are authored for the left half of the
 * body and mirrored about `MIRROR_AXIS`.
 *
 * Keys must match the backend's canonical list.
 * @see backend/src/data/seed/muscleGroups.js
 */

export const CANVAS = { width: 220, height: 460 } as const;
export const MIRROR_AXIS = 110;

export type Shape =
  | { type: 'ellipse'; cx: number; cy: number; rx: number; ry: number; rotate?: number }
  | { type: 'rect'; x: number; y: number; w: number; h: number; rx: number; rotate?: number };

export interface MuscleRegion {
  key: MuscleGroupKey;
  label: string;
  /** Shapes on the left half; `mirror: true` duplicates them on the right. */
  shapes: Shape[];
  mirror: boolean;
  /**
   * Posterior groups can't be seen on a front-facing figure, so they render as
   * lateral bands. The legend carries the precise numbers.
   */
  posterior?: boolean;
}

export const MUSCLE_REGIONS: MuscleRegion[] = [
  {
    key: 'shoulders',
    label: 'Shoulders',
    mirror: true,
    shapes: [{ type: 'ellipse', cx: 76, cy: 101, rx: 15.5, ry: 14 }],
  },
  {
    key: 'chest',
    label: 'Chest',
    mirror: true,
    shapes: [{ type: 'rect', x: 86, y: 89, w: 21, h: 28, rx: 9 }],
  },
  {
    key: 'back',
    label: 'Back',
    mirror: true,
    posterior: true,
    shapes: [{ type: 'rect', x: 75, y: 116, w: 13, h: 38, rx: 6, rotate: -6 }],
  },
  {
    key: 'biceps',
    label: 'Biceps',
    mirror: true,
    shapes: [{ type: 'ellipse', cx: 68, cy: 136, rx: 9.5, ry: 19, rotate: 7 }],
  },
  {
    key: 'triceps',
    label: 'Triceps',
    mirror: true,
    posterior: true,
    shapes: [{ type: 'ellipse', cx: 55, cy: 133, rx: 6.5, ry: 16, rotate: 7 }],
  },
  {
    key: 'forearms',
    label: 'Forearms',
    mirror: true,
    shapes: [{ type: 'ellipse', cx: 58, cy: 180, rx: 8, ry: 22, rotate: 5 }],
  },
  {
    key: 'core',
    label: 'Core',
    mirror: false,
    shapes: [{ type: 'rect', x: 94, y: 120, w: 32, h: 48, rx: 10 }],
  },
  {
    key: 'glutes',
    label: 'Glutes',
    mirror: true,
    posterior: true,
    shapes: [{ type: 'ellipse', cx: 97, cy: 189, rx: 14, ry: 11 }],
  },
  {
    key: 'quads',
    label: 'Quads',
    mirror: true,
    shapes: [{ type: 'ellipse', cx: 97, cy: 240, rx: 14, ry: 37 }],
  },
  {
    key: 'hamstrings',
    label: 'Hamstrings',
    mirror: true,
    posterior: true,
    shapes: [{ type: 'rect', x: 79, y: 214, w: 10, h: 48, rx: 5, rotate: -2 }],
  },
  {
    key: 'calves',
    label: 'Calves',
    mirror: true,
    shapes: [{ type: 'ellipse', cx: 99, cy: 309, rx: 10.5, ry: 27 }],
  },
];

/**
 * Conditioning has no single muscle — it renders as an aura ring around the
 * whole figure instead of a body region.
 */
export const AURA_GROUP: MuscleGroupKey = 'conditioning';

/** Static frame parts (not load-mapped): head, neck, shins, feet. */
export const FRAME_SHAPES: Shape[] = [
  { type: 'ellipse', cx: 110, cy: 47, rx: 18.5, ry: 22 },
  { type: 'rect', x: 101, y: 66, w: 18, h: 16, rx: 7 },
  // Shins
  { type: 'rect', x: 94, y: 336, w: 11, h: 44, rx: 5 },
  { type: 'rect', x: 115, y: 336, w: 11, h: 44, rx: 5 },
  // Feet
  { type: 'rect', x: 90, y: 380, w: 18, h: 9, rx: 4 },
  { type: 'rect', x: 112, y: 380, w: 18, h: 9, rx: 4 },
];

/** Mirrors a shape about the vertical centre line. */
export function mirrorShape(shape: Shape): Shape {
  if (shape.type === 'ellipse') {
    return { ...shape, cx: MIRROR_AXIS * 2 - shape.cx, rotate: shape.rotate ? -shape.rotate : undefined };
  }
  return {
    ...shape,
    x: MIRROR_AXIS * 2 - shape.x - shape.w,
    rotate: shape.rotate ? -shape.rotate : undefined,
  };
}

/** Rotation transform around a shape's own centre. */
export function shapeTransform(shape: Shape): string | undefined {
  if (!shape.rotate) return undefined;
  const cx = shape.type === 'ellipse' ? shape.cx : shape.x + shape.w / 2;
  const cy = shape.type === 'ellipse' ? shape.cy : shape.y + shape.h / 2;
  return `rotate(${shape.rotate} ${cx} ${cy})`;
}
