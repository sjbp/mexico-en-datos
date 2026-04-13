import { ImageResponse } from 'next/og';
import { getHeadlineIndicators, type HeadlineResult } from '@/lib/data';
import { cached } from '@/lib/cache';
import { loadInter } from '@/lib/og/fonts';
import { sparklinePath } from '@/lib/og/sparkline';
import { OG_SIZE, COLORS, SITE_URL_DISPLAY } from '@/lib/og/tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const alt = 'M\u00e9xico en Datos \u2014 Estad\u00edsticas p\u00fablicas de M\u00e9xico';
export const size = OG_SIZE;
export const contentType = 'image/png';

const getHeadlines = cached(getHeadlineIndicators);

// Four iconic indicators for the homepage preview
const CARD_IDS = ['inflacion', 'desempleo', 'tipo_cambio', 'homicidios'];

export default async function OGImage() {
  const fonts = await loadInter();
  let cards: HeadlineResult[] = [];
  try {
    const all = await getHeadlines();
    cards = CARD_IDS
      .map((id) => all.find((h) => h.id === id))
      .filter((h): h is HeadlineResult => h !== undefined);
  } catch {
    // Fall back to an empty grid if data fetching fails — still ship a brand image
    cards = [];
  }

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

        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '52px 64px 0' }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: COLORS.accent }} />
          <div
            style={{
              marginLeft: 14,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            México en Datos
          </div>
        </div>

        {/* Title + tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '26px 64px 0' }}>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em' }}>
            Estadísticas públicas de México
          </div>
          <div style={{ marginTop: 10, fontSize: 20, color: COLORS.textSecondary }}>
            INEGI · Banxico · ENOE · ENVIPE · SESNSP · Secretaría de Salud
          </div>
        </div>

        {/* Cards grid */}
        <div style={{ display: 'flex', padding: '36px 64px 0', gap: 16 }}>
          {cards.map((c) => (
            <Card key={c.id} headline={c} />
          ))}
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
          <div style={{ display: 'flex' }}>
            Gráficas interactivas · Asistente de IA · Datos oficiales
          </div>
          <div style={{ display: 'flex' }}>{SITE_URL_DISPLAY}</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}

function Card({ headline }: { headline: HeadlineResult }) {
  const { label, value, change, sparkValues, isGoodDown } = headline;

  const dir = change < 0 ? 'down' : change > 0 ? 'up' : 'flat';
  const changeColor =
    dir === 'flat'
      ? COLORS.textMuted
      : dir === 'down'
        ? isGoodDown ? COLORS.positive : COLORS.negative
        : isGoodDown ? COLORS.negative : COLORS.positive;
  const arrow = dir === 'down' ? '\u2193' : dir === 'up' ? '\u2191' : '';
  const changeStr = dir === 'flat' ? '' : `${arrow} ${Math.abs(change).toFixed(2)}`;

  const sparkW = 216;
  const sparkH = 42;
  const recent = sparkValues.slice(-24);
  const { line, fill } = sparklinePath(recent, sparkW, sparkH);
  const showSpark = line.length > 0;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: 20,
        minHeight: 244,
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 12,
          fontWeight: 600,
          color: COLORS.textMuted,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: 52,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          marginTop: 20,
        }}
      >
        {value}
      </div>
      {changeStr && (
        <div
          style={{
            display: 'flex',
            fontSize: 14,
            fontWeight: 600,
            color: changeColor,
            marginTop: 10,
          }}
        >
          {changeStr}
        </div>
      )}
      <div style={{ marginTop: 'auto', display: 'flex' }}>
        {showSpark && (
          <svg width={sparkW} height={sparkH + 4}>
            <path d={fill} fill={COLORS.accent} fillOpacity={0.18} />
            <path
              d={line}
              stroke={COLORS.accent}
              strokeWidth={2}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
