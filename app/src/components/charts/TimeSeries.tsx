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
  yMin?: number;
  labelStep?: number;
  valueDecimals?: number;
  dualAxis?: boolean;        // When true, series[1] uses right Y-axis (independent scale)
  rightYUnit?: string;       // Unit label for right Y-axis
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  value: string;
  detail: string;
  value2?: string;
  detail2?: string;
}

function niceStep(range: number): number {
  if (range <= 0) return 1;
  const rough = range / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  if (norm <= 1) return mag;
  if (norm <= 2) return 2 * mag;
  if (norm <= 5) return 5 * mag;
  return 10 * mag;
}

export default function TimeSeries({
  series,
  labels,
  periods,
  refBand,
  yUnit = '%',
  yStep = 2,
  yMin: yMinProp,
  labelStep = 12,
  valueDecimals = 2,
  dualAxis = false,
  rightYUnit,
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

    const useDual = dualAxis && series.length === 2;
    const padL = useDual ? 56 : 48, padR = useDual ? 64 : 16, padT = 16, padB = 48;
    const cw = w - padL - padR;
    const ch = h - padT - padB;
    const n = series[0].values.length;

    function xPos(i: number) { return padL + (i / (n - 1)) * cw; }

    ctx.clearRect(0, 0, w, h);

    if (useDual) {
      // --- Dual axis mode ---
      const vals0 = series[0].values;
      const vals1 = series[1].values;

      const rawMax0 = Math.max(...vals0.filter(isFinite));
      const rawMax1 = Math.max(...vals1.filter(isFinite));
      const step0 = niceStep(rawMax0);
      const step1 = niceStep(rawMax1);
      const yMax0 = Math.ceil(rawMax0 / step0) * step0 + step0;
      const yMax1 = Math.ceil(rawMax1 / step1) * step1 + step1;
      const yMin0 = yMinProp ?? 0;
      const yMin1 = yMinProp ?? 0;

      function yPos0(v: number) { return padT + ch - ((v - yMin0) / (yMax0 - yMin0)) * ch; }
      function yPos1(v: number) { return padT + ch - ((v - yMin1) / (yMax1 - yMin1)) * ch; }

      const unit0 = yUnit;
      const unit1 = rightYUnit ?? yUnit;

      // Left Y-axis ticks (series[0])
      ctx.font = '11px Inter, sans-serif';
      ctx.textBaseline = 'middle';
      for (let v = yMin0; v <= yMax0 + step0 * 0.01; v += step0) {
        const y = yPos0(v);
        if (y < padT - 4 || y > padT + ch + 4) continue;
        ctx.fillStyle = series[0].color + 'cc';
        ctx.textAlign = 'right';
        ctx.fillText(v.toLocaleString('es-MX') + unit0, padL - 8, y);
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(w - padR, y);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Right Y-axis ticks (series[1])
      for (let v = yMin1; v <= yMax1 + step1 * 0.01; v += step1) {
        const y = yPos1(v);
        if (y < padT - 4 || y > padT + ch + 4) continue;
        ctx.fillStyle = series[1].color + 'cc';
        ctx.textAlign = 'left';
        ctx.fillText(v.toLocaleString('es-MX') + unit1, w - padR + 8, y);
      }

      // X labels
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px Inter, sans-serif';
      for (let i = 0; i < n; i += labelStep) {
        if (labels[i]) {
          const x = xPos(i);
          const y = h - padB + 8;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(-Math.PI / 5);
          ctx.textAlign = 'right';
          ctx.textBaseline = 'top';
          ctx.fillText(labels[i], 0, 0);
          ctx.restore();
        }
      }

      // Draw series[0] with left axis
      const drawSeries = (vals: number[], color: string, yPosFn: (v: number) => number, unitLabel: string, labelSide: 'left' | 'right') => {
        ctx.beginPath();
        vals.forEach((v, i) => {
          i === 0 ? ctx.moveTo(xPos(i), yPosFn(v)) : ctx.lineTo(xPos(i), yPosFn(v));
        });
        ctx.lineTo(xPos(n - 1), padT + ch);
        ctx.lineTo(padL, padT + ch);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, padT, 0, padT + ch);
        grad.addColorStop(0, color + '20');
        grad.addColorStop(1, color + '02');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        vals.forEach((v, i) => {
          i === 0 ? ctx.moveTo(xPos(i), yPosFn(v)) : ctx.lineTo(xPos(i), yPosFn(v));
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();

        const lastVal = vals[n - 1];
        const lx = xPos(n - 1);
        const ly = yPosFn(lastVal);
        ctx.beginPath();
        ctx.arc(lx, ly, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.font = '600 11px Inter, sans-serif';
        ctx.fillStyle = color;
        ctx.textAlign = labelSide === 'left' ? 'right' : 'left';
        ctx.textBaseline = 'bottom';
        const offset = labelSide === 'left' ? -8 : 8;
        ctx.fillText(lastVal.toFixed(valueDecimals) + unitLabel, lx + offset, ly - 6);
      };

      drawSeries(vals0, series[0].color, yPos0, unit0, 'left');
      drawSeries(vals1, series[1].color, yPos1, unit1, 'right');

    } else {
      // --- Single axis mode (original) ---
      let allVals: number[] = [];
      series.forEach((s) => { allVals = allVals.concat(s.values); });
      const yMin = yMinProp ?? 0;
      const yMax = Math.ceil(Math.max(...allVals) / 2) * 2 + 2;

      function yPos(v: number) { return padT + ch - ((v - yMin) / (yMax - yMin)) * ch; }

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

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px Inter, sans-serif';
      for (let i = 0; i < n; i += labelStep) {
        if (labels[i]) {
          const x = xPos(i);
          const y = h - padB + 8;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(-Math.PI / 5);
          ctx.textAlign = 'right';
          ctx.textBaseline = 'top';
          ctx.fillText(labels[i], 0, 0);
          ctx.restore();
        }
      }

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

      series.forEach((s) => {
        const vals = s.values;
        const color = s.color;

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

        ctx.beginPath();
        vals.forEach((v, i) => {
          i === 0 ? ctx.moveTo(xPos(i), yPos(v)) : ctx.lineTo(xPos(i), yPos(v));
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();

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
    }

    geoRef.current = { padL, padR, padT, padB, cw, n };
  }, [series, labels, refBand, yUnit, rightYUnit, yStep, labelStep, valueDecimals, dualAxis, yMinProp]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  const buildTooltip = useCallback((mx: number, my: number, idx: number) => {
    const useDual = dualAxis && series.length === 2;
    const s0 = series[0];
    const title = (periods && periods[idx]) || labels[idx] || '';
    if (useDual) {
      const s1 = series[1];
      const unit1 = rightYUnit ?? yUnit;
      return {
        visible: true,
        x: mx,
        y: my,
        title,
        value: s0.values[idx].toFixed(valueDecimals) + yUnit,
        detail: s0.label,
        value2: (s1.values[idx] != null ? s1.values[idx].toFixed(valueDecimals) : '–') + unit1,
        detail2: s1.label,
      };
    }
    return {
      visible: true,
      x: mx,
      y: my,
      title,
      value: s0.values[idx].toFixed(valueDecimals) + yUnit,
      detail: s0.label,
    };
  }, [series, labels, periods, valueDecimals, yUnit, rightYUnit, dualAxis]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const geo = geoRef.current;
    if (!canvas || !geo || !series.length) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const idx = Math.round(((mx - geo.padL) / geo.cw) * (geo.n - 1));

    if (idx >= 0 && idx < geo.n) {
      setTooltip(buildTooltip(mx, e.clientY - rect.top, idx));
    }
  }, [series, buildTooltip]);

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleTouch = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const geo = geoRef.current;
    if (!canvas || !geo || !series.length) return;
    const touch = e.touches[0];
    if (!touch) { setTooltip((prev) => ({ ...prev, visible: false })); return; }
    const rect = canvas.getBoundingClientRect();
    const mx = touch.clientX - rect.left;
    const idx = Math.round(((mx - geo.padL) / geo.cw) * (geo.n - 1));
    if (idx >= 0 && idx < geo.n) {
      setTooltip(buildTooltip(mx, touch.clientY - rect.top, idx));
    }
  }, [series, buildTooltip]);

  return (
    <div ref={containerRef} className="relative">
      <canvas
        ref={canvasRef}
        className="block w-full"
        style={{ touchAction: 'pan-y' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouch}
        onTouchMove={handleTouch}
        onTouchEnd={() => setTooltip((prev) => ({ ...prev, visible: false }))}
      />
      {tooltip.visible && (
        <div
          className="absolute pointer-events-none bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] leading-relaxed max-w-[260px] z-[100] shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 60,
          }}
        >
          <div className="font-bold text-sm text-white mb-1">{tooltip.title}</div>
          <div className="flex items-baseline gap-2">
            <div className="text-xl font-bold tabular-nums" style={{ color: series[0]?.color ?? 'var(--accent)' }}>{tooltip.value}</div>
          </div>
          <div className="text-xs text-[var(--text-muted)] mb-1">{tooltip.detail}</div>
          {tooltip.value2 != null && (
            <>
              <div className="text-xl font-bold tabular-nums" style={{ color: series[1]?.color ?? 'var(--accent)' }}>{tooltip.value2}</div>
              <div className="text-xs text-[var(--text-muted)]">{tooltip.detail2}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
