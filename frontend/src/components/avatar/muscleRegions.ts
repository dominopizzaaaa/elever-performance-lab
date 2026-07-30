import type { Gender, MuscleGroupKey } from '@/lib/types';

/**
 * Geometry for the AI body avatar.
 *
 * The figure is assembled from primitives on a 220×460 canvas rather than one
 * hand-tuned silhouette path, which keeps it easy to adjust and impossible to
 * break into an unreadable blob. Shapes are authored for the left half of the
 * body and mirrored about `MIRROR_AXIS`.
 *
 * Male and female builds get their own proportions (shoulder width, waist
 * taper, hip width) so the figure reads as a body, not a unisex mannequin.
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

/** Strong, lean build: broad shoulders and lats, tapered waist, developed legs. */
const MALE_REGIONS: MuscleRegion[] = [
  { key: 'shoulders', label: 'Shoulders', mirror: true, shapes: [{ type: 'ellipse', cx: 78, cy: 100, rx: 16, ry: 14.5 }] },
  { key: 'chest', label: 'Chest', mirror: true, shapes: [{ type: 'rect', x: 85, y: 88, w: 23, h: 29, rx: 10 }] },
  {
    key: 'back',
    label: 'Back',
    mirror: true,
    posterior: true,
    shapes: [{ type: 'rect', x: 73, y: 114, w: 16, h: 40, rx: 7, rotate: -6 }],
  },
  { key: 'biceps', label: 'Biceps', mirror: true, shapes: [{ type: 'ellipse', cx: 66, cy: 135, rx: 10, ry: 20, rotate: 8 }] },
  {
    key: 'triceps',
    label: 'Triceps',
    mirror: true,
    posterior: true,
    shapes: [{ type: 'ellipse', cx: 54, cy: 132, rx: 7, ry: 17, rotate: 8 }],
  },
  { key: 'forearms', label: 'Forearms', mirror: true, shapes: [{ type: 'ellipse', cx: 57, cy: 179, rx: 8.5, ry: 23, rotate: 5 }] },
  { key: 'core', label: 'Core', mirror: false, shapes: [{ type: 'rect', x: 96, y: 118, w: 28, h: 50, rx: 11 }] },
  {
    key: 'glutes',
    label: 'Glutes',
    mirror: true,
    posterior: true,
    shapes: [{ type: 'ellipse', cx: 96, cy: 188, rx: 13.5, ry: 11 }],
  },
  { key: 'quads', label: 'Quads', mirror: true, shapes: [{ type: 'ellipse', cx: 96, cy: 239, rx: 15, ry: 38 }] },
  {
    key: 'hamstrings',
    label: 'Hamstrings',
    mirror: true,
    posterior: true,
    shapes: [{ type: 'rect', x: 78, y: 213, w: 11, h: 49, rx: 5.5, rotate: -2 }],
  },
  { key: 'calves', label: 'Calves', mirror: true, shapes: [{ type: 'ellipse', cx: 98, cy: 308, rx: 11, ry: 28 }] },
];

/** Lean, athletic build: narrower shoulders, defined waist, wider hip line. */
const FEMALE_REGIONS: MuscleRegion[] = [
  { key: 'shoulders', label: 'Shoulders', mirror: true, shapes: [{ type: 'ellipse', cx: 82, cy: 100, rx: 13, ry: 13 }] },
  { key: 'chest', label: 'Chest', mirror: true, shapes: [{ type: 'rect', x: 89, y: 90, w: 18, h: 24, rx: 9 }] },
  {
    key: 'back',
    label: 'Back',
    mirror: true,
    posterior: true,
    shapes: [{ type: 'rect', x: 79, y: 116, w: 11, h: 36, rx: 6, rotate: -6 }],
  },
  { key: 'biceps', label: 'Biceps', mirror: true, shapes: [{ type: 'ellipse', cx: 73, cy: 135, rx: 7.5, ry: 17, rotate: 7 }] },
  {
    key: 'triceps',
    label: 'Triceps',
    mirror: true,
    posterior: true,
    shapes: [{ type: 'ellipse', cx: 62, cy: 132, rx: 5, ry: 14, rotate: 7 }],
  },
  { key: 'forearms', label: 'Forearms', mirror: true, shapes: [{ type: 'ellipse', cx: 64, cy: 178, rx: 6.5, ry: 20, rotate: 5 }] },
  { key: 'core', label: 'Core', mirror: false, shapes: [{ type: 'rect', x: 100, y: 120, w: 20, h: 46, rx: 10 }] },
  {
    key: 'glutes',
    label: 'Glutes',
    mirror: true,
    posterior: true,
    shapes: [{ type: 'ellipse', cx: 92, cy: 190, rx: 18, ry: 14 }],
  },
  { key: 'quads', label: 'Quads', mirror: true, shapes: [{ type: 'ellipse', cx: 93, cy: 240, rx: 15.5, ry: 36 }] },
  {
    key: 'hamstrings',
    label: 'Hamstrings',
    mirror: true,
    posterior: true,
    shapes: [{ type: 'rect', x: 76, y: 214, w: 12, h: 48, rx: 6, rotate: -2 }],
  },
  { key: 'calves', label: 'Calves', mirror: true, shapes: [{ type: 'ellipse', cx: 96, cy: 308, rx: 9.5, ry: 26 }] },
];

const MALE_FRAME: Shape[] = [
  { type: 'ellipse', cx: 110, cy: 47, rx: 18.5, ry: 22 },
  { type: 'rect', x: 101, y: 66, w: 18, h: 16, rx: 7 },
  // Shins
  { type: 'rect', x: 94, y: 336, w: 11, h: 44, rx: 5 },
  { type: 'rect', x: 115, y: 336, w: 11, h: 44, rx: 5 },
  // Feet
  { type: 'rect', x: 90, y: 380, w: 18, h: 9, rx: 4 },
  { type: 'rect', x: 112, y: 380, w: 18, h: 9, rx: 4 },
];

const FEMALE_FRAME: Shape[] = [
  { type: 'ellipse', cx: 110, cy: 47, rx: 17, ry: 20.5 },
  { type: 'rect', x: 102.5, y: 65, w: 15, h: 16, rx: 6.5 },
  // Shins
  { type: 'rect', x: 95, y: 336, w: 10, h: 44, rx: 5 },
  { type: 'rect', x: 115, y: 336, w: 10, h: 44, rx: 5 },
  // Feet
  { type: 'rect', x: 91, y: 380, w: 17, h: 9, rx: 4 },
  { type: 'rect', x: 112, y: 380, w: 17, h: 9, rx: 4 },
];

/** Muscle regions for the given build. */
export function getMuscleRegions(gender: Gender): MuscleRegion[] {
  return gender === 'female' ? FEMALE_REGIONS : MALE_REGIONS;
}

/** Static frame parts (not load-mapped): head, neck, shins, feet. */
export function getFrameShapes(gender: Gender): Shape[] {
  return gender === 'female' ? FEMALE_FRAME : MALE_FRAME;
}

/**
 * Conditioning has no single muscle — it renders as an aura ring around the
 * whole figure instead of a body region.
 */
export const AURA_GROUP: MuscleGroupKey = 'conditioning';

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
