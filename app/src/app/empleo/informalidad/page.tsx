import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { getLatestValue, getEmploymentByDimension } from '@/lib/data';
import { fmtPct } from '@/lib/format';
import InformalidadClient from './InformalidadClient';

export default async function InformalidadPage() {
  const [informality, sectorStats, ageStats, genderStats] = await Promise.all([
    getLatestValue('444793'),
    getEmploymentByDimension('sector'),
    getEmploymentByDimension('age_group'),
    getEmploymentByDimension('gender'),
  ]);
  const hasMicrodata = sectorStats.length > 0;

  // Prepare chart data
  const sectorData = sectorStats
    .filter((s) => s.informality_rate != null)
    .map((s) => ({ label: s.dimension_value, value: Number(s.informality_rate) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  const ageData = ageStats
    .filter((s) => s.informality_rate != null)
    .map((s) => ({ label: s.dimension_value, value: Number(s.informality_rate) }));

  const genderData = genderStats
    .filter((s) => s.informality_rate != null)
    .map((s) => ({ label: s.dimension_value, value: Number(s.informality_rate) }));

  return (
    <>
      <div className="pt-10 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Empleo', href: '/empleo' },
            { label: 'Informalidad' },
          ]}
        />

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Informalidad laboral
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6 max-w-[640px]">
          An&aacute;lisis de la informalidad laboral en M&eacute;xico por sector,
          grupo de edad, g&eacute;nero y entidad federativa.
        </p>

        {/* Headline */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 mb-8 inline-flex items-baseline gap-4">
          <span className="text-[36px] font-bold tabular-nums text-[var(--accent)] leading-none">
            {informality?.latest?.value != null
              ? fmtPct(Number(informality.latest.value))
              : '\u2014'}
          </span>
          <span className="text-sm text-[var(--text-muted)]">
            Tasa de informalidad nacional
            {informality?.latest?.period ? ` (${informality.latest.period})` : ''}
          </span>
        </div>
      </div>

      {hasMicrodata ? (
        <InformalidadClient
          sectorData={sectorData}
          ageData={ageData}
          genderData={genderData}
        />
      ) : (
        <>
          {/* By sector */}
          <SectionHeader title="Por sector econ&oacute;mico" />
          <div className="px-[var(--pad-page)] mb-10">
            <Card large>
              <div className="py-6 text-center">
                <div className="text-base font-semibold text-white tracking-tight mb-2">
                  Datos detallados pr&oacute;ximamente
                </div>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[480px] mx-auto">
                  El desglose de informalidad por sector estar&aacute; disponible
                  al procesar los microdatos de la ENOE.
                </p>
              </div>
            </Card>
          </div>

          {/* By age group */}
          <SectionHeader title="Por grupo de edad" />
          <div className="px-[var(--pad-page)] mb-10">
            <Card large>
              <div className="py-6 text-center">
                <div className="text-base font-semibold text-white tracking-tight mb-2">
                  Datos detallados pr&oacute;ximamente
                </div>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[480px] mx-auto">
                  Informalidad por grupo de edad. Disponible pr&oacute;ximamente.
                </p>
              </div>
            </Card>
          </div>

          {/* By gender */}
          <SectionHeader title="Por g&eacute;nero" />
          <div className="px-[var(--pad-page)] mb-10">
            <Card large>
              <div className="py-6 text-center">
                <div className="text-base font-semibold text-white tracking-tight mb-2">
                  Datos detallados pr&oacute;ximamente
                </div>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[480px] mx-auto">
                  Informalidad por g&eacute;nero. Disponible pr&oacute;ximamente.
                </p>
              </div>
            </Card>
          </div>

          {/* Time series */}
          <SectionHeader title="Tendencia hist&oacute;rica" />
          <div className="px-[var(--pad-page)] mb-12">
            <Card large>
              <div className="py-6 text-center">
                <div className="text-base font-semibold text-white tracking-tight mb-2">
                  Datos detallados pr&oacute;ximamente
                </div>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[480px] mx-auto">
                  Serie de tiempo de la tasa de informalidad. Disponible pr&oacute;ximamente.
                </p>
              </div>
            </Card>
          </div>
        </>
      )}

    </>
  );
}
