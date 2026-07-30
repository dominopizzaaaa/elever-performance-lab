import type { Gender, MuscleGroupKey } from '@/lib/types';

/**
 * Geometry for the AI body avatar.
 *
 * The figure is authored as *outlines*, not assembled from loose primitives: a
 * single continuous silhouette plus one closed shape per muscle group. Each
 * outline is a list of landmark points that a Catmull-Rom spline smooths into
 * organic curves, which is what makes it read as a body rather than a stack of
 * ellipses.
 *
 * Everything is authored for the left half of a 220×460 canvas and mirrored
 * about `MIRROR_AXIS`, so the figure is symmetrical by construction.
 *
 * One geometry source serves both builds: `BUILDS` re-scales horizontal
 * distance from the centre line by height, which is what actually distinguishes
 * a male and female frame (shoulder width, waist taper, hip width).
 *
 * Keys must match the backend's canonical list.
 * @see backend/src/data/seed/muscleGroups.js
 */

export const CANVAS = { width: 220, height: 460 } as const;
export const MIRROR_AXIS = 110;

export type Point = readonly [x: number, y: number];

export interface MuscleRegion {
  key: MuscleGroupKey;
  label: string;
  /** Closed outline on the left half; `mirror` duplicates it on the right. */
  outline: Point[];
  mirror: boolean;
  /**
   * Posterior groups cannot be seen on a front-facing figure, so they render as
   * flank bands along the side of the body. The legend carries the numbers.
   */
  posterior?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Spline                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Catmull-Rom through every point, emitted as cubic Béziers.
 *
 * Landmarks are far easier to reason about than hand-tuned control points: move
 * "elbow" 3px and the curve either side of it follows.
 */
export function splinePath(points: Point[], closed: boolean, tension = 1): string {
  if (points.length < 2) return '';

  const at = (index: number): Point => {
    if (closed) return points[(index + points.length) % points.length];
    return points[Math.max(0, Math.min(points.length - 1, index))];
  };

  const segments = closed ? points.length : points.length - 1;
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;

  for (let i = 0; i < segments; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);

    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;

    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(
      2,
    )} ${p2[1].toFixed(2)}`;
  }

  return closed ? `${d} Z` : d;
}

/** Mirrors a point about the vertical centre line. */
export function mirrorPoint([x, y]: Point): Point {
  return [MIRROR_AXIS * 2 - x, y];
}

/* -------------------------------------------------------------------------- */
/* Build                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Horizontal scale applied to the distance from the centre line, keyed by
 * height down the canvas and interpolated between stops. This is what turns one
 * set of landmarks into two believable frames.
 */
type BuildProfile = readonly (readonly [y: number, xScale: number])[];

const MALE_BUILD: BuildProfile = [[0, 1]];

const FEMALE_BUILD: BuildProfile = [
  [0, 0.93], // narrower skull
  [80, 0.95], // neck
  [100, 0.88], // noticeably narrower shoulders
  [130, 0.9], // chest / upper arm
  [165, 0.92], // tighter waist
  [190, 1.06], // hips flare
  [212, 1.09],
  [245, 1.04], // thigh
  [300, 0.99],
  [460, 0.95], // finer lower leg
];

function buildScaleAt(profile: BuildProfile, y: number): number {
  if (profile.length === 1) return profile[0][1];

  const first = profile[0];
  const last = profile[profile.length - 1];
  if (y <= first[0]) return first[1];
  if (y >= last[0]) return last[1];

  for (let i = 1; i < profile.length; i += 1) {
    const [y1, s1] = profile[i];
    if (y > y1) continue;
    const [y0, s0] = profile[i - 1];
    const t = (y - y0) / (y1 - y0);
    return s0 + (s1 - s0) * t;
  }
  return last[1];
}

function applyBuild(points: Point[], profile: BuildProfile): Point[] {
  return points.map(([x, y]) => {
    const scale = buildScaleAt(profile, y);
    return [MIRROR_AXIS + (x - MIRROR_AXIS) * scale, y] as Point;
  });
}

/* -------------------------------------------------------------------------- */
/* Silhouette                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Left half of the body outline: crown → jaw → shoulder → down the outside of
 * the arm → around the hand → up the inside → armpit → down the flank → hip →
 * outside of the leg → foot → back up the inner leg to the crotch.
 *
 * Both ends sit on the centre line so the mirrored half closes the loop
 * seamlessly.
 */
const OUTLINE_HALF: Point[] = [
  [110, 17], // crown (on axis)
  [100, 19],
  [95, 28],
  [93, 40],
  [95, 50], // cheek
  [99, 59], // cheekbone
  [103, 66], // jaw
  [104, 71], // neck
  [103, 78],
  [95, 82], // trapezius slope
  [84, 86],
  [70, 91], // shoulder cap
  [61, 101], // deltoid, widest point of the frame
  [57, 116], // upper arm
  [55, 140],
  [54, 152], // elbow
  [52, 172], // forearm
  [50, 192], // wrist
  [49, 204], // palm
  [52, 215], // fingertips
  [60, 212],
  [64, 197], // inner wrist
  [66, 176],
  [70, 152], // inner elbow
  [74, 133],
  [78, 119],
  [80, 112], // armpit — a tight notch, so the arms read as separate
  [81, 113],
  [80, 124], // flank
  [80, 142],
  [84, 165], // waist
  [82, 180],
  [78, 192], // hip
  [79, 208],
  [79, 225], // outer thigh
  [78.5, 250],
  [82, 278],
  [85, 295], // knee
  [88, 312],
  [87, 330], // calf belly
  [93, 352],
  [97, 375], // ankle
  [96, 388],
  [92, 398], // heel
  [93, 407],
  [104, 409], // toes
  [106, 400],
  [106, 388], // inner ankle
  [105, 372],
  [104, 345],
  [103, 320],
  [104, 298], // inner knee
  [103, 270],
  [104, 245], // inner thigh
  [105, 228],
  [108, 218],
  [110, 213], // crotch (on axis)
];

/* -------------------------------------------------------------------------- */
/* Muscle groups                                                               */
/* -------------------------------------------------------------------------- */

const REGIONS: MuscleRegion[] = [
  {
    key: 'shoulders',
    label: 'Shoulders',
    mirror: true,
    outline: [
      [73, 90],
      [64, 94],
      [59, 105],
      [62, 120],
      [69, 120],
      [74, 106],
      [76, 96],
    ],
  },
  {
    key: 'chest',
    label: 'Chest',
    mirror: true,
    outline: [
      [106, 95],
      [95, 92],
      [86, 100],
      [85, 114],
      [92, 127],
      [101, 128],
      [106, 117],
    ],
  },
  {
    key: 'back',
    label: 'Back',
    mirror: true,
    posterior: true,
    outline: [
      [82, 118],
      [76, 128],
      [76, 150],
      [83, 166],
      [89, 152],
      [88, 128],
    ],
  },
  {
    key: 'biceps',
    label: 'Biceps',
    mirror: true,
    outline: [
      [72, 126],
      [64, 132],
      [62, 150],
      [67, 161],
      [72, 152],
      [74, 134],
    ],
  },
  {
    key: 'triceps',
    label: 'Triceps',
    mirror: true,
    posterior: true,
    outline: [
      [64, 126],
      [57, 132],
      [56, 150],
      [60, 161],
      [64, 150],
      [66, 134],
    ],
  },
  {
    key: 'forearms',
    label: 'Forearms',
    mirror: true,
    outline: [
      [65, 168],
      [56, 176],
      [52, 193],
      [57, 204],
      [61, 193],
      [65, 176],
    ],
  },
  {
    key: 'core',
    label: 'Core',
    mirror: false,
    outline: [
      [110, 131],
      [98, 135],
      [95, 153],
      [99, 176],
      [110, 187],
      [121, 176],
      [125, 153],
      [122, 135],
    ],
  },
  {
    key: 'glutes',
    label: 'Glutes',
    mirror: true,
    posterior: true,
    outline: [
      [81, 186],
      [76, 196],
      [79, 211],
      [89, 213],
      [92, 198],
      [90, 187],
    ],
  },
  {
    key: 'quads',
    label: 'Quads',
    mirror: true,
    outline: [
      [95, 220],
      [84, 226],
      [80, 251],
      [84, 278],
      [92, 290],
      [100, 284],
      [103, 257],
      [103, 232],
    ],
  },
  {
    key: 'hamstrings',
    label: 'Hamstrings',
    mirror: true,
    posterior: true,
    outline: [
      [82, 230],
      [77, 252],
      [79, 276],
      [85, 289],
      [88, 270],
      [87, 244],
    ],
  },
  {
    key: 'calves',
    label: 'Calves',
    mirror: true,
    outline: [
      [100, 305],
      [91, 315],
      [88, 337],
      [93, 356],
      [99, 344],
      [102, 319],
    ],
  },
];

/**
 * Faint anatomical detailing drawn over the fill: collarbones, sternum, the
 * linea alba and the ab divisions. Purely cosmetic — it is what sells the
 * "scanned model" read at a glance.
 */
const DETAIL_LINES: Point[][] = [
  // Collarbone, left half (mirrored at render time).
  [
    [108, 86],
    [98, 84],
    [87, 87],
  ],
  // Sternum.
  [
    [110, 93],
    [110, 129],
  ],
  // Linea alba.
  [
    [110, 133],
    [110, 183],
  ],
  // Ab divisions.
  [
    [100, 147],
    [110, 145],
    [120, 147],
  ],
  [
    [100, 162],
    [110, 160],
    [120, 162],
  ],
  // Knee line, left half.
  [
    [86, 296],
    [95, 299],
    [104, 296],
  ],
];

/* -------------------------------------------------------------------------- */
/* Public geometry                                                             */
/* -------------------------------------------------------------------------- */

function profileFor(gender: Gender): BuildProfile {
  return gender === 'female' ? FEMALE_BUILD : MALE_BUILD;
}

/** The closed body outline as a single SVG path, built for the given frame. */
export function getSilhouettePath(gender: Gender): string {
  const half = applyBuild(OUTLINE_HALF, profileFor(gender));
  // Skip the two on-axis endpoints when mirroring so the seam has no duplicates.
  const other = half.slice(1, -1).reverse().map(mirrorPoint);
  return splinePath([...half, ...other], true);
}

/** Muscle groups as SVG paths — one entry per group, already mirrored. */
export function getMuscleRegionPaths(
  gender: Gender,
): { key: MuscleGroupKey; label: string; paths: string[]; posterior: boolean }[] {
  const profile = profileFor(gender);

  return REGIONS.map((region) => {
    const left = applyBuild(region.outline, profile);
    const paths = [splinePath(left, true)];
    if (region.mirror) paths.push(splinePath(left.map(mirrorPoint), true));

    return { key: region.key, label: region.label, paths, posterior: region.posterior ?? false };
  });
}

/** Cosmetic detail strokes, already mirrored where they are one-sided. */
export function getDetailPaths(gender: Gender): string[] {
  const profile = profileFor(gender);

  return DETAIL_LINES.flatMap((line) => {
    const points = applyBuild(line, profile);
    const path = splinePath(points, false);
    // A line that never crosses the centre belongs on both sides.
    const isOneSided = points.every(([x]) => x < MIRROR_AXIS - 0.5);
    return isOneSided ? [path, splinePath(points.map(mirrorPoint), false)] : [path];
  });
}

/** Every group the figure can light up, in a stable order for the legend. */
export function getMuscleGroupLabels(): { key: MuscleGroupKey; label: string; posterior: boolean }[] {
  return REGIONS.map((region) => ({
    key: region.key,
    label: region.label,
    posterior: region.posterior ?? false,
  }));
}

/**
 * Conditioning has no single muscle — it renders as an aura ring around the
 * whole figure instead of a body region.
 */
export const AURA_GROUP: MuscleGroupKey = 'conditioning';
