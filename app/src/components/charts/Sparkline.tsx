'use client';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}

export default function Sparkline({ values, width = 160, height = 32, color = '#FF9F43' }: SparklineProps) {
  if (!values || values.length < 2) return null;

  const pad = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(' ');

  // Area fill: polyline + close to bottom
  const lastX = (values.length - 1) / (values.length - 1) * width;
  const areaPath = `M${points[0]} ${points.slice(1).map(p => `L${p}`).join(' ')} L${lastX},${height} L0,${height} Z`;

  // End dot position
  const lastVal = values[values.length - 1];
  const lastY = pad + (1 - (lastVal - min) / range) * (height - pad * 2);

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <path d={areaPath} fill={color} opacity={0.08} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        opacity={0.6}
      />
      <circle cx={width} cy={lastY} r={2.5} fill={color} />
    </svg>
  );
}
