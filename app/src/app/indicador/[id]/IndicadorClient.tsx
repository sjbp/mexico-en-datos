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
  { id: '1a', label: '1A', months: 12 },
  { id: '5a', label: '5A', months: 60 },
  { id: '10a', label: '10A', months: 120 },
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
    return allValues.filter(
      (v) => new Date(v.period_date) >= cutoffDate
    );
  }, [allValues, rangeConfig.months]);

  const numericValues = useMemo(
    () => filteredValues.map((v) => v.value ?? 0),
    [filteredValues]
  );

  const labels = useMemo(() => {
    return filteredValues.map((v, i) => {
      // Use period string directly for readable labels
      const p = v.period;
      const date = new Date(v.period_date);
      const year = date.getFullYear();
      const month = date.getMonth();

      // First point always gets a label
      if (i === 0) return p.includes('Q') ? `${year} ${p.split('/')[1]}` : String(year);

      // Quarterly: show every quarter
      if (frequency === 'quarterly') {
        return p.includes('Q') ? `${year} ${p.split('/')[1]}` : String(year);
      }

      // Monthly/biweekly: show year at January
      if (month === 0) return String(year);

      return '';
    });
  }, [filteredValues, frequency]);

  // Full period strings for tooltip display
  const periods = useMemo(
    () => filteredValues.map((v) => v.period),
    [filteredValues]
  );

  const isPercent = unit.toLowerCase().includes('%') || unit.toLowerCase().includes('porcentaje') || unit.toLowerCase().includes('tasa');
  const yUnit = isPercent ? '%' : '';
  const maxVal = Math.max(...numericValues, 1);
  const yStep = maxVal > 200 ? 50 : maxVal > 50 ? 10 : maxVal > 10 ? 5 : 1;
  const labelStep = filteredValues.length > 60 ? 12 : filteredValues.length > 24 ? 6 : 3;

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
          labelStep={labelStep}
          valueDecimals={isPercent ? 2 : 1}
        />
      </div>

      {/* Data table */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
          Datos historicos
        </h3>
        <div className="max-h-[400px] overflow-y-auto">
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
