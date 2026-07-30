/**
 * Minimal charting maths. Every chart in the kiosk is hand-rolled SVG — no
 * charting library — so the futuristic styling is fully under our control and
 * the bundle stays small.
 *
 * Conventions enforced across all charts (see the project's dataviz notes):
 *  · single series per chart; multiple exercises become small multiples
 *  · bars ≤ 24px thick, 4px rounded data-end, square at the baseline
 *  · 2px surface-coloured gap between adjacent bars, 2px ring on markers
 *  · hairline solid gridlines, never dashed
 *  · axis/label text uses ink tokens, never the series colour
 */

export const SURFACE = '#060a14';

/** Rounds a maximum up to a clean axis bound (1/2/2.5/5 × 10^n). */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 2.5 ? 2.5 : normalised <= 5 ? 5 : 10;
  return step * magnitude;
}

/** Evenly spaced tick values from 0 to `max` inclusive. */
export function ticks(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, index) => (max / count) * index);
}

/** Linear scale factory. */
export function scaleLinear(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
}

export interface Point {
  x: number;
  y: number;
}

/** Polyline path through points. */
export function linePath(points: Point[]): string {
  if (points.length === 0) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
}

/**
 * Closed area path under a line, used for the ~10% opacity wash.
 * @param baselineY pixel y of the chart baseline
 */
export function areaPath(points: Point[], baselineY: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L${last.x} ${baselineY} L${first.x} ${baselineY} Z`;
}

/**
 * Rounded-top bar path: 4px radius on the data-end, square corners on the
 * baseline. Falls back to a plain rect when the bar is shorter than the radius.
 */
export function barPath(x: number, y: number, width: number, height: number, radius = 4): string {
  const r = Math.min(radius, width / 2, Math.max(height, 0));
  if (height <= 0) return '';
  if (r <= 0.5) return `M${x} ${y} h${width} v${height} h${-width} Z`;
  return [
    `M${x} ${y + height}`,
    `V${y + r}`,
    `Q${x} ${y} ${x + r} ${y}`,
    `H${x + width - r}`,
    `Q${x + width} ${y} ${x + width} ${y + r}`,
    `V${y + height}`,
    'Z',
  ].join(' ');
}

/** Index of the datum nearest a pointer x position. */
export function nearestIndex(positions: number[], x: number): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  positions.forEach((position, index) => {
    const distance = Math.abs(position - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}
