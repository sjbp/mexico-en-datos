import type { Metadata } from 'next';
import Breadcrumb from '@/components/ui/Breadcrumb';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Población | México en Datos',
  description:
    'Demografía de México: estructura poblacional, pirámides de edad, migración, vivienda y resultados del Censo 2020.',
};

const SUBSECTIONS = [
  {
    title: 'Estructura Poblacional',
    description:
      'Población total por entidad, grupos de edad, razón de dependencia y bono demográfico.',
  },
  {
    title: 'Migración',
    description:
      'Migración interna e internacional, remesas, población nacida en otro país y flujos migratorios.',
  },
  {
    title: 'Vivienda',
    description:
      'Características de las viviendas: materiales, servicios básicos, hacinamiento y tenencia.',
  },
  {
    title: 'Pirámides de Edad',
    description:
      'Distribución por edad y sexo a nivel nacional y estatal. Comparativos 2010 vs 2020.',
  },
];

export default function PoblacionPage() {
  return (
    <>
      <div className="pt-10 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Población' },
          ]}
        />

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Poblaci&oacute;n
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 max-w-[640px]">
          Demograf&iacute;a de M&eacute;xico: estructura poblacional, pir&aacute;mides de
          edad, migraci&oacute;n, vivienda y resultados del Censo 2020.
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
              Estamos integrando los resultados del Censo de Poblaci&oacute;n y Vivienda 2020
              del INEGI, complementados con las proyecciones de poblaci&oacute;n del CONAPO.
              Incluiremos desgloses por entidad, municipio, edad y sexo.
            </p>
          </div>
        </Card>
      </div>

      {/* Sub-section placeholders */}
      <SectionHeader title="Secciones planeadas" />
      <div className="px-[var(--pad-page)] mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          Fuente: INEGI (Censo 2020), CONAPO
        </div>
      </div>
    </>
  );
}
