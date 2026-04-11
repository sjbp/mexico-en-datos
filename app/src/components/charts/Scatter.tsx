'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { initCanvas, canvasSize } from '@/lib/canvas';
import { seriesColor } from '@/lib/colors';

interface ScatterPoint {
  label: string;
  x: number;
  y: number;
  color?: string;
}

interface ScatterProps {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
  xUnit?: string;
  yUnit?: string;
  xDecimals?: number;
  yDecimals?: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  label: string;
  xVal: string;
  yVal: string;
}

export default function Scatter({
  points,
  xLabel,
  yLabel,
  xUnit = '',
  yUnit = '',
  xDecimals = 1,
  yDecimals = 0,
}: ScatterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geoRef = useRef<{
    padL: number; padR: number; padT: number; padB: number;
    xMin: number; xMax: number; yMin: number; yMax: number;
    cw: number; ch: number;
  } | null>(null);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, label: '', xVal: '', yVal: '',
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = containerRef.current;
    if (!canvas || !wrap || points.length < 2) return;

    const size = canvasSize(wrap, 0.65, 280);
    if (!size) return;
    const { w, h } = size;
    const ctx = initCanvas(canvas, w, h);

    const padL = 52, padR = 16, padT = 12, padB = 44;
    const cw = w - padL - padR;
    const ch = h - padT - padB;

    // Auto-range with 10% padding
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const xRange = Math.max(...xs) - Math.min(...xs) || 1;
    const yRange = Math.max(...ys) - Math.min(...ys) || 1;
    const xMin = Math.min(...xs) - xRange * 0.1;
    const xMax = Math.max(...xs) + xRange * 0.1;
    const yMin = Math.min(...ys) - yRange * 0.1;
    const yMax = Math.max(...ys) + yRange * 0.1;

    const xPos = (v: number) => padL + ((v - xMin) / (xMax - xMin)) * cw;
    const yPos = (v: number) => padT + ch - ((v - yMin) / (yMax - yMin)) * ch;

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    const xTicks = 4, yTicks = 4;
    for (let i = 0; i <= xTicks; i++) {
      const v = xMin + (i / xTicks) * (xMax - xMin);
      const px = xPos(v);
      ctx.beginPath(); ctx.moveTo(px, padT); ctx.lineTo(px, padT + ch); ctx.stroke();
    }
    for (let i = 0; i <= yTicks; i++) {
      const v = yMin + (i / yTicks) * (yMax - yMin);
      const py = yPos(v);
      ctx.beginPath(); ctx.moveTo(padL, py); ctx.lineTo(padL + cw, py); ctx.stroke();
    }

    // Axis labels (tick values)
    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';
    for (let i = 0; i <= xTicks; i++) {
      const v = xMin + (i / xTicks) * (xMax - xMin);
      ctx.fillText(v.toFixed(xDecimals), xPos(v), padT + ch + 4);
    }
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (let i = 0; i <= yTicks; i++) {
      const v = yMin + (i / yTicks) * (yMax - yMin);
      ctx.fillText(v.toFixed(yDecimals), padL - 6, yPos(v));
    }

    // Axis titles
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(xLabel, padL + cw / 2, h - 14);

    ctx.save();
    ctx.translate(12, padT + ch / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(yLabel, 0, 0);
    ctx.restore();

    // Points
    const defaultColor = seriesColor(0);
    points.forEach((p) => {
      const px = xPos(p.x);
      const py = yPos(p.y);
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = p.color || defaultColor;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // Label the 2 outliers (farthest from centroid in normalized space)
    const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
    const dists = points.map((p) => {
      const dx = (p.x - cx) / xRange;
      const dy = (p.y - cy) / yRange;
      return dx * dx + dy * dy;
    });
    const outlierIdxs = dists
      .map((d, i) => ({ d, i }))
      .sort((a, b) => b.d - a.d)
      .slice(0, 2)
      .map((o) => o.i);

    ctx.font = '10px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textBaseline = 'bottom';
    outlierIdxs.forEach((idx) => {
      const p = points[idx];
      const px = xPos(p.x);
      const py = yPos(p.y);
      ctx.textAlign = px > padL + cw / 2 ? 'right' : 'left';
      const offsetX = px > padL + cw / 2 ? -8 : 8;
      ctx.fillText(p.label, px + offsetX, py - 6);
    });

    geoRef.current = { padL, padR, padT, padB, xMin, xMax, yMin, yMax, cw, ch };
  }, [points, xLabel, yLabel, xUnit, yUnit, xDecimals, yDecimals]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const geo = geoRef.current;
    if (!canvas || !geo || points.length < 2) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Find nearest point
    let minDist = Infinity;
    let nearest = -1;
    points.forEach((p, i) => {
      const px = geo.padL + ((p.x - geo.xMin) / (geo.xMax - geo.xMin)) * geo.cw;
      const py = geo.padT + geo.ch - ((p.y - geo.yMin) / (geo.yMax - geo.yMin)) * geo.ch;
      const dist = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
      if (dist < minDist) { minDist = dist; nearest = i; }
    });

    if (nearest >= 0 && minDist < 30) {
      const p = points[nearest];
      setTooltip({
        visible: true,
        x: mx,
        y: my,
        label: p.label,
        xVal: p.x.toFixed(xDecimals) + xUnit,
        yVal: p.y.toFixed(yDecimals) + yUnit,
      });
    } else {
      setTooltip((prev) => ({ ...prev, visible: false }));
    }
  }, [points, xDecimals, yDecimals, xUnit, yUnit]);

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  if (!points || points.length < 2) return null;

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        className="block w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      {tooltip.visible && (
        <div
          className="absolute pointer-events-none bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] leading-relaxed max-w-[240px] z-[100] shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 60,
          }}
        >
          <div className="font-semibold text-[var(--text-primary)]">{tooltip.label}</div>
          <div className="text-[var(--text-secondary)]">{xLabel}: {tooltip.xVal}</div>
          <div className="text-[var(--text-secondary)]">{yLabel}: {tooltip.yVal}</div>
        </div>
      )}
    </div>
  );
}
