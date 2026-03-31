'use client';

import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import HBar from '@/components/charts/HBar';

interface InformalidadClientProps {
  sectorData: { label: string; value: number }[];
  ageData: { label: string; value: number }[];
  genderData: { label: string; value: number }[];
}

export default function InformalidadClient({
  sectorData,
  ageData,
  genderData,
}: InformalidadClientProps) {
  const pctFmt = (v: number) => v.toFixed(1) + '%';

  return (
    <>
      <SectionHeader title="Por sector econ&oacute;mico" />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <HBar data={sectorData} maxVal={100} valueFmt={pctFmt} />
          <div className="text-xs text-[var(--text-muted)] mt-3">
            Fuente: INEGI, ENOE (microdatos)
          </div>
        </Card>
      </div>

      <SectionHeader title="Por grupo de edad" />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <HBar data={ageData} maxVal={100} valueFmt={pctFmt} />
          <div className="text-xs text-[var(--text-muted)] mt-3">
            Fuente: INEGI, ENOE (microdatos)
          </div>
        </Card>
      </div>

      <SectionHeader title="Por g&eacute;nero" />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <HBar data={genderData} maxVal={100} valueFmt={pctFmt} />
          <div className="text-xs text-[var(--text-muted)] mt-3">
            Fuente: INEGI, ENOE (microdatos)
          </div>
        </Card>
      </div>
    </>
  );
}
