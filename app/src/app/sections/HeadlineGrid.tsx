import Link from 'next/link';
import StatCard from '@/components/ui/StatCard';
import type { Indicator, IndicatorValue } from '@/lib/types';
import { fmtNum } from '@/lib/format';

interface HeadlineData {
  indicator: Indicator;
  latest: IndicatorValue | null;
  previous: IndicatorValue | null;
  sparkValues: number[];
}

interface HeadlineGridProps {
  headlines: HeadlineData[];
}

function formatValue(indicator: Indicator, value: number): string {
  const unit = indicator.unit?.toLowerCase() ?? '';
  if (unit.includes('%') || unit.includes('porcentaje') || unit.includes('tasa')) {
    return value.toFixed(1) + '%';
  }
  if (unit.includes('indice') || unit.includes('índice')) {
    return value.toFixed(2);
  }
  return fmtNum(value, value < 100 ? 1 : 0);
}

function isGoodDown(indicator: Indicator): boolean {
  const name = indicator.name_es.toLowerCase();
  // For unemployment, informality, suboccupation — going down is good
  if (name.includes('desocupación') || name.includes('informalidad') || name.includes('subocupación')) {
    return true;
  }
  // For PIB — going down is bad
  if (name.includes('pib') || name.includes('producto interno')) {
    return false;
  }
  // Default: going down is good (lower prices/inflation is generally good)
  return true;
}

export default function HeadlineGrid({ headlines }: HeadlineGridProps) {
  if (headlines.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 px-[var(--pad-page)] mb-10 max-sm:grid-cols-2">
      {headlines.map((h) => {
        const latestVal = h.latest?.value != null ? Number(h.latest.value) : null;
        const prevVal = h.previous?.value != null ? Number(h.previous.value) : null;
        const change = latestVal != null && prevVal != null ? latestVal - prevVal : 0;

        return (
          <Link
            key={h.indicator.id}
            href={`/indicador/${h.indicator.id}`}
            className="block no-underline text-inherit"
          >
            <StatCard
              label={h.indicator.name_es}
              value={latestVal != null ? formatValue(h.indicator, latestVal) : '—'}
              change={change}
              changePeriod={h.latest?.period ? `· ${h.latest.period}` : ''}
              sub={`${h.indicator.source ?? 'INEGI'} · ${h.indicator.frequency ?? ''}`}
              sparkValues={h.sparkValues}
              isGoodDown={isGoodDown(h.indicator)}
            />
          </Link>
        );
      })}
    </div>
  );
}
