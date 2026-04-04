'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { initCanvas, canvasSize } from '@/lib/canvas';

interface SeriesData {
  values: number[];
  color: string;
  label: string;
}

interface RefBand {
  min: number;
  max: number;
  target?: number;
  label?: string;
}

interface TimeSeriesProps {
  series: SeriesData[];
  labels: string[];
  periods?: string[];        // Full period labels for tooltip (e.g., "2024/Q1", "2024/03")
  refBand?: RefBand;
  yUnit?: string;
  yStep?: number;
  labelStep?: number;
  valueDecimals?: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  value: string;
  detail: string;
}

export default function TimeSeries({
  series,
  labels,
  periods,
  refBand,
  yUnit = '%',
  yStep = 2,
  labelStep = 12,
  valueDecimals = 2,
}: TimeSeriesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const geoRef = useRef<{
    padL: number; padR: number; padT: number; padB: number;
    cw: number; n: number;
  } | null>(null);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, title: '', value: '', detail: '',
  });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = containerRef.current;
    if (!canvas || !wrap || !series.length) return;

    const size = canvasSize(wrap);
    if (!size) return;
    const { w, h } = size;
    const ctx = initCanvas(canvas, w, h);

    const padL = 48, padR = 16, padT = 16, padB = 48;
    const cw = w - padL - padR;
    const ch = h - padT - padB;

    let allVals: number[] = [];
    series.forEach((s) => { allVals = allVals.concat(s.values); });
    const yMin = 0;
    const yMax = Math.ceil(Math.max(...allVals) / 2) * 2 + 2;
    const n = series[0].values.length;

    function xPos(i: number) { return padL + (i / (n - 1)) * cw; }
    function yPos(v: number) { return padT + ch - ((v - yMin) / (yMax - yMin)) * ch; }

    ctx.clearRect(0, 0, w, h);

    // Y grid
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = yMin; v <= yMax; v += yStep) {
      const y = yPos(v);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText(v + yUnit, padL - 8, y);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // X labels (rotated -45°)
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px Inter, sans-serif';
    for (let i = 0; i < n; i += labelStep) {
      if (labels[i]) {
        const x = xPos(i);
        const y = h - padB + 8;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-Math.PI / 5); // ~36° angle
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(labels[i], 0, 0);
        ctx.restore();
      }
    }

    // Reference band
    if (refBand) {
      const y1 = yPos(refBand.max);
      const y2 = yPos(refBand.min);
      ctx.fillStyle = 'rgba(34,197,94,0.06)';
      ctx.fillRect(padL, y1, cw, y2 - y1);
      if (refBand.target != null) {
        const yt = yPos(refBand.target);
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(padL, yt);
        ctx.lineTo(w - padR, yt);
        ctx.strokeStyle = 'rgba(34,197,94,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (refBand.label) {
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = 'rgba(34,197,94,0.5)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(refBand.label, padL + 4, y1 - 3);
      }
    }

    // Draw series
    series.forEach((s) => {
      const vals = s.values;
      const color = s.color;

      // Area fill
      ctx.beginPath();
      vals.forEach((v, i) => {
        i === 0 ? ctx.moveTo(xPos(i), yPos(v)) : ctx.lineTo(xPos(i), yPos(v));
      });
      ctx.lineTo(xPos(n - 1), padT + ch);
      ctx.lineTo(padL, padT + ch);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, padT, 0, padT + ch);
      grad.addColorStop(0, color + '25');
      grad.addColorStop(1, color + '02');
      ctx.fillStyle = grad;
      ctx.fill();

      // Line
      ctx.beginPath();
      vals.forEach((v, i) => {
        i === 0 ? ctx.moveTo(xPos(i), yPos(v)) : ctx.lineTo(xPos(i), yPos(v));
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // End dot + label
      const lastVal = vals[n - 1];
      const lx = xPos(n - 1);
      const ly = yPos(lastVal);
      ctx.beginPath();
      ctx.arc(lx, ly, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.font = '600 12px Inter, sans-serif';
      ctx.fillStyle = color;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(lastVal.toFixed(valueDecimals) + yUnit, lx - 8, ly - 6);
    });

    geoRef.current = { padL, padR, padT, padB, cw, n };
  }, [series, labels, refBand, yUnit, yStep, labelStep, valueDecimals]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const geo = geoRef.current;
    if (!canvas || !geo || !series.length) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const idx = Math.round(((mx - geo.padL) / geo.cw) * (geo.n - 1));

    if (idx >= 0 && idx < geo.n) {
      const s = series[0];
      setTooltip({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        title: (periods && periods[idx]) || labels[idx] || '',
        value: s.values[idx].toFixed(valueDecimals) + yUnit,
        detail: s.label,
      });
    }
  }, [series, labels, periods, valueDecimals, yUnit]);

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

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
          className="fixed pointer-events-none bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3 text-[13px] leading-relaxed max-w-[300px] z-[100] shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
          style={{
            left: Math.min(tooltip.x + 12, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 220),
            top: tooltip.y - 70,
          }}
        >
          <div className="font-bold text-sm text-white mb-1">{tooltip.title}</div>
          <div className="text-xl font-bold text-[var(--accent)] mb-[2px] tabular-nums">{tooltip.value}</div>
          <div className="text-xs text-[var(--text-muted)]">{tooltip.detail}</div>
        </div>
      )}
    </div>
  );
}
