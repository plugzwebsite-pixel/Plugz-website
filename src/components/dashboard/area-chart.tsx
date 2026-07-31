/** Dependency-free SVG area chart with the brand gradient fill. */
export function AreaChart({
  data,
  height = 180,
  className,
}: {
  data: number[];
  height?: number;
  className?: string;
}) {
  const width = 640;
  const pad = 8;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = (width - pad * 2) / (data.length - 1);

  const points = data.map((d, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (d - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${height} L${points[0][0].toFixed(1)},${height} Z`;

  const id = "area-grad";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      style={{ width: "100%", height }}
      role="img"
      aria-label="Performance over the last 30 days"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff2d9b" />
          <stop offset="50%" stopColor="#a438ff" />
          <stop offset="100%" stopColor="#ff8a2b" />
        </linearGradient>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a438ff" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#a438ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id}-fill)`} />
      <path
        d={line}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === points.length - 1 ? 4 : 0} fill="#ff8a2b" />
      ))}
    </svg>
  );
}
