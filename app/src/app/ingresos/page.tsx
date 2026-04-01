import type { Metadata } from 'next';
import Breadcrumb from '@/components/ui/Breadcrumb';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Ingresos y Pobreza | México en Datos',
  description:
    'Distribución del ingreso, gasto de los hogares, pobreza multidimensional, líneas de bienestar y desigualdad en México.',
};

const SUBSECTIONS = [
  {
    title: 'Distribución del Ingreso',
    description:
      'Deciles de ingreso, coeficiente de Gini, brecha salarial y evolución de la desigualdad en México.',
  },
  {
    title: 'Pobreza Multidimensional',
    description:
      'Medición CONEVAL: pobreza por ingresos, carencias sociales, pobreza extrema y vulnerabilidad por entidad.',
  },
  {
    title: 'Gasto de los Hogares',
    description:
      'Estructura del gasto familiar por rubro: alimentos, vivienda, salud, educación y transporte (ENIGH).',
  },
];

export default function IngresosPage() {
  return (
    <>
      <div className="pt-10 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Ingresos y Pobreza' },
          ]}
        />

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Ingresos y Pobreza
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 max-w-[640px]">
          Distribuci&oacute;n del ingreso, gasto de los hogares, pobreza multidimensional,
          l&iacute;neas de bienestar y desigualdad en M&eacute;xico.
        </p>
      </div>

      {/* Coming soon notice */}
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <div className="py-6 text-center">
            <div className="text-base font-semibold text-white tracking-tight mb-2">
              Datos pr&oacute;ximamente
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[480px] mx-auto">
              Estamos integrando datos de la ENIGH (Encuesta Nacional de Ingresos y Gastos
              de los Hogares), encuesta bienal del INEGI, junto con la metodolog&iacute;a de
              medici&oacute;n multidimensional de pobreza del CONEVAL.
            </p>
          </div>
        </Card>
      </div>

      {/* Sub-section placeholders */}
      <SectionHeader title="Secciones planeadas" />
      <div className="px-[var(--pad-page)] mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SUBSECTIONS.map((section) => (
            <Card key={section.title} large>
              <div className="text-base font-semibold text-white tracking-tight mb-1">
                {section.title}
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {section.description}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Attribution */}
      <div className="px-[var(--pad-page)] mb-10">
        <div className="text-xs text-[var(--text-muted)] leading-relaxed">
          Fuente: INEGI (ENIGH), CONEVAL
        </div>
      </div>
    </>
  );
}
