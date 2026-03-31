export const SERIES_COLORS = [
  '#FF9F43', '#EF4444', '#A592D5', '#2DD4BF', '#60A5FA', '#F472B6',
];

/** Contrast-boosted green -> yellow -> red gradient, t in [0,1] */
export function greenRedCSS(t: number, alpha = 1): string {
  t = Math.pow(Math.max(0, Math.min(1, t)), 0.55);
  const r = Math.round(t < 0.5 ? 34 + t * 2 * 221 : 255);
  const g = Math.round(t < 0.5 ? 197 : 197 - (t - 0.5) * 2 * 153);
  const b = Math.round(t < 0.5 ? 94 - t * 2 * 94 : 44);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Sequential single-hue scale (dark -> accent) */
export function sequentialCSS(t: number, baseColor = '#FF9F43'): string {
  t = Math.max(0, Math.min(1, t));
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  const fr = Math.round(20 + t * (r - 20));
  const fg = Math.round(20 + t * (g - 20));
  const fb = Math.round(20 + t * (b - 20));
  return `rgb(${fr},${fg},${fb})`;
}

/** Get series color by index (wraps) */
export function seriesColor(i: number): string {
  return SERIES_COLORS[i % SERIES_COLORS.length];
}
