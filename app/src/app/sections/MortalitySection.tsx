import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import HBar from '@/components/charts/HBar';

const LEADING_CAUSES = [
  { label: 'Enf. del coraz\u00f3n', value: 156.0, color: '#E74C3C' },
  { label: 'Diabetes mellitus', value: 102.0, color: '#F39C12' },
  { label: 'Tumores malignos', value: 73.0, color: '#9B59B6' },
  { label: 'Enf. del h\u00edgado', value: 41.0, color: '#E67E22' },
  { label: 'Cerebrovascular', value: 33.0, color: '#3498DB' },
  { label: 'Homicidios', value: 25.0, color: '#E74C3C' },
];

export default function MortalitySection() {
  return (
    <>
      <SectionHeader
        title="Salud"
        linkText="Explorar salud"
        linkHref="/salud"
      />
      <div className="px-[var(--pad-page)] mb-12">
        <Card large>
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div>
              <div className="text-base font-semibold text-white tracking-tight">
                Principales causas de muerte
              </div>
              <div className="text-[13px] text-[var(--text-muted)] mt-1">
                Tasa por cada 100,000 habitantes &middot; Nacional, 2023 est.
              </div>
            </div>
          </div>
          <HBar
            data={LEADING_CAUSES}
            valueFmt={(v: number) => v.toFixed(0)}
          />
          <div className="text-xs text-[var(--text-muted)] mt-4">
            Datos 2023 estimados. Serie hist&oacute;rica pr&oacute;ximamente.
            <span className="mx-1">&middot;</span>
            Fuentes: INEGI (Estad&iacute;sticas de Mortalidad), CONAPO
          </div>
        </Card>
      </div>
    </>
  );
}
