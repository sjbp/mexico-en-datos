'use client';

import { useState, useMemo, useEffect } from 'react';
import TimeSeries from '@/components/charts/TimeSeries';
import Card from '@/components/ui/Card';
import { seriesColor } from '@/lib/colors';
import type { Indicator, IndicatorValue } from '@/lib/types';
import { getIndicatorDescription } from '@/lib/indicatorDescriptions';
import { fmtTopic } from '@/lib/format';

const MAX_SELECTED = 2;

interface CompararClientProps {
  indicators: Indicator[];
}

interface SeriesData {
  id: string;
  name: string;
  // Last observed value of each month, keyed "YYYY-MM", in date order
  monthly: Map<string, number>;
  unit: string;
}

// Only percentages get a suffix; other units are in each series' name
const axisUnit = (unit: string) => (unit === 'percent' ? '%' : '');

export default function CompararClient({ indicators }: CompararClientProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [seriesMap, setSeriesMap] = useState<Record<string, SeriesData>>({});
  const [loading, setLoading] = useState(false);

  function toggleIndicator(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= MAX_SELECTED) return prev;
      return [...prev, id];
    });
  }

  // Fetch data for selected indicators
  useEffect(() => {
    const idsToFetch = selected.filter((id) => !seriesMap[id]);
    if (idsToFetch.length === 0) return;

    setLoading(true);
    Promise.all(
      idsToFetch.map(async (id) => {
        try {
          const res = await fetch(`/api/indicators/${id}/values?geo=00`);
          if (!res.ok) return null;
          const data = await res.json();
          const values: IndicatorValue[] = data.values || [];
          const ind = indicators.find((i) => i.id === id);
          return {
            id,
            name: ind?.name_es ?? id,
            unit: ind?.unit ?? '',
            monthly: new Map(
              values
                .filter((v: IndicatorValue) => v.value != null)
                .map((v: IndicatorValue) => [String(v.period_date).slice(0, 7), Number(v.value)] as [string, number])
            ),
          } as SeriesData;
        } catch {
          return null;
        }
      })
    ).then((results) => {
      const newMap = { ...seriesMap };
      for (const r of results) {
        if (r) newMap[r.id] = r;
      }
      setSeriesMap(newMap);
      setLoading(false);
    });
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build chart series from selected indicators. Series can have different
  // frequencies and date ranges, so align them by month over the period they
  // share; a lower-frequency series keeps its last value until the next one.
  const { chartSeries, chartLabels, dualAxis, rightYUnit, commonRange } = useMemo(() => {
    const active = selected
      .map((id, idx) => (seriesMap[id] ? { data: seriesMap[id], color: seriesColor(idx) } : null))
      .filter((s): s is { data: SeriesData; color: string } => s !== null && s.data.monthly.size > 0);

    const keysOf = (m: Map<string, number>) => Array.from(m.keys()).sort();
    const start = active.map((s) => keysOf(s.data.monthly)[0]).sort().at(-1);
    const end = active.map((s) => keysOf(s.data.monthly).at(-1)!).sort()[0];
    const months: string[] = [];
    if (start && end && start <= end) {
      let [y, m] = start.split('-').map(Number);
      for (let key = start; key <= end; key = `${y}-${String(m).padStart(2, '0')}`) {
        months.push(key);
        m += 1;
        if (m > 12) { m = 1; y += 1; }
      }
    }

    const aligned = active.map(({ data, color }) => {
      const keys = keysOf(data.monthly);
      let k = 0;
      let last = NaN;
      const values = months.map((month) => {
        while (k < keys.length && keys[k] <= month) last = data.monthly.get(keys[k++])!;
        return last;
      });
      return { values, color, label: data.name, unit: data.unit };
    });

    // Year label at the first month of each year
    const labels = months.map((month, i) =>
      i === 0 || month.endsWith('-01') ? month.slice(0, 4) : ''
    );

    // Detect radically different scales (>10x difference in max values)
    let useDual = false;
    if (aligned.length === 2) {
      const max0 = Math.max(...aligned[0].values.filter(isFinite));
      const max1 = Math.max(...aligned[1].values.filter(isFinite));
      if (max0 > 0 && max1 > 0) {
        useDual = max0 / max1 > 10 || max1 / max0 > 10;
      }
    }

    return {
      chartSeries: aligned.map(({ values, color, label }) => ({ values, color, label })),
      chartLabels: labels,
      dualAxis: useDual,
      rightYUnit: axisUnit(aligned[1]?.unit ?? ''),
      commonRange: months.length > 0 ? { from: months[0], to: months[months.length - 1] } : null,
    };
  }, [selected, seriesMap]);

  // Group indicators by topic
  const grouped = useMemo(() => {
    const groups: Record<string, Indicator[]> = {};
    for (const ind of indicators) {
      if (!groups[ind.topic]) groups[ind.topic] = [];
      groups[ind.topic].push(ind);
    }
    return groups;
  }, [indicators]);

  const maxVal = !dualAxis && chartSeries.length > 0
    ? Math.max(...chartSeries.flatMap((s) => s.values))
    : 10;
  const yStep = maxVal > 200 ? 50 : maxVal > 50 ? 10 : maxVal > 10 ? 5 : 2;
  // On a shared axis the suffix only applies if every series has the same unit
  const units = selected.map((id) => seriesMap[id]?.unit ?? '');
  const leftYUnit = dualAxis || units.every((u) => u === units[0]) ? axisUnit(units[0] ?? '') : '';

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Indicator selector */}
      <div className="lg:w-[320px] shrink-0">
        <Card large>
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-3">
            Indicadores ({selected.length}/{MAX_SELECTED})
          </div>
          <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto">
            {Object.entries(grouped).map(([topic, inds]) => {
              return (
                <div key={topic}>
                  <div className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
                    {fmtTopic(topic)}
                  </div>
                  <div className="flex flex-col gap-[2px]">
                    {inds.map((ind) => {
                      const isSelected = selected.includes(ind.id);
                      const isDisabled = !isSelected && selected.length >= MAX_SELECTED;
                      const desc = getIndicatorDescription(ind.id);
                      return (
                        <label
                          key={ind.id}
                          className={`flex items-start gap-2 px-2 py-[6px] rounded-md cursor-pointer transition-colors text-[13px] ${
                            isDisabled
                              ? 'opacity-40 cursor-not-allowed'
                              : 'hover:bg-white/[0.04]'
                          } ${isSelected ? 'text-white' : 'text-[var(--text-secondary)]'}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={() => toggleIndicator(ind.id)}
                            className="accent-[var(--accent)] w-[14px] h-[14px] mt-[2px] shrink-0"
                          />
                          <div>
                            <div>{ind.name_es}</div>
                            {desc && (
                              <div className="text-[11px] text-[var(--text-muted)] leading-snug mt-[2px]">
                                {desc.summary}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Chart area */}
      <div className="flex-1 min-w-0">
        {selected.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center">
            <p className="text-[var(--text-muted)]">
              Selecciona al menos un indicador para ver la grafica.
            </p>
          </div>
        ) : loading && chartSeries.length === 0 ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center">
            <p className="text-[var(--text-muted)]">Cargando datos...</p>
          </div>
        ) : chartSeries.length > 0 && !commonRange ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-12 text-center">
            <p className="text-[var(--text-muted)]">
              Estos indicadores no tienen un periodo en comun para compararlos.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 mb-4">
              <TimeSeries
                series={chartSeries}
                labels={chartLabels}
                yUnit={leftYUnit}
                yStep={yStep}
                valueDecimals={2}
                dualAxis={dualAxis}
                rightYUnit={rightYUnit}
              />
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 items-center">
              {chartSeries.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ background: s.color }}
                  />
                  <span className="text-[var(--text-secondary)]">{s.label}</span>
                </div>
              ))}
              {dualAxis && (
                <span className="text-[11px] text-[var(--text-muted)] ml-2">
                  · Escalas independientes (eje izquierdo / derecho)
                </span>
              )}
              {commonRange && chartSeries.length > 1 && (
                <span className="text-[11px] text-[var(--text-muted)] ml-2">
                  {`· Periodo en comun: ${commonRange.from} a ${commonRange.to} · datos mensuales`}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
