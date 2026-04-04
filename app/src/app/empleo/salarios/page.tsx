import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { getEmploymentByDimension } from '@/lib/data';
import SalariosClient from './SalariosClient';

export default async function SalariosPage() {
  const [sectorStats, educationStats, genderStats] = await Promise.all([
    getEmploymentByDimension('sector'),
    getEmploymentByDimension('education'),
    getEmploymentByDimension('gender'),
  ]);

  const hasMicrodata = sectorStats.length > 0;

  // Prepare chart data
  const sectorData = sectorStats
    .filter((s) => s.avg_monthly_income != null && Number(s.avg_monthly_income) > 0)
    .map((s) => ({ label: s.dimension_value, value: Number(s.avg_monthly_income) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15);

  const educationData = educationStats
    .filter((s) => s.avg_monthly_income != null && Number(s.avg_monthly_income) > 0)
    .map((s) => ({ label: s.dimension_value, value: Number(s.avg_monthly_income) }))
    .sort((a, b) => b.value - a.value);

  const genderData = genderStats
    .filter((s) => s.avg_monthly_income != null && Number(s.avg_monthly_income) > 0)
    .map((s) => ({ label: s.dimension_value, value: Number(s.avg_monthly_income) }));

  return (
    <>
      <div className="pt-10 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Empleo', href: '/empleo' },
            { label: 'Salarios' },
          ]}
        />

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Salarios e ingresos
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 max-w-[640px]">
          Distribuci&oacute;n de ingresos laborales en M&eacute;xico por sector
          econ&oacute;mico, nivel educativo y g&eacute;nero. Datos de la ENOE.
        </p>

        <div className="border-l-2 border-[var(--accent)] pl-4 mb-6 max-w-[700px]">
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)]" style={{ textWrap: 'pretty' }}>
            La distribuci&oacute;n salarial en M&eacute;xico es extremadamente desigual: el 10% mejor pagado gana m&aacute;s de 6 veces lo que gana el 10% con menor ingreso. La educaci&oacute;n es el principal elevador: un profesionista gana en promedio 2.5 veces m&aacute;s que alguien con solo secundaria. Aun as&iacute;, persiste una brecha de g&eacute;nero donde las mujeres ganan entre 15% y 20% menos que los hombres en posiciones equivalentes.
          </p>
        </div>
      </div>

      {hasMicrodata ? (
        <SalariosClient
          sectorData={sectorData}
          educationData={educationData}
          genderData={genderData}
        />
      ) : (
        <>
          {/* By sector */}
          <SectionHeader title="Ingreso promedio por sector" />
          <div className="px-[var(--pad-page)] mb-10">
            <Card large>
              <div className="py-6 text-center">
                <div className="text-base font-semibold text-white tracking-tight mb-2">
                  Datos detallados pr&oacute;ximamente
                </div>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[480px] mx-auto">
                  Ingreso mensual promedio por sector econ&oacute;mico.
                  Disponible al procesar los microdatos de la ENOE.
                </p>
              </div>
            </Card>
          </div>

          {/* By education */}
          <SectionHeader title="Ingreso promedio por nivel educativo" />
          <div className="px-[var(--pad-page)] mb-10">
            <Card large>
              <div className="py-6 text-center">
                <div className="text-base font-semibold text-white tracking-tight mb-2">
                  Datos detallados pr&oacute;ximamente
                </div>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[480px] mx-auto">
                  Ingreso mensual promedio por escolaridad.
                  Disponible pr&oacute;ximamente.
                </p>
              </div>
            </Card>
          </div>

          {/* By gender */}
          <SectionHeader title="Brecha salarial por g&eacute;nero" />
          <div className="px-[var(--pad-page)] mb-10">
            <Card large>
              <div className="py-6 text-center">
                <div className="text-base font-semibold text-white tracking-tight mb-2">
                  Datos detallados pr&oacute;ximamente
                </div>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[480px] mx-auto">
                  Comparaci&oacute;n de ingresos entre hombres y mujeres.
                  Disponible pr&oacute;ximamente.
                </p>
              </div>
            </Card>
          </div>
        </>
      )}

    </>
  );
}
