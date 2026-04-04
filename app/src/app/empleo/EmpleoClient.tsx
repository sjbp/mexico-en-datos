'use client';

import Card from '@/components/ui/Card';
import HBar from '@/components/charts/HBar';

interface EmpleoClientProps {
  sectorInformalityData: { label: string; value: number }[];
  latestQuarter?: string | null;
}

export default function EmpleoClient({ sectorInformalityData, latestQuarter }: EmpleoClientProps) {
  return (
    <Card large>
      <div className="mb-4">
        <div className="text-base font-semibold text-white tracking-tight">
          Tasa de informalidad por sector econ&oacute;mico
        </div>
        <div className="text-[13px] text-[var(--text-muted)] mt-1">
          Porcentaje de trabajadores informales por rama de actividad
          {latestQuarter && <span> &middot; Datos hasta: {latestQuarter}</span>}
        </div>
      </div>
      <HBar
        data={sectorInformalityData}
        maxVal={100}
        valueFmt={(v) => v.toFixed(1) + '%'}
      />
      <div className="text-xs text-[var(--text-muted)] mt-3">
        Fuente: INEGI, ENOE (microdatos)
      </div>
    </Card>
  );
}
