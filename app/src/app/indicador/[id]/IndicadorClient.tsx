'use client';

import { useState, useMemo } from 'react';
import TimeSeries from '@/components/charts/TimeSeries';
import DataTable from '@/components/ui/DataTable';
import { seriesColor } from '@/lib/colors';

interface SerializedValue {
  period: string;
  period_date: string;
  value: number | null;
}

const RANGE_OPTIONS = [
  { id: '1a', label: '1A', months: 18 },
  { id: '5a', label: '5A', months: 66 },
  { id: '10a', label: '10A', months: 126 },
  { id: 'max', label: 'Max', months: Infinity },
];

interface IndicadorClientProps {
  indicatorName: string;
  unit: string;
  frequency: string;
  source: string;
  values: SerializedValue[];
}

export default function IndicadorClient({
  indicatorName,
  unit,
  frequency,
  source,
  values: allValues,
}: IndicadorClientProps) {
  const [range, setRange] = useState('5a');

  const rangeConfig = RANGE_OPTIONS.find((r) => r.id === range) || RANGE_OPTIONS[1];

  const filteredValues = useMemo(() => {
    if (rangeConfig.months === Infinity) return allValues;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - rangeConfig.months);
    const filtered = allValues.filter(
      (v) => new Date(v.period_date) >= cutoffDate
    );
    // Ensure at least 4 data points (important for quarterly indicators)
    if (filtered.length < 4 && allValues.length >= 4) {
      return allValues.slice(-Math.min(8, allValues.length));
    }
    return filtered.length > 0 ? filtered : allValues.slice(-4);
  }, [allValues, rangeConfig.months]);

  const numericValues = useMemo(
    () => filteredValues.map((v) => v.value ?? 0),
    [filteredValues]
  );

  const labels = useMemo(() => {
    return filteredValues.map((v, i) => {
      const p = v.period; // e.g. "2024/Q1", "2024/03", "2024-03-15"

      // Quarterly: show at Q1 each year and first point
      if (p.includes('Q')) {
        const [yr, q] = p.split('/');
        if (i === 0 || q === 'Q1') return `${yr} Q1`;
        return filteredValues.length <= 8 ? `${yr} ${q}` : '';
      }

      // Daily ISO date (YYYY-MM-DD): show year at year boundaries
      const isoMatch = p.match(/^(\d{4})-(\d{2})-\d{2}$/);
      if (isoMatch) {
        const yr = isoMatch[1];
        const prevYr = i > 0 ? filteredValues[i - 1].period.slice(0, 4) : null;
        if (i === 0 || yr !== prevYr) return yr;
        return '';
      }

      // Monthly (YYYY/MM): show year at January or first point
      const monthlyMatch = p.match(/^(\d{4})\/(\d{2})$/);
      if (monthlyMatch) {
        const yr = monthlyMatch[1];
        const mo = parseInt(monthlyMatch[2], 10);
        if (i === 0 || mo === 1) return yr;
        return '';
      }

      // Annual (YYYY): show every year
      if (/^\d{4}$/.test(p)) return p;

      // Generic: show year at year changes
      const yr = p.slice(0, 4);
      const prevYr = i > 0 ? filteredValues[i - 1].period.slice(0, 4) : null;
      if (i === 0 || yr !== prevYr) return yr;
      return '';
    });
  }, [filteredValues]);

  // Full period strings for tooltip display
  const periods = useMemo(
    () => filteredValues.map((v) => v.period),
    [filteredValues]
  );

  const isPercent = unit.toLowerCase().includes('%') || unit.toLowerCase().includes('porcentaje') || unit.toLowerCase().includes('tasa');
  const yUnit = isPercent ? '%' : '';
  const minVal = Math.min(...numericValues);
  const maxVal = Math.max(...numericValues, 1);
  const valRange = maxVal - Math.min(minVal, 0);
  const yStep = valRange > 200 ? 50 : valRange > 50 ? 10 : valRange > 10 ? 5 : valRange > 4 ? 2 : 1;
  const yMin = minVal < 0 ? Math.floor(minVal / yStep) * yStep : undefined;
  const hasIsoDates = filteredValues.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(filteredValues[0].period);
  const labelStep = hasIsoDates ? 1
    : filteredValues.length > 60 ? 12
    : filteredValues.length > 24 ? 6
    : filteredValues.length > 8 ? 3
    : 1;

  const series = [
    {
      values: numericValues,
      color: seriesColor(0),
      label: indicatorName,
    },
  ];

  const tableRows = [...filteredValues]
    .reverse()
    .map((v) => ({
      period: v.period,
      value: v.value != null ? v.value.toFixed(isPercent ? 2 : 1) : '—',
    }));

  if (allValues.length === 0) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-8 text-center">
        <p className="text-[var(--text-muted)]">
          No hay datos disponibles para este indicador.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Time range selector */}
      <div className="flex gap-[3px] mb-4">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setRange(opt.id)}
            className={`px-[14px] py-[6px] text-[13px] font-medium border rounded-md transition-all duration-150 ${
              range === opt.id
                ? 'bg-[var(--accent)] text-black border-[var(--accent)] font-semibold'
                : 'bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:bg-white/[0.04] hover:text-[var(--text-secondary)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 mb-6">
        <TimeSeries
          series={series}
          labels={labels}
          periods={periods}
          yUnit={yUnit}
          yStep={yStep}
          yMin={yMin}
          labelStep={labelStep}
          valueDecimals={isPercent ? 2 : 1}
        />
      </div>

      {/* Data table */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
          Datos historicos
        </h3>
        <div className="max-h-[400px] max-sm:max-h-[200px] overflow-y-auto">
          <DataTable
            columns={[
              { key: 'period', label: 'Periodo', align: 'left' },
              { key: 'value', label: `Valor (${unit || '—'})`, align: 'right' },
            ]}
            rows={tableRows}
          />
        </div>
      </div>

      {/* Source + Download */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <p className="text-xs text-[var(--text-muted)]">
          Fuente: {source}
        </p>
        <button className="px-4 py-2 text-[13px] font-medium border border-[var(--border)] rounded-lg text-[var(--text-secondary)] hover:bg-white/[0.04] hover:text-[var(--text-primary)] transition-all duration-150">
          Descargar CSV
        </button>
      </div>
    </>
  );
}
