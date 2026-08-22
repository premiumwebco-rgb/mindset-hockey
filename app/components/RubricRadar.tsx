import { RUBRIC } from '@/lib/types';

/**
 * Server-rendered SVG radar for the shot rubric.
 * Axis count follows RUBRIC.length, so adding a point does not break the chart.
 */
export default function RubricRadar({
  scores,
  size = 300,
}: {
  scores: { rubricPointId: number; score: number }[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 46;
  const n = RUBRIC.length;

  const byId = new Map(scores.map((s) => [s.rubricPointId, s.score]));

  const point = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rad = (value / 10) * r;
    return [cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad] as const;
  };

  const rings = [2, 4, 6, 8, 10];
  const dataPath =
    RUBRIC.map((p, i) => {
      const [x, y] = point(i, byId.get(p.id) ?? 0);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ') + ' Z';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Shot mechanics radar"
      // Fixed intrinsic width/height (needed for the viewBox math above) would
      // otherwise force this SVG past a narrow card on mobile — max-width:100% +
      // height:auto lets it shrink to its container while the viewBox keeps the
      // radar geometry correctly proportioned.
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={RUBRIC.map((_, i) => point(i, ring).join(',')).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,.07)"
          strokeWidth="1"
        />
      ))}

      {RUBRIC.map((_, i) => {
        const [x, y] = point(i, 10);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.06)" strokeWidth="1" />;
      })}

      <path d={dataPath} fill="rgba(10,132,255,.24)" stroke="#0A84FF" strokeWidth="2" strokeLinejoin="round" />

      {RUBRIC.map((p, i) => {
        const [x, y] = point(i, byId.get(p.id) ?? 0);
        return <circle key={p.id} cx={x} cy={y} r="3.5" fill="#3FA9FF" />;
      })}

      {RUBRIC.map((p, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (r + 26);
        const ly = cy + Math.sin(angle) * (r + 26);
        const anchor = Math.abs(Math.cos(angle)) < 0.3 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
        return (
          <text
            key={p.id}
            x={lx}
            y={ly}
            fill="#8895A7"
            fontSize="9.5"
            fontFamily="Inter, sans-serif"
            fontWeight="600"
            textAnchor={anchor}
            dominantBaseline="middle"
          >
            {p.label.split(' ')[0].toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}
