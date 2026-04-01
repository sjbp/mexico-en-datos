import Link from 'next/link';
import type { Metadata } from 'next';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Card from '@/components/ui/Card';
import SectionHeader from '@/components/ui/SectionHeader';

export const metadata: Metadata = {
  title: 'Cobertura de Salud | M\u00e9xico en Datos',
  description:
    'Cobertura de servicios de salud en M\u00e9xico: IMSS, ISSSTE, IMSS-Bienestar y acceso a servicios de salud.',
};

const COVERAGE_TIMELINE = [
  { period: '2004-2019', program: 'Seguro Popular', description: 'Programa de cobertura universal. Lleg\u00f3 a cubrir ~53 millones de personas.' },
  { period: '2020-2023', program: 'INSABI', description: 'Reemplaz\u00f3 al Seguro Popular. Enfrent\u00f3 problemas operativos y de financiamiento.' },
  { period: '2023-presente', program: 'IMSS-Bienestar', description: 'Absorbi\u00f3 las funciones de INSABI. Busca integrar servicios de salud para poblaci\u00f3n sin seguridad social.' },
];

const INSTITUTIONS = [
  { name: 'IMSS', population: '~63 millones', description: 'Trabajadores formales del sector privado y sus familias.' },
  { name: 'ISSSTE', population: '~13 millones', description: 'Trabajadores del gobierno federal y sus familias.' },
  { name: 'IMSS-Bienestar', population: '~53 millones', description: 'Poblaci\u00f3n sin seguridad social (antes Seguro Popular / INSABI).' },
  { name: 'PEMEX / SEDENA / SEMAR', population: '~2 millones', description: 'Trabajadores de Pemex, Ej\u00e9rcito y Marina.' },
  { name: 'Privado', population: 'Variable', description: 'Seguros m\u00e9dicos privados. ~5-7% de la poblaci\u00f3n.' },
];

export default function CoberturaPage() {
  return (
    <>
      <div className="px-[var(--pad-page)] pt-10 pb-6">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Salud', href: '/salud' },
            { label: 'Cobertura' },
          ]}
        />
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Cobertura de salud
        </h1>
        <p className="text-[var(--text-secondary)] text-base leading-relaxed max-w-[640px]">
          M&eacute;xico tiene un sistema de salud fragmentado: IMSS para trabajadores formales,
          ISSSTE para gobierno, e IMSS-Bienestar para quienes no tienen seguridad social.
          Seg&uacute;n CONEVAL, el 39.1% de la poblaci&oacute;n tiene carencia por acceso a servicios
          de salud (2022).
        </p>
      </div>

      {/* Transition timeline */}
      <SectionHeader title="Transici\u00f3n del sistema" />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <div className="mb-4">
            <div className="text-base font-semibold text-white tracking-tight">
              La cobertura universal en M&eacute;xico: una historia de cambios
            </div>
            <div className="text-[13px] text-[var(--text-muted)] mt-1">
              Seguro Popular &rarr; INSABI &rarr; IMSS-Bienestar
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {COVERAGE_TIMELINE.map((item) => (
              <div key={item.period} className="flex gap-4">
                <div className="w-[120px] shrink-0 text-xs font-mono text-[var(--accent)]">
                  {item.period}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{item.program}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Institutions breakdown */}
      <SectionHeader title="Instituciones de salud" />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <div className="flex flex-col gap-4">
            {INSTITUTIONS.map((inst) => (
              <div key={inst.name} className="flex items-start gap-4">
                <div className="w-[160px] shrink-0">
                  <div className="text-sm font-semibold text-white">{inst.name}</div>
                  <div className="text-xs text-[var(--accent)]">{inst.population}</div>
                </div>
                <div className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {inst.description}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Coverage stats placeholder */}
      <SectionHeader title="Indicadores de cobertura" />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <div className="py-6 text-center">
            <p className="text-[var(--text-muted)] text-sm">
              Series de tiempo de cobertura IMSS, carencia por acceso a salud (CONEVAL),
              y esperanza de vida (CONAPO) pr&oacute;ximamente.
            </p>
          </div>
        </Card>
      </div>

      {/* Attribution */}
      <div className="px-[var(--pad-page)] mb-10">
        <div className="text-xs text-[var(--text-muted)] leading-relaxed">
          Fuentes: IMSS (Datos Abiertos), CONEVAL, CONAPO (Proyecciones de Poblaci&oacute;n)
        </div>
      </div>

    </>
  );
}
