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
