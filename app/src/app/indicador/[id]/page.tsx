import { notFound } from 'next/navigation';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Badge from '@/components/ui/Badge';
import IndicadorClient from './IndicadorClient';
import { getIndicator, getIndicatorValues, getLatestValue } from '@/lib/data';
import { fmtNum } from '@/lib/format';
import { getIndicatorDescription } from '@/lib/indicatorDescriptions';

export default async function IndicadorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [indicator, values, { latest, previous }] = await Promise.all([
    getIndicator(id),
    getIndicatorValues(id, '00'),
    getLatestValue(id),
  ]);

  if (!indicator) {
    notFound();
  }

  const description = getIndicatorDescription(id);

  const latestVal = latest?.value != null ? Number(latest.value) : null;
  const prevVal = previous?.value != null ? Number(previous.value) : null;
  const change = latestVal != null && prevVal != null ? latestVal - prevVal : 0;

  const unit = indicator.unit ?? '';
  const isPercent = unit.toLowerCase().includes('%') || unit.toLowerCase().includes('porcentaje') || unit.toLowerCase().includes('tasa');
  const changeStr = isPercent
    ? `${change >= 0 ? '+' : ''}${change.toFixed(2)} pp`
    : `${change >= 0 ? '+' : ''}${fmtNum(change, 1)}`;

  const topicDisplay = indicator.topic
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const formattedValue = latestVal != null
    ? isPercent
      ? `${latestVal.toFixed(2)}%`
      : latestVal.toLocaleString('es-MX', {
          minimumFractionDigits: latestVal < 100 ? 1 : 0,
          maximumFractionDigits: latestVal < 100 ? 1 : 0,
        })
    : '—';

  // Serialize values for the client component
  const serializedValues = values.map((v) => ({
    period: v.period,
    period_date: v.period_date,
    value: v.value != null ? Number(v.value) : null,
  }));

  return (
    <>
      <div className="pt-10 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Explorador', href: '/explorador' },
            { label: topicDisplay, href: `/explorador?topic=${encodeURIComponent(indicator.topic)}` },
            { label: indicator.name_es },
          ]}
        />

        <h1 className="text-3xl font-bold tracking-tight text-white mb-3">
          {indicator.name_es}
        </h1>

        {/* Metadata row */}
        <div className="flex items-center gap-3 flex-wrap mb-6">
          <Badge label={topicDisplay} />
          {indicator.frequency && (
            <span className="text-xs text-[var(--text-muted)]">{indicator.frequency}</span>
          )}
          {indicator.unit && (
            <>
              <span className="text-xs text-[var(--text-muted)]">&middot;</span>
              <span className="text-xs text-[var(--text-muted)]">{indicator.unit}</span>
            </>
          )}
          {indicator.source && (
            <>
              <span className="text-xs text-[var(--text-muted)]">&middot;</span>
              <span className="text-xs text-[var(--text-muted)]">{indicator.source}</span>
            </>
          )}
          {latest?.period && (
            <>
              <span className="text-xs text-[var(--text-muted)]">&middot;</span>
              <span className="text-xs text-[var(--text-muted)]">Ultimo: {latest.period}</span>
            </>
          )}
        </div>

        {/* Indicator description */}
        {description && (
          <div className="mb-6">
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
              {description.summary}
            </p>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg px-4 py-3">
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {description.context}
              </p>
            </div>
          </div>
        )}

        {/* Latest value highlight */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 mb-6 inline-flex items-baseline gap-4">
          <span className="text-[36px] font-bold tabular-nums text-[var(--accent)] leading-none">
            {formattedValue}
          </span>
          <span
            className={`text-sm font-semibold tabular-nums ${
              change < 0
                ? 'text-[var(--positive)]'
                : change > 0
                  ? 'text-[var(--negative)]'
                  : 'text-[var(--text-muted)]'
            }`}
          >
            {change < 0 ? '\u2193' : change > 0 ? '\u2191' : ''} {changeStr} vs periodo anterior
          </span>
        </div>

        <IndicadorClient
          indicatorName={indicator.name_es}
          unit={indicator.unit ?? ''}
          frequency={indicator.frequency ?? 'Mensual'}
          source={indicator.source ?? 'INEGI'}
          values={serializedValues}
        />
      </div>

    </>
  );
}
