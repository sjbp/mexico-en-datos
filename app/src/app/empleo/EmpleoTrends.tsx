'use client';

import Card from '@/components/ui/Card';
import TimeSeries from '@/components/charts/TimeSeries';

interface EmpleoTrendsProps {
  trends: {
    quarters: string[];
    informality: (number | null)[];
    avgIncome: (number | null)[];
  };
}

export default function EmpleoTrends({ trends }: EmpleoTrendsProps) {
  const labels = trends.quarters;

  const informalitySeries = [
    {
      values: trends.informality.map((v) => v ?? 0),
      color: '#60a5fa',
      label: 'Tasa de informalidad laboral',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card large>
        <div className="mb-4">
          <div className="text-base font-semibold text-white tracking-tight">
            Informalidad laboral
          </div>
          <div className="text-[13px] text-[var(--text-muted)] mt-1">
            % de trabajadores sin seguridad social
          </div>
        </div>
        <div style={{ height: 220 }}>
          <TimeSeries
            series={informalitySeries}
            labels={labels}
            periods={labels}
            yUnit="%"
            yStep={10}
            labelStep={1}
            valueDecimals={1}
          />
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-3">
          Fuente: INEGI, ENOE (microdatos)
        </div>
      </Card>

      <Card large>
        <div className="mb-4">
          <div className="text-base font-semibold text-white tracking-tight">
            Ingreso mensual promedio
          </div>
          <div className="text-[13px] text-[var(--text-muted)] mt-1">
            Pesos por mes (trabajadores ocupados)
          </div>
        </div>
        <div style={{ height: 220 }}>
          <TimeSeries
            series={[
              {
                values: trends.avgIncome.map((v) => v ?? 0),
                color: '#34d399',
                label: 'Ingreso mensual promedio',
              },
            ]}
            labels={labels}
            periods={labels}
            yUnit=""
            yStep={2000}
            labelStep={1}
            valueDecimals={0}
          />
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-3">
          Fuente: INEGI, ENOE (microdatos)
        </div>
      </Card>
    </div>
  );
}
