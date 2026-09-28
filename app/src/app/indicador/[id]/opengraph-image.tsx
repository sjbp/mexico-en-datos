import { ImageResponse } from 'next/og';
import { getIndicator, getIndicatorValues, getLatestValue } from '@/lib/data';
import { cached } from '@/lib/cache';
import { loadInter } from '@/lib/og/fonts';
import { sparklinePath } from '@/lib/og/sparkline';
import { OG_SIZE, COLORS, SITE_URL_DISPLAY } from '@/lib/og/tokens';
import { fmtTopic } from '@/lib/format';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'Indicador · México en Datos';
export const size = OG_SIZE;
export const contentType = 'image/png';

const getIndicatorCached = cached(getIndicator);
const getIndicatorValuesCached = cached(getIndicatorValues);
const getLatestValueCached = cached(getLatestValue);

type Props = { params: Promise<{ id: string }> };

export default async function OGImage({ params }: Props) {
  const { id } = await params;
  const fonts = await loadInter();

  const [indicator, values, latestPair] = await Promise.all([
    getIndicatorCached(id),
    getIndicatorValuesCached(id, '00', 30),
    getLatestValueCached(id),
  ]);

  // Graceful fallback for unknown indicators — still ship a branded image.
  if (!indicator || !latestPair.latest) {
    return renderFallback(fonts);
  }

  const latestVal = latestPair.latest.value != null ? Number(latestPair.latest.value) : null;
  const prevVal = latestPair.previous?.value != null ? Number(latestPair.previous.value) : null;
  const change = latestVal != null && prevVal != null ? latestVal - prevVal : 0;

  const unit = indicator.unit ?? '';
  const unitLower = unit.toLowerCase();
  const isPercent = unitLower === 'percent' || unitLower.includes('%') || unitLower.includes('porcentaje') || unitLower.includes('tasa');
  const isCurrency = unitLower.includes('peso') || unitLower.includes('usd') || unitLower.includes('mxn') || unitLower.includes('$');

  const formattedValue = latestVal != null
    ? isPercent
      ? `${latestVal.toFixed(2)}%`
      : isCurrency
        ? `$${latestVal.toFixed(2)}`
        : latestVal.toLocaleString('es-MX', {
            minimumFractionDigits: latestVal < 100 ? 1 : 0,
            maximumFractionDigits: latestVal < 100 ? 1 : 0,
          })
    : '—';

  // Arrow conveys direction — change magnitude uses absolute value to avoid doubled signs.
  const changeStr = change === 0
    ? ''
    : isPercent
      ? `${Math.abs(change).toFixed(2)} pp`
      : isCurrency
        ? `$${Math.abs(change).toFixed(2)}`
        : Math.abs(change).toLocaleString('es-MX', { maximumFractionDigits: 2 });
  const arrow = change < 0 ? '↓' : change > 0 ? '↑' : '';
  const changeIsGood = change < 0; // default assumption for indicators where lower is better; aesthetically neutral on OG
  const changePillBg = change === 0
    ? COLORS.surface
    : changeIsGood
      ? 'rgba(34,197,94,0.14)'
      : 'rgba(239,68,68,0.14)';
  const changePillColor = change === 0
    ? COLORS.textMuted
    : changeIsGood
      ? COLORS.positive
      : COLORS.negative;

  const name = indicator.name_es.replace(/\s*\(.*\)$/, '');
  const topicLabel = fmtTopic(indicator.topic).toUpperCase();
  const periodLabel = latestPair.latest.period ?? '';
  const source = indicator.source ?? '';
  const sourceFooter = [source, periodLabel].filter(Boolean).join(' · ');

  // Sparkline: last 24 values
  const recent = values
    .map((v) => (v.value != null ? Number(v.value) : null))
    .filter((v): v is number => v !== null)
    .slice(0, 24)
    .reverse(); // getIndicatorValues returns DESC; we want chronological

  const sparkW = 440;
  const sparkH = 220;
  const { line: sparkLine, fill: sparkFill } = sparklinePath(recent, sparkW, sparkH);
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
        {/* Top accent bar */}
        <div style={{ width: '100%', height: 3, background: COLORS.accent }} />

        {/* Header row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '48px 64px 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: COLORS.accent }} />
            <div
              style={{
                marginLeft: 12,
                fontSize: 15,
                fontWeight: 600,
                color: COLORS.textSecondary,
                letterSpacing: '0.08em',
              }}
            >
              MÉXICO EN DATOS
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              padding: '8px 16px',
              borderRadius: 16,
              background: 'rgba(255,159,67,0.15)',
              border: '1px solid rgba(255,159,67,0.4)',
              fontSize: 13,
              fontWeight: 700,
              color: COLORS.accent,
              letterSpacing: '0.14em',
            }}
          >
            {topicLabel}
          </div>
        </div>

        {/* Body: two columns */}
        <div style={{ display: 'flex', flex: 1, padding: '48px 64px 0' }}>
          {/* Left: label + big number + change pill */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 32 }}>
            <div
              style={{
                display: 'flex',
                fontSize: 18,
                fontWeight: 600,
                color: COLORS.textMuted,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {truncate(name, 42)}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: valueFontSize(formattedValue),
                fontWeight: 700,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                marginTop: 24,
              }}
            >
              {formattedValue}
            </div>
            {changeStr && (
              <div
                style={{
                  display: 'flex',
                  alignSelf: 'flex-start',
                  marginTop: 24,
                  padding: '10px 20px',
                  borderRadius: 24,
                  background: changePillBg,
                  fontSize: 17,
                  fontWeight: 600,
                  color: changePillColor,
                }}
              >
                {arrow} {changeStr} vs periodo anterior
              </div>
            )}
          </div>

          {/* Right: sparkline */}
          {showSpark && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: sparkW,
              }}
            >
              <svg width={sparkW} height={sparkH + 16}>
                <path d={sparkFill} fill={COLORS.accent} fillOpacity={0.28} />
                <path
                  d={sparkLine}
                  stroke={COLORS.accent}
                  strokeWidth={3.5}
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 64px',
            position: 'absolute',
            bottom: 32,
            left: 0,
            right: 0,
            fontSize: 16,
            color: COLORS.textMuted,
          }}
        >
          <div style={{ display: 'flex' }}>{sourceFooter ? `Fuente: ${sourceFooter}` : ''}</div>
          <div style={{ display: 'flex' }}>{SITE_URL_DISPLAY}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}

// Shrink the hero number when the string is long (e.g. "1,234,567" vs "4.02%")
function valueFontSize(s: string): number {
  const len = s.length;
  if (len <= 5) return 200;
  if (len <= 7) return 170;
  if (len <= 9) return 140;
  return 110;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
}

function renderFallback(fonts: Awaited<ReturnType<typeof loadInter>>) {
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
        }}
      >
        <div style={{ width: '100%', height: 3, background: COLORS.accent, position: 'absolute', top: 0, left: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: COLORS.accent }} />
          <div style={{ marginLeft: 14, fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>
            México en Datos
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em' }}>
          Estadísticas públicas de México
        </div>
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 32,
            right: 64,
            fontSize: 16,
            color: COLORS.textMuted,
          }}
        >
          {SITE_URL_DISPLAY}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
