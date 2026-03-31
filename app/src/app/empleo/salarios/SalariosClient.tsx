'use client';

import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import HBar from '@/components/charts/HBar';

interface SalariosClientProps {
  sectorData: { label: string; value: number }[];
  educationData: { label: string; value: number }[];
  genderData: { label: string; value: number }[];
}

export default function SalariosClient({
  sectorData,
  educationData,
  genderData,
}: SalariosClientProps) {
  const currFmt = (v: number) => {
    if (v >= 1000) return '$' + (v / 1000).toFixed(1) + 'K';
    return '$' + v.toFixed(0);
  };

  return (
    <>
      <SectionHeader title="Ingreso promedio por sector" />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <HBar data={sectorData} valueFmt={currFmt} />
          <div className="text-xs text-[var(--text-muted)] mt-3">
            Ingreso mensual estimado (pesos). Fuente: INEGI, ENOE (microdatos)
          </div>
        </Card>
      </div>

      <SectionHeader title="Ingreso promedio por nivel educativo" />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <HBar data={educationData} valueFmt={currFmt} />
          <div className="text-xs text-[var(--text-muted)] mt-3">
            Ingreso mensual estimado (pesos). Fuente: INEGI, ENOE (microdatos)
          </div>
        </Card>
      </div>

      <SectionHeader title="Brecha salarial por g&eacute;nero" />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <HBar data={genderData} valueFmt={currFmt} />
          <div className="text-xs text-[var(--text-muted)] mt-3">
            Ingreso mensual estimado (pesos). Fuente: INEGI, ENOE (microdatos)
          </div>
        </Card>
      </div>
    </>
  );
}
