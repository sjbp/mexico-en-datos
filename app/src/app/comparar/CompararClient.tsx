'use client';

import { useState, useMemo, useEffect } from 'react';
import TimeSeries from '@/components/charts/TimeSeries';
import Card from '@/components/ui/Card';
import { seriesColor } from '@/lib/colors';
import type { Indicator, IndicatorValue } from '@/lib/types';
import { getIndicatorDescription } from '@/lib/indicatorDescriptions';
import { fmtTopic } from '@/lib/format';

const MAX_SELECTED = 3;

interface CompararClientProps {
  indicators: Indicator[];
}

interface SeriesData {
  id: string;
  name: string;
  values: number[];
  labels: string[];
}

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
            values: values.map((v: IndicatorValue) => (v.value != null ? Number(v.value) : 0)),
            labels: values.map((v: IndicatorValue, i: number) => {
              const date = new Date(v.period_date);
              if (date.getMonth() === 0 || i === 0) return String(date.getFullYear());
              return '';
            }),
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

  // Build chart series from selected indicators
  const { chartSeries, chartLabels } = useMemo(() => {
    const activeSeries = selected
      .map((id, idx) => {
        const data = seriesMap[id];
        if (!data) return null;
        return {
          values: data.values,
          color: seriesColor(idx),
          label: data.name,
          labels: data.labels,
        };
      })
      .filter(Boolean) as Array<{ values: number[]; color: string; label: string; labels: string[] }>;

    // Use labels from the longest series
    const longest = activeSeries.reduce(
      (max, s) => (s.labels.length > max.length ? s.labels : max),
      [] as string[]
    );

    return {
      chartSeries: activeSeries.map((s) => ({
        values: s.values,
        color: s.color,
        label: s.label,
      })),
      chartLabels: longest,
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

  const maxVal = chartSeries.length > 0
    ? Math.max(...chartSeries.flatMap((s) => s.values))
    : 10;
  const yStep = maxVal > 200 ? 50 : maxVal > 50 ? 10 : maxVal > 10 ? 5 : 2;

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
        ) : (
          <>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 mb-4">
              <TimeSeries
                series={chartSeries}
                labels={chartLabels}
                yUnit=""
                yStep={yStep}
                labelStep={chartLabels.length > 60 ? 12 : chartLabels.length > 24 ? 6 : 3}
                valueDecimals={2}
              />
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-4">
              {chartSeries.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ background: s.color }}
                  />
                  <span className="text-[var(--text-secondary)]">{s.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
