'use client';

import Card from '@/components/ui/Card';
import TimeSeries from '@/components/charts/TimeSeries';

interface TradePoint {
  period: string;
  value: number | null;
}

interface ComercioClientProps {
  exportValues: TradePoint[];
  importValues: TradePoint[];
}

export default function ComercioClient({ exportValues, importValues }: ComercioClientProps) {
  // Align series: use whichever has fewer points as the length
  const len = Math.min(exportValues.length, importValues.length);
  const exSlice = exportValues.slice(exportValues.length - len);
  const imSlice = importValues.slice(importValues.length - len);

  const labels = exSlice.map((p) => {
    // Show only year from period like "2024/01"
    const parts = p.period.split('/');
    return parts.length > 1 ? parts[0].slice(2) : p.period;
  });

  const periods = exSlice.map((p) => p.period);

  const series = [
    {
      values: exSlice.map((p) => (p.value != null ? Number(p.value) : 0)),
      color: '#FF9F43',
      label: 'Exportaciones (MDD)',
    },
    {
      values: imSlice.map((p) => (p.value != null ? Number(p.value) : 0)),
      color: '#a592d5',
      label: 'Importaciones (MDD)',
    },
  ];

  // Compute a sensible yStep based on data range
  const allVals = [...series[0].values, ...series[1].values];
  const maxVal = Math.max(...allVals);
  const yStep = maxVal > 50000 ? 10000 : maxVal > 10000 ? 5000 : 1000;

  return (
    <Card large>
      <div className="mb-4">
        <div className="text-base font-semibold text-white tracking-tight">
          Exportaciones e importaciones de M&eacute;xico
        </div>
        <div className="text-[13px] text-[var(--text-muted)] mt-1">
          &Uacute;ltimos 60 meses, millones de d&oacute;lares
          {periods.length > 0 && <span> &middot; Datos hasta: {periods[periods.length - 1]}</span>}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-3">
        {series.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-[3px] rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-[11px] text-[var(--text-muted)]">{s.label}</span>
          </div>
        ))}
      </div>

      <TimeSeries
        series={series}
        labels={labels}
        periods={periods}
        yUnit=""
        yStep={yStep}
        labelStep={12}
        valueDecimals={0}
      />

      <div className="text-xs text-[var(--text-muted)] mt-3">
        Fuente: INEGI, Balanza Comercial de Mercanc&iacute;as
      </div>
    </Card>
  );
}
