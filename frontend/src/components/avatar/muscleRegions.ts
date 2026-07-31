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
 * The figure has two faces. Groups on the back of the body — lats, triceps,
 * glutes, hamstrings — are drawn on the back view where they actually are,
 * rather than hinted at with flank bands on a front-facing figure.
 *
 * Keys must match the backend's canonical list.
 * @see backend/src/data/seed/muscleGroups.js
 */

export const CANVAS = { width: 220, height: 460 } as const;
export const MIRROR_AXIS = 110;

export type Point = readonly [x: number, y: number];

/** Which side of the body the viewer is looking at. */
export type BodyView = 'front' | 'back';

export interface MuscleRegion {
  key: MuscleGroupKey;
  label: string;
  /** Closed outline on the left half; `mirror` duplicates it on the right. */
  outline: Point[];
  mirror: boolean;
}

export interface ResolvedRegion {
  key: MuscleGroupKey;
  label: string;
  paths: string[];
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
 * seamlessly. A standing figure has the same outline from either side, so both
 * views share it — the detail strokes are what say which way it is facing.
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
/* Muscle groups — front                                                       */
/* -------------------------------------------------------------------------- */

const FRONT_REGIONS: MuscleRegion[] = [
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
    key: 'biceps',
    label: 'Biceps',
    mirror: true,
    outline: [
      [74, 126],
      [64, 131],
      [61, 150],
      [67, 162],
      [73, 152],
      [76, 134],
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

/* -------------------------------------------------------------------------- */
/* Muscle groups — back                                                        */
/* -------------------------------------------------------------------------- */

const BACK_REGIONS: MuscleRegion[] = [
  {
    key: 'shoulders',
    label: 'Shoulders',
    mirror: true,
    outline: [
      [76, 88],
      [66, 93],
      [60, 105],
      [63, 120],
      [70, 119],
      [75, 105],
      [79, 94],
    ],
  },
  {
    // Traps and lats read as one mass from behind — the whole upper back.
    key: 'back',
    label: 'Back',
    mirror: true,
    outline: [
      [108, 82],
      [96, 85],
      [85, 93],
      [81, 110],
      [80, 132],
      [84, 154],
      [92, 170],
      [108, 173],
      [108, 130],
    ],
  },
  {
    key: 'triceps',
    label: 'Triceps',
    mirror: true,
    outline: [
      [77, 122],
      [66, 127],
      [61, 146],
      [66, 163],
      [74, 154],
      [78, 134],
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
    key: 'glutes',
    label: 'Glutes',
    mirror: true,
    outline: [
      [108, 182],
      [92, 181],
      [81, 189],
      [79, 204],
      [86, 216],
      [100, 217],
      [108, 207],
    ],
  },
  {
    key: 'hamstrings',
    label: 'Hamstrings',
    mirror: true,
    outline: [
      [104, 222],
      [90, 224],
      [82, 242],
      [81, 266],
      [88, 287],
      [99, 288],
      [104, 260],
    ],
  },
  {
    key: 'calves',
    label: 'Calves',
    mirror: true,
    outline: [
      [102, 303],
      [91, 312],
      [87, 336],
      [93, 358],
      [100, 345],
      [103, 318],
    ],
  },
];

const REGIONS_BY_VIEW: Record<BodyView, MuscleRegion[]> = {
  front: FRONT_REGIONS,
  back: BACK_REGIONS,
};

/* -------------------------------------------------------------------------- */
/* Detailing                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Faint anatomical detailing drawn over the fill. Purely cosmetic — but it is
 * what tells a member at a glance whether they are looking at the front of the
 * figure or the back of it.
 */
const FRONT_DETAIL_LINES: Point[][] = [
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

const BACK_DETAIL_LINES: Point[][] = [
  // Spine, neck to sacrum — the single clearest "this is the back" cue.
  [
    [110, 84],
    [110, 130],
    [110, 178],
  ],
  // Shoulder blades, left half.
  [
    [104, 96],
    [93, 100],
    [88, 114],
    [95, 124],
  ],
  // Trapezius sweep from the neck out to the shoulder.
  [
    [106, 83],
    [95, 89],
    [84, 96],
  ],
  // Lower-back dimples, left half.
  [
    [101, 178],
    [98, 182],
  ],
  // Glute fold, left half.
  [
    [84, 214],
    [95, 218],
    [106, 214],
  ],
  // Hamstring / knee crease, left half.
  [
    [86, 294],
    [95, 297],
    [104, 294],
  ],
];

const DETAIL_LINES_BY_VIEW: Record<BodyView, Point[][]> = {
  front: FRONT_DETAIL_LINES,
  back: BACK_DETAIL_LINES,
};

/* -------------------------------------------------------------------------- */
/* Heat scale                                                                  */
/* -------------------------------------------------------------------------- */

type Rgb = readonly [number, number, number];

/**
 * Untrained → hammered, as a colour ramp.
 *
 * Cold blue means a group has had nothing this fortnight; the more work it has
 * absorbed the hotter and deeper red it runs. Opacity climbs alongside the hue
 * so the deepest red still reads as the loudest thing on the figure rather than
 * sinking into the dark background.
 *
 * The ramp climbs through indigo and purple rather than the obvious blue →
 * orange → red, because a straight blue-to-orange interpolation passes through
 * grey at the midpoint and a half-trained group ends up looking like a dead
 * one. Purple keeps every step saturated.
 */
const HEAT_STOPS: readonly (readonly [stop: number, color: Rgb])[] = [
  [0.0, [46, 96, 208]], // cold blue — untouched
  [0.2, [98, 78, 210]], // indigo
  [0.42, [158, 66, 188]], // purple
  [0.62, [208, 64, 132]], // pink-red
  [0.8, [230, 56, 64]], // red
  [1.0, [146, 12, 26]], // deepest red — hammered
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * The ramp colour at `intensity` (0–1), as a space-separated `r g b` triplet —
 * the form that lets callers append an alpha: `rgb(${heatColor(x)} / 0.6)`.
 */
export function heatColor(intensity: number): string {
  const value = Math.max(0, Math.min(1, intensity));

  for (let i = 1; i < HEAT_STOPS.length; i += 1) {
    const [stop, color] = HEAT_STOPS[i];
    if (value > stop) continue;
    const [prevStop, prevColor] = HEAT_STOPS[i - 1];
    const t = stop === prevStop ? 0 : (value - prevStop) / (stop - prevStop);
    return [0, 1, 2].map((c) => Math.round(lerp(prevColor[c], color[c], t))).join(' ');
  }

  return HEAT_STOPS[HEAT_STOPS.length - 1][1].join(' ');
}

/** Evenly spaced ramp samples, for the legend's colour scale. */
export function heatScaleSamples(count = 12): string[] {
  return Array.from({ length: count }, (_, index) => heatColor(index / (count - 1)));
}

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

/** Muscle groups visible from `view`, as SVG paths, already mirrored. */
export function getMuscleRegionPaths(gender: Gender, view: BodyView): ResolvedRegion[] {
  const profile = profileFor(gender);

  return REGIONS_BY_VIEW[view].map((region) => {
    const left = applyBuild(region.outline, profile);
    const paths = [splinePath(left, true)];
    if (region.mirror) paths.push(splinePath(left.map(mirrorPoint), true));

    return { key: region.key, label: region.label, paths };
  });
}

/** Cosmetic detail strokes for `view`, already mirrored where they are one-sided. */
export function getDetailPaths(gender: Gender, view: BodyView): string[] {
  const profile = profileFor(gender);

  return DETAIL_LINES_BY_VIEW[view].flatMap((line) => {
    const points = applyBuild(line, profile);
    const path = splinePath(points, false);
    // A line that never crosses the centre belongs on both sides.
    const isOneSided = points.every(([x]) => x < MIRROR_AXIS - 0.5);
    return isOneSided ? [path, splinePath(points.map(mirrorPoint), false)] : [path];
  });
}

/** Every group the figure can light up, with the view it is visible from. */
export function getMuscleGroupLabels(): { key: MuscleGroupKey; label: string; view: BodyView }[] {
  const seen = new Map<MuscleGroupKey, { key: MuscleGroupKey; label: string; view: BodyView }>();

  for (const view of ['front', 'back'] as const) {
    for (const region of REGIONS_BY_VIEW[view]) {
      // A group on both faces (shoulders, forearms, calves) keeps the first —
      // the front — so "flip to see it" is only ever said about a real back group.
      if (!seen.has(region.key)) seen.set(region.key, { key: region.key, label: region.label, view });
    }
  }

  return [...seen.values()];
}

/**
 * Conditioning has no single muscle — it renders as an aura ring around the
 * whole figure instead of a body region.
 */
export const AURA_GROUP: MuscleGroupKey = 'conditioning';
