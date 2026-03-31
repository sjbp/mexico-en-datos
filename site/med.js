/* ═══════════════════════════════════════════════
   México en Datos — Reusable Chart & UI Library
   Zero dependencies. Canvas 2D rendering.
   ═══════════════════════════════════════════════ */

const MED = (() => {

  // ── Color Tokens ──

  const COLORS = {
    accent:    '#FF9F43',
    positive:  '#22C55E',
    negative:  '#EF4444',
    series: ['#FF9F43', '#EF4444', '#A592D5', '#2DD4BF', '#60A5FA', '#F472B6'],
    text: {
      primary:   'rgba(255,255,255,0.95)',
      secondary: 'rgba(255,255,255,0.72)',
      muted:     'rgba(255,255,255,0.48)',
    },
    grid:  'rgba(255,255,255,0.05)',
    gridLabel: 'rgba(255,255,255,0.3)',
  };

  // ── Canvas Helpers ──

  function initCanvas(canvas, width, height) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
  }

  function canvasSize(container, aspectRatio = 0.45, maxHeight = 340) {
    const w = container.clientWidth;
    const h = Math.min(maxHeight, w * aspectRatio);
    return { w, h };
  }

  // ── Number Formatting ──

  function fmtNum(n, decimals = 0) {
    if (n == null || isNaN(n)) return '—';
    return n.toLocaleString('es-MX', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  function fmtPct(n, decimals = 1) {
    if (n == null || isNaN(n)) return '—';
    return n.toFixed(decimals) + '%';
  }

  function fmtCurrency(n, currency = 'MXN') {
    if (n == null || isNaN(n)) return '—';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + fmtNum(n);
  }

  function fmtCompact(n) {
    if (n == null || isNaN(n)) return '—';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return fmtNum(n);
  }

  // ── Color Functions ──

  /** Contrast-boosted green→yellow→red gradient, t in [0,1] */
  function greenRedCSS(t, alpha = 1) {
    t = Math.pow(Math.max(0, Math.min(1, t)), 0.55);
    const r = Math.round(t < 0.5 ? 34 + t * 2 * 221 : 255);
    const g = Math.round(t < 0.5 ? 197 : 197 - (t - 0.5) * 2 * 153);
    const b = Math.round(t < 0.5 ? 94 - t * 2 * 94 : 44);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /** Sequential single-hue scale (dark → accent) */
  function sequentialCSS(t, baseColor = COLORS.accent) {
    t = Math.max(0, Math.min(1, t));
    // Parse hex
    const r = parseInt(baseColor.slice(1, 3), 16);
    const g = parseInt(baseColor.slice(3, 5), 16);
    const b = parseInt(baseColor.slice(5, 7), 16);
    // Interpolate from near-black to full color
    const fr = Math.round(20 + t * (r - 20));
    const fg = Math.round(20 + t * (g - 20));
    const fb = Math.round(20 + t * (b - 20));
    return `rgb(${fr},${fg},${fb})`;
  }

  /** Get series color by index (wraps) */
  function seriesColor(i) {
    return COLORS.series[i % COLORS.series.length];
  }

  // ── Sparkline ──

  function drawSparkline(canvas, values, opts = {}) {
    const w = opts.width || 160;
    const h = opts.height || 32;
    const color = opts.color || COLORS.accent;
    const lineWidth = opts.lineWidth || 1.5;
    const showDot = opts.showDot !== false;
    const showFill = opts.showFill !== false;
    const pad = 2;

    const ctx = initCanvas(canvas, w, h);
    if (!values || values.length < 2) return;

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    function yPos(v) {
      return pad + (1 - (v - min) / range) * (h - pad * 2);
    }

    // Line
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = yPos(v);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color.replace(')', ',0.6)').replace('rgb(', 'rgba(');
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Fill
    if (showFill) {
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = color.replace(')', ',0.08)').replace('rgb(', 'rgba(');
      ctx.fill();
    }

    // End dot
    if (showDot) {
      const lastY = yPos(values[values.length - 1]);
      ctx.beginPath();
      ctx.arc(w, lastY, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  // ── Time Series Chart ──

  function drawTimeSeries(canvas, opts) {
    const wrap = canvas.parentElement;
    const { w, h } = canvasSize(wrap, opts.aspectRatio || 0.45, opts.maxHeight || 340);
    const ctx = initCanvas(canvas, w, h);

    const series = opts.series;       // [{ values: [], color, label }]
    const labels = opts.labels;       // x-axis labels array (same length as values)
    const padL = opts.padLeft || 48;
    const padR = opts.padRight || 16;
    const padT = opts.padTop || 16;
    const padB = opts.padBottom || 32;
    const cw = w - padL - padR;
    const ch = h - padT - padB;

    // Compute y range across all series
    let allVals = [];
    series.forEach(s => { allVals = allVals.concat(s.values); });
    const yMin = opts.yMin != null ? opts.yMin : 0;
    const yMax = opts.yMax != null ? opts.yMax : Math.ceil(Math.max(...allVals) / 2) * 2 + 2;
    const n = series[0].values.length;

    function xPos(i) { return padL + (i / (n - 1)) * cw; }
    function yPos(v) { return padT + ch - ((v - yMin) / (yMax - yMin)) * ch; }

    ctx.clearRect(0, 0, w, h);

    // Y grid
    const yStep = opts.yStep || 2;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = yMin; v <= yMax; v += yStep) {
      const y = yPos(v);
      ctx.fillStyle = COLORS.gridLabel;
      ctx.fillText(v + (opts.yUnit || '%'), padL - 8, y);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // X labels (show every labelStep-th label)
    const labelStep = opts.labelStep || 12;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COLORS.gridLabel;
    for (let i = 0; i < n; i += labelStep) {
      ctx.fillText(labels[i], xPos(i), h - padB + 10);
    }

    // Reference band (optional)
    if (opts.refBand) {
      const rb = opts.refBand;
      const y1 = yPos(rb.max);
      const y2 = yPos(rb.min);
      ctx.fillStyle = rb.fillColor || 'rgba(34,197,94,0.06)';
      ctx.fillRect(padL, y1, cw, y2 - y1);
      if (rb.target != null) {
        const yt = yPos(rb.target);
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(padL, yt);
        ctx.lineTo(w - padR, yt);
        ctx.strokeStyle = rb.lineColor || 'rgba(34,197,94,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (rb.label) {
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = rb.labelColor || 'rgba(34,197,94,0.5)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(rb.label, padL + 4, y1 - 3);
      }
    }

    // Draw each series
    series.forEach(s => {
      const vals = s.values;
      const color = s.color || COLORS.accent;

      // Area fill
      if (s.fill !== false) {
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
      }

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
      if (s.showEnd !== false) {
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
        ctx.fillText(lastVal.toFixed(opts.valueDecimals ?? 2) + (opts.yUnit || '%'), lx - 8, ly - 6);
      }
    });

    // Return chart geometry for hit-testing
    return { padL, padR, padT, padB, cw, ch, n, xPos, yPos, yMin, yMax };
  }

  // ── Horizontal Bar Chart ──

  function renderHBars(container, data, opts = {}) {
    const maxVal = opts.maxVal || Math.max(...data.map(d => d.value));
    const labelWidth = opts.labelWidth || 140;
    const valWidth = opts.valWidth || 60;
    const valueFmt = opts.valueFmt || (v => v.toFixed(1));

    container.innerHTML = data.map(d => {
      const pct = (d.value / maxVal * 100).toFixed(1);
      const color = d.color || COLORS.accent;
      return `
        <div class="med-hbar__row">
          <div class="med-hbar__label" style="width:${labelWidth}px">${d.label}</div>
          <div class="med-hbar__track">
            <div class="med-hbar__fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <div class="med-hbar__val" style="width:${valWidth}px">${valueFmt(d.value)}</div>
        </div>
      `;
    }).join('');
  }

  // ── Stat Card Factory ──

  function renderStatCard(data) {
    const { label, value, change, changePeriod, sub, sparkValues } = data;
    const isGoodDown = data.isGoodDown !== false; // default: decreases are good
    const changeDir = change < 0 ? 'down' : change > 0 ? 'up' : 'flat';
    const changeClass = changeDir === 'flat' ? ''
      : (changeDir === 'down' ? (isGoodDown ? 'positive' : 'negative')
        : (isGoodDown ? 'negative' : 'positive'));
    const arrow = changeDir === 'down' ? '↓' : changeDir === 'up' ? '↑' : '';

    const el = document.createElement('div');
    el.className = 'med-card med-card--interactive med-stat-card';
    el.setAttribute('data-interactive', '');
    el.innerHTML = `
      <div class="med-stat-card__label">${label}</div>
      <div class="med-stat-card__value">${value}</div>
      <div class="med-stat-card__change ${changeClass}">${arrow} ${Math.abs(change).toFixed(1)} pp ${changePeriod || ''}</div>
      <div class="med-stat-card__sub">${sub || ''}</div>
      ${sparkValues ? '<canvas class="med-spark" width="160" height="32"></canvas>' : ''}
    `;

    if (sparkValues) {
      // Queue sparkline draw after append
      requestAnimationFrame(() => {
        const canvas = el.querySelector('.med-spark');
        if (canvas) drawSparkline(canvas, sparkValues);
      });
    }

    return el;
  }

  // ── Tooltip Helpers ──

  function showTooltip(el, x, y, content) {
    if (content.title) el.querySelector('.med-tooltip__title').textContent = content.title;
    if (content.value) el.querySelector('.med-tooltip__value').textContent = content.value;
    if (content.detail) el.querySelector('.med-tooltip__detail').textContent = content.detail;
    el.classList.add('visible');
    el.style.left = Math.min(x + 12, window.innerWidth - 220) + 'px';
    el.style.top = (y - 70) + 'px';
  }

  function hideTooltip(el) {
    el.classList.remove('visible');
  }

  // ── Gradient Legend ──

  function drawGradientLegend(canvas, colorFn, width = 80, height = 8) {
    const ctx = initCanvas(canvas, width, height);
    for (let x = 0; x < width; x++) {
      ctx.fillStyle = colorFn(x / width);
      ctx.fillRect(x, 0, 1, height);
    }
  }

  // ── Treemap (Squarified) ──

  function squarify(items, x, y, w, h) {
    if (!items.length) return [];
    const total = items.reduce((s, d) => s + d.value, 0);
    if (total <= 0) return [];

    const rects = [];
    let remaining = [...items];
    let cx = x, cy = y, cw = w, ch = h;

    while (remaining.length) {
      const isWide = cw >= ch;
      const side = isWide ? ch : cw;
      const areaLeft = remaining.reduce((s, d) => s + d.value, 0);

      let row = [remaining[0]];
      let rowArea = remaining[0].value / total * w * h;
      remaining = remaining.slice(1);

      function worst(row, rowArea) {
        const s2 = rowArea * rowArea;
        const maxR = Math.max(...row.map(d => d.value / total * w * h));
        const minR = Math.min(...row.map(d => d.value / total * w * h));
        return Math.max(side * side * maxR / s2, s2 / (side * side * minR));
      }

      let currentWorst = worst(row, rowArea);

      while (remaining.length) {
        const next = remaining[0];
        const nextArea = next.value / total * w * h;
        const newRow = [...row, next];
        const newWorst = worst(newRow, rowArea + nextArea);
        if (newWorst > currentWorst) break;
        row = newRow;
        rowArea += nextArea;
        remaining = remaining.slice(1);
        currentWorst = newWorst;
      }

      // Lay out row
      const rowFrac = rowArea / (areaLeft / total * w * h);
      const rowSize = isWide ? cw * rowFrac : ch * rowFrac;
      let offset = 0;

      row.forEach(d => {
        const frac = (d.value / total * w * h) / rowArea;
        const itemSize = (isWide ? ch : cw) * frac;
        if (isWide) {
          rects.push({ ...d, rx: cx, ry: cy + offset, rw: rowSize, rh: itemSize });
        } else {
          rects.push({ ...d, rx: cx + offset, ry: cy, rw: itemSize, rh: rowSize });
        }
        offset += itemSize;
      });

      if (isWide) { cx += rowSize; cw -= rowSize; }
      else { cy += rowSize; ch -= rowSize; }
    }

    return rects;
  }

  // ── Public API ──

  return {
    COLORS,
    initCanvas,
    canvasSize,
    fmtNum,
    fmtPct,
    fmtCurrency,
    fmtCompact,
    greenRedCSS,
    sequentialCSS,
    seriesColor,
    drawSparkline,
    drawTimeSeries,
    renderHBars,
    renderStatCard,
    showTooltip,
    hideTooltip,
    drawGradientLegend,
    squarify,
  };

})();
