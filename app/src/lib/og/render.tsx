/** Render helpers for topic-page OG images.
 *  Each topic routes into renderTopicOG() which picks a template based on the
 *  per-topic config and fetches data through cached wrappers.
 */

import { ImageResponse } from 'next/og';
import { cached } from '@/lib/cache';
import {
  getEnvipeStats,
  getLeadingCausesOfDeath,
  getEmploymentByDimension,
  getLatestValue,
  getIndicatorValues,
} from '@/lib/data';
import { fmtNum } from '@/lib/format';
import { loadInter } from './fonts';
import { sparklinePath } from './sparkline';
import { OG_SIZE, COLORS, SITE_URL_DISPLAY } from './tokens';
import {
  getTopicConfig,
  type TopicKey,
  type TreemapConfig,
  type EditorialConfig,
  type DramaticConfig,
} from './topics';

const getEnvipeStatsCached = cached(getEnvipeStats);
const getLeadingCausesOfDeathCached = cached(getLeadingCausesOfDeath);
const getEmploymentByDimensionCached = cached(getEmploymentByDimension);
const getLatestValueCached = cached(getLatestValue);
const getIndicatorValuesCached = cached(getIndicatorValues);

// ── Shared labels ──────────────────────────────────────────────────────

const CRIME_LABELS: Record<string, string> = {
  street_robbery: 'Robo en calle',
  home_robbery: 'Robo a casa',
  bank_fraud: 'Fraude bancario',
  threats: 'Amenazas',
  vehicle_partial_theft: 'Robo de autopartes',
  consumer_fraud: 'Fraude al consumidor',
  vehicle_theft: 'Robo de vehículo',
  extortion: 'Extorsión',
  vandalism: 'Vandalismo',
  assault: 'Lesiones',
  other_robbery: 'Otro robo',
  sexual_harassment: 'Acoso sexual',
  kidnapping: 'Secuestro',
  sexual_assault: 'Violación',
  other: 'Otros delitos',
};

const CAUSE_LABELS: Record<string, string> = {
  cardiovascular: 'Enf. del corazón',
  diabetes: 'Diabetes',
  cancer: 'Tumores malignos',
  liver_disease: 'Enf. del hígado',
  cerebrovascular: 'Cerebrovascular',
  homicide: 'Homicidios',
  respiratory: 'Inf. respiratorias',
  traffic_accidents: 'Acc. de tránsito',
  kidney_disease: 'Enf. del riñón',
  covid19: 'COVID-19',
  other: 'Otras causas',
};

// ── Top-level entry ────────────────────────────────────────────────────

export async function renderTopicOG(topic: TopicKey): Promise<ImageResponse> {
  const config = getTopicConfig(topic);
  const fonts = await loadInter();
  switch (config.kind) {
    case 'treemap':
      return renderTreemap(config, fonts);
    case 'editorial':
      return renderEditorial(config, fonts);
    case 'dramatic':
      return renderDramatic(config, fonts);
  }
}

type Fonts = Awaited<ReturnType<typeof loadInter>>;

// ── Treemap template (G) ───────────────────────────────────────────────

interface TreemapItem {
  label: string;
  size: number; // cell area is proportional to this
  display: string; // value text rendered in the cell
  sub?: string; // optional secondary label (e.g., "28%")
}

async function getTreemapItems(source: TreemapConfig['dataSource']): Promise<{ items: TreemapItem[]; subtitle: string }> {
  if (source === 'seguridad_crimes') {
    const stats = await getEnvipeStatsCached(undefined, '00');
    const latestYear = Math.max(...stats.map((s) => Number(s.year)));
    const rows = stats
      .filter((s) => s.year === latestYear && s.crime_type !== 'total' && s.prevalence_rate != null)
      .sort((a, b) => Number(b.prevalence_rate) - Number(a.prevalence_rate));
    const top = rows.slice(0, 6);
    const total = rows.reduce((a, b) => a + Number(b.prevalence_rate), 0);
    const items: TreemapItem[] = top.map((r) => {
      const val = Number(r.prevalence_rate);
      const pct = total > 0 ? (val / total) * 100 : 0;
      return {
        label: (CRIME_LABELS[r.crime_type] ?? r.crime_type).toUpperCase(),
        size: val,
        display: `${Math.round(val).toLocaleString('es-MX')}`,
        sub: `${pct.toFixed(0)}%`,
      };
    });
    return { items, subtitle: `Incidencia por 100 mil hab. · ENVIPE ${latestYear}` };
  }

  if (source === 'salud_causes') {
    // Find the most recent year that has data
    const years = [2023, 2022, 2021, 2020, 2019];
    let causes: Awaited<ReturnType<typeof getLeadingCausesOfDeath>> = [];
    let usedYear = years[0];
    for (const y of years) {
      causes = await getLeadingCausesOfDeathCached(y);
      if (causes.length > 0) {
        usedYear = y;
        break;
      }
    }
    const top = causes.slice(0, 6);
    const items: TreemapItem[] = top.map((c) => {
      const deaths = Number(c.deaths);
      return {
        label: (CAUSE_LABELS[c.cause_group] ?? c.cause_group).toUpperCase(),
        size: deaths,
        display: compactNumber(deaths),
        sub: c.rate_per_100k != null ? `${Number(c.rate_per_100k).toFixed(0)}/100k` : undefined,
      };
    });
    return { items, subtitle: `Principales causas de muerte · México ${usedYear}` };
  }

  if (source === 'empleo_sectors') {
    const stats = await getEmploymentByDimensionCached('sector');
    const rows = stats
      .filter((s) => s.informality_rate != null && s.employed != null)
      .sort((a, b) => Number(b.employed) - Number(a.employed));
    const top = rows.slice(0, 6);
    const items: TreemapItem[] = top.map((s) => ({
      label: s.dimension_value.toUpperCase(),
      size: Number(s.employed),
      display: `${Number(s.informality_rate).toFixed(0)}%`,
      sub: `${compactNumber(Number(s.employed))} ocupados`,
    }));
    const quarter = rows[0]?.quarter ?? '';
    return { items, subtitle: `Informalidad laboral por sector · ENOE ${quarter}` };
  }

  return { items: [], subtitle: '' };
}

function compactNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toLocaleString('es-MX');
}

/** Two-row proportional layout. Top row: 3 largest cells. Bottom row: next 3. */
function rowTreemapLayout(
  items: TreemapItem[],
  width: number,
  height: number,
): Array<{ item: TreemapItem; x: number; y: number; w: number; h: number; rank: number }> {
  const top = items.slice(0, 3);
  const bot = items.slice(3, 6);
  const topSum = top.reduce((a, b) => a + b.size, 0) || 1;
  const botSum = bot.reduce((a, b) => a + b.size, 0) || 1;
  const topH = bot.length === 0 ? height : Math.round(height * 0.58);
  const botH = height - topH;

  const out: Array<{ item: TreemapItem; x: number; y: number; w: number; h: number; rank: number }> = [];
  let cx = 0;
  top.forEach((it, i) => {
    const cw = i === top.length - 1 ? width - cx : Math.round((it.size / topSum) * width);
    out.push({ item: it, x: cx, y: 0, w: cw, h: topH, rank: i });
    cx += cw;
  });
  cx = 0;
  bot.forEach((it, i) => {
    const cw = i === bot.length - 1 ? width - cx : Math.round((it.size / botSum) * width);
    out.push({ item: it, x: cx, y: topH, w: cw, h: botH, rank: i + 3 });
    cx += cw;
  });
  return out;
}

function cellColor(rank: number): { bg: string; text: string; muted: string } {
  const ramp = [0.85, 0.62, 0.5, 0.35, 0.24, 0.16];
  const alpha = ramp[rank] ?? 0.14;
  const bg = `rgba(255,159,67,${alpha})`;
  // Higher alpha → near-solid amber → black text reads best. Low alpha → dark bg → white text.
  const useLightText = alpha < 0.4;
  return {
    bg,
    text: useLightText ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)',
    muted: useLightText ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
  };
}

function cellValueFont(w: number, h: number): number {
  const area = w * h;
  if (area > 120_000) return 76;
  if (area > 70_000) return 56;
  if (area > 40_000) return 42;
  if (area > 20_000) return 32;
  return 24;
}

function cellLabelFont(w: number): number {
  if (w > 280) return 14;
  if (w > 180) return 12;
  return 11;
}

async function renderTreemap(config: TreemapConfig, fonts: Fonts): Promise<ImageResponse> {
  const { items, subtitle } = await getTreemapItems(config.dataSource);

  // Fallback to brand cover if no data
  if (items.length === 0) {
    return renderBrandFallback(config.title, config.subtitle, fonts);
  }

  // Treemap area: 32 (left) .. 1168 (right), 140 (top) .. 580 (bottom)
  // Gap between cells: 3
  const TM_X = 32;
  const TM_Y = 140;
  const TM_W = 1136;
  const TM_H = 440;
  const GAP = 3;

  const layout = rowTreemapLayout(items, TM_W, TM_H);

  return new ImageResponse(
    (
      <div
        style={{
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          background: COLORS.bg,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter',
          color: COLORS.text,
          position: 'relative',
        }}
      >
        {/* Top accent */}
        <div style={{ width: '100%', height: 3, background: COLORS.accent }} />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '36px 32px 0',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: COLORS.accent }} />
            <div
              style={{
                marginLeft: 12,
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.textSecondary,
                letterSpacing: '0.1em',
              }}
            >
              MÉXICO EN DATOS
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              padding: '7px 14px',
              borderRadius: 14,
              background: 'rgba(255,159,67,0.15)',
              border: '1px solid rgba(255,159,67,0.4)',
              fontSize: 12,
              fontWeight: 700,
              color: COLORS.accent,
              letterSpacing: '0.14em',
            }}
          >
            {config.topicLabel}
          </div>
        </div>

        {/* Title row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            padding: '14px 32px 0',
          }}
        >
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: '-0.03em' }}>
            {config.title}
          </div>
          <div style={{ marginLeft: 16, fontSize: 16, color: COLORS.textSecondary }}>
            {subtitle || config.subtitle}
          </div>
        </div>

        {/* Treemap */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            position: 'absolute',
            left: TM_X,
            top: TM_Y,
            width: TM_W,
            height: TM_H,
          }}
        >
          {layout.map(({ item, x, y, w, h, rank }) => {
            const col = cellColor(rank);
            const valueFont = cellValueFont(w, h);
            const labelFont = cellLabelFont(w);
            return (
              <div
                key={rank}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: w - GAP,
                  height: h - GAP,
                  background: col.bg,
                  padding: w > 180 ? 20 : 12,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: labelFont,
                    fontWeight: 700,
                    color: col.text,
                    letterSpacing: '0.06em',
                    lineHeight: 1.1,
                  }}
                >
                  {truncate(item.label, Math.max(10, Math.floor(w / 10)))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    marginTop: 'auto',
                    fontSize: valueFont,
                    fontWeight: 700,
                    color: col.text,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  {item.display}
                </div>
                {item.sub && h > 100 && (
                  <div
                    style={{
                      display: 'flex',
                      marginTop: 4,
                      fontSize: Math.max(11, labelFont - 1),
                      fontWeight: 600,
                      color: col.muted,
                    }}
                  >
                    {item.sub}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            position: 'absolute',
            bottom: 20,
            left: 32,
            right: 32,
            fontSize: 13,
            color: COLORS.textMuted,
          }}
        >
          <div style={{ display: 'flex' }}>{config.sourceFooter}</div>
          <div style={{ display: 'flex' }}>{SITE_URL_DISPLAY}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}

// ── Editorial template (F) ─────────────────────────────────────────────

async function renderEditorial(config: EditorialConfig, fonts: Fonts): Promise<ImageResponse> {
  const statResults = await Promise.all(
    config.stats.map(async (s) => {
      try {
        const { latest, previous } = await getLatestValueCached(s.indicatorId);
        const latestVal = latest?.value != null ? Number(latest.value) : null;
        const prevVal = previous?.value != null ? Number(previous.value) : null;
        return {
          label: s.label,
          value: latestVal != null ? formatStat(latestVal, s.format) : '—',
          change: latestVal != null && prevVal != null ? latestVal - prevVal : 0,
          format: s.format,
        };
      } catch {
        return { label: s.label, value: '—', change: 0, format: s.format };
      }
    }),
  );

  // Trend chart series
  let chartPoints: number[] = [];
  if (config.chartIndicator) {
    try {
      const vals = await getIndicatorValuesCached(config.chartIndicator, '00', 24);
      chartPoints = vals
        .map((v) => (v.value != null ? Number(v.value) : null))
        .filter((v): v is number => v !== null)
        .reverse();
    } catch {
      chartPoints = [];
    }
  }

  const chartW = 1072;
  const chartH = 80;
  const { line: chartLine, fill: chartFill } = sparklinePath(chartPoints, chartW, chartH);
  const hasChart = chartLine.length > 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          background: COLORS.bg,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter',
          color: COLORS.text,
          position: 'relative',
        }}
      >
        {/* Left accent rail */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 4, height: '100%', background: COLORS.accent }} />

        {/* Masthead */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '48px 56px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: COLORS.accent }} />
            <div
              style={{
                marginLeft: 12,
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.textSecondary,
                letterSpacing: '0.1em',
              }}
            >
              MÉXICO EN DATOS
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 13, fontWeight: 600, color: COLORS.textMuted, letterSpacing: '0.14em' }}>
            PORTADA · {config.topicLabel}
          </div>
        </div>

        {/* Divider */}
        <div style={{ margin: '20px 56px 0', height: 1, background: COLORS.border }} />

        {/* Display title */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '28px 56px 0' }}>
          <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1 }}>
            {config.title}
          </div>
          <div style={{ marginTop: 14, fontSize: 20, color: COLORS.textSecondary, letterSpacing: '-0.01em' }}>
            {config.subtitle}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', padding: '36px 56px 0', gap: 36 }}>
          {statResults.map((s, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: 12,
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  letterSpacing: '0.12em',
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 56,
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  marginTop: 14,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom chart strip */}
        {hasChart && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              position: 'absolute',
              bottom: 64,
              left: 56,
              right: 56,
            }}
          >
            {config.chartLabel && (
              <div
                style={{
                  display: 'flex',
                  fontSize: 12,
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  letterSpacing: '0.12em',
                  marginBottom: 10,
                }}
              >
                {config.chartLabel}
              </div>
            )}
            <svg width={chartW} height={chartH + 8}>
              <path d={chartFill} fill={COLORS.accent} fillOpacity={0.28} />
              <path d={chartLine} stroke={COLORS.accent} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            position: 'absolute',
            bottom: 28,
            left: 56,
            right: 56,
            fontSize: 14,
            color: COLORS.textMuted,
          }}
        >
          <div style={{ display: 'flex' }}>{config.sourceFooter}</div>
          <div style={{ display: 'flex' }}>{SITE_URL_DISPLAY}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}

function formatStat(val: number, format: EditorialConfig['stats'][number]['format']): string {
  switch (format) {
    case 'percent':
      return `${val.toFixed(2)}%`;
    case 'currency':
      return `$${val.toFixed(2)}`;
    case 'compact':
      // Raw number with Spanish-locale commas. Unit (MDD, etc.) goes in the label.
      return `$${Math.round(val).toLocaleString('es-MX')}`;
    case 'raw':
    default:
      return fmtNum(val, val < 100 ? 1 : 0);
  }
}

// ── Dramatic template (E) — manual override slot ───────────────────────

async function renderDramatic(config: DramaticConfig, fonts: Fonts): Promise<ImageResponse> {
  let sparkPoints: number[] = [];
  if (config.sparkIndicator) {
    try {
      const vals = await getIndicatorValuesCached(config.sparkIndicator, '00', 24);
      sparkPoints = vals
        .map((v) => (v.value != null ? Number(v.value) : null))
        .filter((v): v is number => v !== null)
        .reverse();
    } catch {
      sparkPoints = [];
    }
  }

  const sparkW = 340;
  const sparkH = 52;
  const { line: sparkLine, fill: sparkFill } = sparklinePath(sparkPoints, sparkW, sparkH);
  const showSpark = sparkLine.length > 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          background: COLORS.bg,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Inter',
          color: COLORS.text,
          position: 'relative',
        }}
      >
        <div style={{ width: '100%', height: 3, background: COLORS.accent }} />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '44px 64px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: COLORS.accent }} />
            <div
              style={{
                marginLeft: 12,
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.textSecondary,
                letterSpacing: '0.1em',
              }}
            >
              MÉXICO EN DATOS
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              padding: '7px 14px',
              borderRadius: 14,
              background: 'rgba(255,159,67,0.15)',
              border: '1px solid rgba(255,159,67,0.4)',
              fontSize: 12,
              fontWeight: 700,
              color: COLORS.accent,
              letterSpacing: '0.14em',
            }}
          >
            {config.topicLabel}
          </div>
        </div>

        {/* Preamble */}
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            fontWeight: 600,
            color: COLORS.textMuted,
            letterSpacing: '0.16em',
            padding: '70px 64px 0',
          }}
        >
          {config.preamble}
        </div>

        {/* Fact + subfact */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 64px 0' }}>
          <div style={{ fontSize: 124, fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1.05 }}>
            {config.fact}
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: COLORS.accent,
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              marginTop: 14,
            }}
          >
            {config.subfact}
          </div>
        </div>

        {/* Sparkline strip */}
        {showSpark && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              position: 'absolute',
              bottom: 70,
              left: 64,
            }}
          >
            {config.sparkLabel && (
              <div
                style={{
                  display: 'flex',
                  fontSize: 12,
                  fontWeight: 600,
                  color: COLORS.textMuted,
                  letterSpacing: '0.1em',
                  marginBottom: 6,
                }}
              >
                {config.sparkLabel}
              </div>
            )}
            <svg width={sparkW} height={sparkH + 8}>
              <path d={sparkFill} fill={COLORS.accent} fillOpacity={0.28} />
              <path d={sparkLine} stroke={COLORS.accent} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 28,
            right: 64,
            fontSize: 15,
            color: COLORS.textMuted,
          }}
        >
          {config.sourceFooter} · {SITE_URL_DISPLAY}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}

// ── Shared fallback ────────────────────────────────────────────────────

function renderBrandFallback(title: string, subtitle: string, fonts: Fonts): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: OG_SIZE.width,
          height: OG_SIZE.height,
          background: COLORS.bg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter',
          color: COLORS.text,
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 3, background: COLORS.accent }} />
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: COLORS.accent }} />
          <div style={{ marginLeft: 14, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
            México en Datos
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 60, fontWeight: 700, letterSpacing: '-0.04em' }}>{title}</div>
        <div style={{ display: 'flex', fontSize: 20, color: COLORS.textSecondary, marginTop: 12 }}>{subtitle}</div>
        <div style={{ display: 'flex', position: 'absolute', bottom: 28, right: 56, fontSize: 15, color: COLORS.textMuted }}>
          {SITE_URL_DISPLAY}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}

// ── Utilities ──────────────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}
