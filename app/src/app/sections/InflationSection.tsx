'use client';

import { useState, useMemo } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import TimeSeries from '@/components/charts/TimeSeries';
import type { IndicatorValue } from '@/lib/types';

interface InflationSectionProps {
  inflationValues: IndicatorValue[];
}

function buildLabelsFromValues(values: IndicatorValue[]): string[] {
  return values.map((v, i) => {
    const date = new Date(v.period_date);
    const month = date.getMonth();
    // Show year label at January
    if (month === 0 || i === 0) {
      return String(date.getFullYear());
    }
    return '';
  });
}

export default function InflationSection({ inflationValues }: InflationSectionProps) {
  const hasData = inflationValues.length > 0;

  const values = useMemo(
    () => inflationValues.map((v) => (v.value != null ? Number(v.value) : 0)),
    [inflationValues]
  );

  const labels = useMemo(
    () => (hasData ? buildLabelsFromValues(inflationValues) : []),
    [inflationValues, hasData]
  );

  if (!hasData) {
    return null;
  }

  const latestVal = values[values.length - 1];
  const firstDate = new Date(inflationValues[0].period_date);
  const lastDate = new Date(inflationValues[inflationValues.length - 1].period_date);
  const dateRange = `${firstDate.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })} – ${lastDate.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}`;

  // Compute appropriate yStep based on data range
  const maxVal = Math.max(...values);
  const yStep = maxVal > 200 ? 50 : maxVal > 50 ? 10 : maxVal > 10 ? 5 : 2;
  // Labels are sparse (only at year boundaries), so labelStep=1 shows all of them correctly.
  const labelStep = 1;

  // Determine unit based on values (index values are typically > 50)
  const isIndex = maxVal > 50;
  const yUnit = isIndex ? '' : '%';

  return (
    <>
      <SectionHeader title="Precios" linkText="Explorar indicador" linkHref="/indicador/628194" />
      <div className="px-[var(--pad-page)] mb-12">
        <Card large>
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div>
              <div className="text-base font-semibold text-white tracking-tight">
                Indice Nacional de Precios al Consumidor (INPC)
              </div>
              <div className="text-[13px] text-[var(--text-muted)] mt-1">
                {dateRange} &middot; Ultimo valor: {latestVal.toFixed(2)}
              </div>
            </div>
          </div>
          <TimeSeries
            series={[{ values, color: '#FF9F43', label: 'INPC General' }]}
            labels={labels}
            yUnit={yUnit}
            yStep={yStep}
            labelStep={labelStep}
            valueDecimals={2}
          />
          <div className="text-xs text-[var(--text-muted)] mt-3">
            Fuente: INEGI, Indice Nacional de Precios al Consumidor
          </div>
        </Card>
      </div>
    </>
  );
}
