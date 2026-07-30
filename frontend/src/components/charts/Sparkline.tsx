import { areaPath, linePath, scaleLinear, SURFACE, type Point } from './chartUtils';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  /** Accessible description — the sparkline itself carries no axes. */
  label: string;
}

/**
 * 12-point trend line for stat tiles and small multiples. No axes, no labels:
 * it shows shape only, and the tile's value carries the number.
 */
export function Sparkline({ values, width = 90, height = 26, className, label }: SparklineProps) {
  if (values.length < 2) {
    return <div className={className} style={{ width, height }} aria-hidden />;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = scaleLinear([0, values.length - 1], [2, width - 2]);
  const y = scaleLinear([min, max === min ? min + 1 : max], [height - 3, 3]);
  const points: Point[] = values.map((value, index) => ({ x: x(index), y: y(value) }));
  const lastPoint = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label={label}
    >
      <path d={areaPath(points, height)} fill="rgb(var(--accent-rgb))" fillOpacity={0.1} />
      <path
        d={linePath(points)}
        fill="none"
        stroke="rgb(var(--accent-rgb))"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.85}
      />
      <circle cx={lastPoint.x} cy={lastPoint.y} r={2.5} fill="rgb(var(--accent-rgb))" stroke={SURFACE} strokeWidth={1.5} />
    </svg>
  );
}
