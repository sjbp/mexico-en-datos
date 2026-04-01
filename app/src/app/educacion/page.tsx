import type { Metadata } from 'next';
import Breadcrumb from '@/components/ui/Breadcrumb';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Educación | México en Datos',
  description:
    'Indicadores educativos de México: matrícula escolar, tasas de deserción, resultados de pruebas estandarizadas, cobertura por nivel educativo y gasto en educación.',
};

const SUBSECTIONS = [
  {
    title: 'Matrícula y Cobertura',
    description:
      'Alumnos inscritos por nivel educativo, tasa de cobertura neta y bruta, y evolución histórica de la matrícula.',
  },
  {
    title: 'Calidad Educativa (PLANEA)',
    description:
      'Resultados de pruebas estandarizadas, porcentaje de alumnos en cada nivel de logro y comparativos por entidad.',
  },
  {
    title: 'Deserción Escolar',
    description:
      'Tasas de abandono escolar por nivel educativo, género y entidad federativa. Factores asociados a la deserción.',
  },
];

export default function EducacionPage() {
  return (
    <>
      <div className="pt-10 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Educación' },
          ]}
        />

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Educaci&oacute;n
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 max-w-[640px]">
          Indicadores educativos de M&eacute;xico: matr&iacute;cula escolar, tasas de
          deserci&oacute;n, resultados de pruebas estandarizadas, cobertura por nivel educativo
          y gasto en educaci&oacute;n.
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
              Estamos integrando datos de la SEP (Secretar&iacute;a de Educaci&oacute;n
              P&uacute;blica), la principal fuente de estad&iacute;sticas educativas en
              M&eacute;xico. Incluiremos series hist&oacute;ricas de matr&iacute;cula,
              indicadores de calidad y datos del Censo Educativo.
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
          Fuente: SEP, INEE/MEJOREDU, INEGI (Censo)
        </div>
      </div>
    </>
  );
}
