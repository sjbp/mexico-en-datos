'use client';

import TimeSeries from '@/components/charts/TimeSeries';

interface TrendData {
  years: string[];
  series: {
    cause: string;
    label: string;
    color: string;
    values: number[];
  }[];
}

export function MortalityTrendChart({ data }: { data: TrendData }) {
  if (!data.series.length || data.years.length < 2) return null;

  const series = data.series.map((s) => ({
    values: s.values,
    color: s.color,
    label: s.label,
  }));

  return (
    <TimeSeries
      series={series}
      labels={data.years}
      periods={data.years}
      yUnit=""
      yStep={20}
      labelStep={1}
      valueDecimals={0}
    />
  );
}

// ── Life Expectancy Chart ─────────────────────────────────────────────

interface SimpleTimeData {
  labels: string[];
  values: number[];
}

export function LifeExpectancyChart({ data }: { data: SimpleTimeData }) {
  if (data.values.length < 2) return null;

  const series = [
    {
      values: data.values,
      color: 'var(--accent)',
      label: 'Esperanza de vida',
    },
  ];

  return (
    <TimeSeries
      series={series}
      labels={data.labels}
      periods={data.labels}
      yUnit=" anos"
      yStep={1}
      labelStep={1}
      valueDecimals={1}
    />
  );
}

// ── Health Coverage Gap Chart ─────────────────────────────────────────

export function HealthCoverageGapChart({ data }: { data: SimpleTimeData }) {
  if (data.values.length < 2) return null;

  const series = [
    {
      values: data.values,
      color: '#EF4444',
      label: 'Sin acceso a salud',
    },
  ];

  return (
    <TimeSeries
      series={series}
      labels={data.labels}
      periods={data.labels}
      yUnit="%"
      yStep={5}
      labelStep={1}
      valueDecimals={1}
    />
  );
}
