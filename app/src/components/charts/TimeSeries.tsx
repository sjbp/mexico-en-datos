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
  dualYAxis?: boolean;
}

interface TooltipEntry {
  value: string;
  label: string;
  color: string;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  value: string;
  detail: string;
  entries?: TooltipEntry[];
}

function niceStep(max: number): number {
  if (max <= 0) return 1;
  const rawStep = max / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const factor = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return factor * mag;
}

function fmtAxisVal(v: number, unit: string): string {
  const abs = Math.abs(v);
  if (abs >= 1e6) return (v / 1e6).toFixed(1) + 'M' + unit;
  if (abs >= 1e3) return (v / 1e3).toFixed(1) + 'K' + unit;
  return v + unit;
}

function fmtTooltipVal(v: number, decimals: number, unit: string): string {
  const abs = Math.abs(v);
  if (abs >= 1e6) return (v / 1e6).toFixed(2) + 'M' + unit;
  if (abs >= 1e3) return (v / 1e3).toFixed(2) + 'K' + unit;
  return v.toFixed(decimals) + unit;
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
  dualYAxis = false,
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

    ctx.clearRect(0, 0, w, h);

    // --- DUAL AXIS PATH ---
    if (dualYAxis && series.length >= 2) {
      const dPadL = 52, dPadR = 52;
      const dCw = w - dPadL - dPadR;
      const n = series[0].values.length;

      const vals0 = series[0].values;
      const vals1 = series[1].values;

      const max0 = Math.max(...vals0.filter(isFinite));
      const max1 = Math.max(...vals1.filter(isFinite));

      const step0 = niceStep(max0);
      const step1 = niceStep(max1);

      const yMax0 = Math.ceil(max0 / step0) * step0 + step0;
      const yMax1 = Math.ceil(max1 / step1) * step1 + step1;
      const yMin0 = yMinProp ?? 0;
      const yMin1 = 0;

      const xPosD = (i: number) => dPadL + (i / (n - 1)) * dCw;
      const yPosD0 = (v: number) => padT + ch - ((v - yMin0) / (yMax0 - yMin0)) * ch;
      const yPosD1 = (v: number) => padT + ch - ((v - yMin1) / (yMax1 - yMin1)) * ch;

      ctx.font = '11px Inter, sans-serif';

      // Left Y-axis labels (series[0]) and grid lines
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let v = yMin0; v <= yMax0 + step0 / 2; v += step0) {
        const y = yPosD0(v);
        if (y < padT - 4 || y > padT + ch + 4) continue;
        ctx.fillStyle = series[0].color + '99';
        ctx.fillText(fmtAxisVal(v, yUnit), dPadL - 8, y);
        ctx.beginPath();
        ctx.moveTo(dPadL, y);
        ctx.lineTo(w - dPadR, y);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Right Y-axis labels (series[1])
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (let v = yMin1; v <= yMax1 + step1 / 2; v += step1) {
        const y = yPosD1(v);
        if (y < padT - 4 || y > padT + ch + 4) continue;
        ctx.fillStyle = series[1].color + '99';
        ctx.fillText(fmtAxisVal(v, ''), w - dPadR + 8, y);
      }

      // X labels (same as single-axis)
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '10px Inter, sans-serif';
      for (let i = 0; i < n; i += labelStep) {
        if (labels[i]) {
          const x = xPosD(i);
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

      // Draw each series with its own Y scale
      const seriesDefs = [
        { s: series[0], yPos: yPosD0 },
        { s: series[1], yPos: yPosD1 },
      ];

      seriesDefs.forEach(({ s, yPos }) => {
        const vals = s.values;
        const vn = Math.min(vals.length, n);
        if (vn === 0) return;
        const color = s.color;
        const xP = (i: number) => dPadL + (i / (n - 1)) * dCw;

        ctx.beginPath();
        for (let i = 0; i < vn; i++) {
          i === 0 ? ctx.moveTo(xP(i), yPos(vals[i])) : ctx.lineTo(xP(i), yPos(vals[i]));
        }
        ctx.lineTo(xP(vn - 1), padT + ch);
        ctx.lineTo(dPadL, padT + ch);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, padT, 0, padT + ch);
        grad.addColorStop(0, color + '25');
        grad.addColorStop(1, color + '02');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        for (let i = 0; i < vn; i++) {
          i === 0 ? ctx.moveTo(xP(i), yPos(vals[i])) : ctx.lineTo(xP(i), yPos(vals[i]));
        }
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();

        const lastVal = vals[vn - 1];
        const lx = xP(vn - 1);
        const ly = yPos(lastVal);
        ctx.beginPath();
        ctx.arc(lx, ly, 4, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.font = '600 12px Inter, sans-serif';
        ctx.fillStyle = color;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(fmtAxisVal(lastVal, yUnit === '%' ? yUnit : ''), lx - 8, ly - 6);
      });

      geoRef.current = { padL: dPadL, padR: dPadR, padT, padB, cw: dCw, n };
      return;
    }

    // --- SINGLE AXIS PATH (existing) ---
    let allVals: number[] = [];
    series.forEach((s) => { allVals = allVals.concat(s.values); });
    const yMin = yMinProp ?? 0;
    const yMax = Math.ceil(Math.max(...allVals) / 2) * 2 + 2;
    const n = series[0].values.length;

    function xPos(i: number) { return padL + (i / (n - 1)) * cw; }
    function yPos(v: number) { return padT + ch - ((v - yMin) / (yMax - yMin)) * ch; }

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
  }, [series, labels, refBand, yUnit, yStep, labelStep, valueDecimals, dualYAxis, yMinProp]);

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
      const entries: TooltipEntry[] = series.map((s) => ({
        value: fmtTooltipVal(s.values[idx] ?? 0, valueDecimals, yUnit),
        label: s.label,
        color: s.color,
      }));
      setTooltip({
        visible: true,
        x: mx,
        y: e.clientY - rect.top,
        title: (periods && periods[idx]) || labels[idx] || '',
        value: entries[0]?.value ?? '',
        detail: entries[0]?.label ?? '',
        entries: series.length > 1 ? entries : undefined,
      });
    }
  }, [series, labels, periods, valueDecimals, yUnit]);

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
      const entries: TooltipEntry[] = series.map((s) => ({
        value: fmtTooltipVal(s.values[idx] ?? 0, valueDecimals, yUnit),
        label: s.label,
        color: s.color,
      }));
      setTooltip({
        visible: true, x: mx, y: touch.clientY - rect.top,
        title: (periods && periods[idx]) || labels[idx] || '',
        value: entries[0]?.value ?? '',
        detail: entries[0]?.label ?? '',
        entries: series.length > 1 ? entries : undefined,
      });
    }
  }, [series, labels, periods, valueDecimals, yUnit]);

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
          className="absolute pointer-events-none bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-[12px] leading-relaxed max-w-[240px] z-[100] shadow-[0_8px_32px_rgba(0,0,0,0.8)]"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 60,
          }}
        >
          <div className="font-bold text-sm text-white mb-1">{tooltip.title}</div>
          {tooltip.entries ? (
            tooltip.entries.map((entry, i) => (
              <div key={i} className="flex items-center justify-between gap-3 mt-[3px]">
                <span className="text-xs text-[var(--text-muted)] truncate">{entry.label}</span>
                <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: entry.color }}>{entry.value}</span>
              </div>
            ))
          ) : (
            <>
              <div className="text-xl font-bold text-[var(--accent)] mb-[2px] tabular-nums">{tooltip.value}</div>
              <div className="text-xs text-[var(--text-muted)]">{tooltip.detail}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
