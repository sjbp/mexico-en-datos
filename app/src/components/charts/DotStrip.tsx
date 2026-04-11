'use client';

import { seriesColor } from '@/lib/colors';

interface DotStripPoint {
  label: string;
  value: number;
}

interface DotStripProps {
  points: DotStripPoint[];
  unit?: string;
  color?: string;
}

export default function DotStrip({ points, unit = '', color }: DotStripProps) {
  if (!points || points.length < 3) return null;

  const dotColor = color || seriesColor(0);
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = range * 0.08;
  const lo = min - pad;
  const hi = max + pad;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  const W = 400;
  const H = 64;
  const padL = 8;
  const padR = 8;
  const cw = W - padL - padR;
  const cy = 30; // center y for dots

  const xPos = (v: number) => padL + ((v - lo) / (hi - lo)) * cw;

  // Sort for outlier detection
  const sorted = [...points].sort((a, b) => a.value - b.value);
  const outlierLabels = new Set([
    sorted[0]?.label,
    sorted[1]?.label,
    sorted[sorted.length - 1]?.label,
    sorted[sorted.length - 2]?.label,
  ]);

  // Y-jitter for overlapping points (within 3% of range)
  const threshold = range * 0.03;
  const jitters: number[] = new Array(points.length).fill(0);
  const sortedByValue = points.map((p, i) => ({ ...p, i })).sort((a, b) => a.value - b.value);
  for (let j = 1; j < sortedByValue.length; j++) {
    if (Math.abs(sortedByValue[j].value - sortedByValue[j - 1].value) < threshold) {
      jitters[sortedByValue[j].i] = jitters[sortedByValue[j - 1].i] === 0 ? 6 :
        jitters[sortedByValue[j - 1].i] > 0 ? -6 : 6;
    }
  }

  const fmtVal = (v: number) => {
    if (Math.abs(v) >= 1000) return v.toFixed(0);
    if (Math.abs(v) >= 10) return v.toFixed(1);
    return v.toFixed(2);
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 64 }}>
      {/* Axis line */}
      <line x1={padL} y1={cy} x2={padL + cw} y2={cy} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

      {/* Min/max ticks */}
      <text x={xPos(min)} y={cy + 18} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={9} fontFamily="Inter, sans-serif">
        {fmtVal(min)}{unit}
      </text>
      <text x={xPos(max)} y={cy + 18} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize={9} fontFamily="Inter, sans-serif">
        {fmtVal(max)}{unit}
      </text>

      {/* Mean line */}
      <line
        x1={xPos(mean)} y1={cy - 16} x2={xPos(mean)} y2={cy + 10}
        stroke="rgba(255,255,255,0.35)" strokeWidth={1} strokeDasharray="3,3"
      />
      <text x={xPos(mean)} y={cy - 18} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={9} fontFamily="Inter, sans-serif">
        x̄ {fmtVal(mean)}
      </text>

      {/* Dots */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={xPos(p.value)}
          cy={cy + jitters[i]}
          r={4}
          fill={dotColor}
          opacity={0.75}
        >
          <title>{p.label}: {fmtVal(p.value)}{unit}</title>
        </circle>
      ))}

      {/* Outlier labels (top/bottom 2) */}
      {points.filter((p) => outlierLabels.has(p.label)).map((p, i) => {
        const px = xPos(p.value);
        const isRight = px > padL + cw * 0.7;
        const isLeft = px < padL + cw * 0.3;
        return (
          <text
            key={`lbl-${i}`}
            x={px}
            y={cy + 28}
            textAnchor={isRight ? 'end' : isLeft ? 'start' : 'middle'}
            fill="rgba(255,255,255,0.4)"
            fontSize={8}
            fontFamily="Inter, sans-serif"
          >
            {p.label}
          </text>
        );
      })}
    </svg>
  );
}
