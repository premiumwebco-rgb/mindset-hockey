/**
 * Dependency-free trend chart.
 *
 * Rendered as inline SVG on the server — no charting library, no client JS,
 * no layout shift. Enough for the handful of series a player actually tracks.
 */
export default function TrendChart({
  points,
  unit = '',
  height = 180,
}: {
  points: { x: string; y: number }[];
  unit?: string;
  height?: number;
}) {
  if (points.length < 2) {
    return (
      <p className="text-[14px] text-silver-dim">
        Not enough data for a trend yet — one more entry and this becomes a chart.
      </p>
    );
  }

  const W = 640;
  const H = height;
  const PAD = { top: 14, right: 14, bottom: 26, left: 40 };

  const ys = points.map((p) => p.y);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  // Pad the range so a flat line isn't glued to the axis.
  const span = max - min || Math.max(1, max * 0.1);
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;

  const px = (i: number) =>
    PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right);
  const py = (v: number) =>
    PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(i)},${py(p.y)}`).join(' ');
  const area =
    `${line} L${px(points.length - 1)},${H - PAD.bottom} L${px(0)},${H - PAD.bottom} Z`;

  const improving = points[points.length - 1].y >= points[0].y;
  const stroke = improving ? '#3FA9FF' : '#FFB03C';

  const ticks = [lo, (lo + hi) / 2, hi];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Trend chart with ${points.length} points, from ${points[0].y} to ${points[points.length - 1].y} ${unit}`}
    >
      <defs>
        <linearGradient id={`fill-${stroke.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((t, i) => (
        <g key={i}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={py(t)}
            y2={py(t)}
            stroke="rgba(255,255,255,.07)"
            strokeWidth="1"
          />
          <text x={PAD.left - 8} y={py(t) + 4} textAnchor="end" fontSize="10" fill="#8895A7">
            {Math.round(t * 10) / 10}
          </text>
        </g>
      ))}

      <path d={area} fill={`url(#fill-${stroke.slice(1)})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <circle key={i} cx={px(i)} cy={py(p.y)} r={i === points.length - 1 ? 4.5 : 3} fill={stroke} />
      ))}

      <text x={PAD.left} y={H - 8} fontSize="10" fill="#8895A7">
        {new Date(points[0].x).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
      </text>
      <text x={W - PAD.right} y={H - 8} fontSize="10" fill="#8895A7" textAnchor="end">
        {new Date(points[points.length - 1].x).toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
        })}
      </text>
    </svg>
  );
}
