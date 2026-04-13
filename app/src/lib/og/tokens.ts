/** Shared constants for OG image rendering. Satori-safe (flexbox + limited SVG). */

export const OG_SIZE = { width: 1200, height: 630 } as const;

export const COLORS = {
  bg: '#000000',
  surface: '#141414',
  border: 'rgba(255,255,255,0.08)',
  accent: '#FF9F43',
  accentDim: 'rgba(255,159,67,0.18)',
  text: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.72)',
  textMuted: 'rgba(255,255,255,0.48)',
  positive: '#22C55E',
  negative: '#EF4444',
} as const;

export const SITE_URL_DISPLAY = 'datamx.sebastian.mx';
