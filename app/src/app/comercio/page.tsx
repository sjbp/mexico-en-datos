import type { Metadata } from 'next';
import Breadcrumb from '@/components/ui/Breadcrumb';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import { getLatestValue } from '@/lib/data';
import { fmtNum } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Comercio y Manufactura | México en Datos',
  description:
    'Exportaciones, importaciones, inversión extranjera directa, industria manufacturera y el fenómeno del nearshoring en México.',
};

const SUBSECTIONS = [
  {
    title: 'Nearshoring e IED',
    description:
      'Inversión extranjera directa por país de origen y sector, tendencias de nearshoring y nuevas plantas anunciadas.',
  },
  {
    title: 'Industria Manufacturera',
    description:
      'Producción manufacturera, empleo en el sector, IMMEX y valor agregado de exportación.',
  },
  {
    title: 'Socios Comerciales',
    description:
      'Principales socios comerciales de México: Estados Unidos, China, Canadá. Composición por tipo de bien.',
  },
];

export default async function ComercioPage() {
  const [exports, imports] = await Promise.all([
    getLatestValue('127598'),
    getLatestValue('127601'),
  ]);

  return (
    <>
      <div className="pt-10 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Comercio y Manufactura' },
          ]}
        />

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Comercio y Manufactura
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 max-w-[640px]">
          Exportaciones, importaciones, inversi&oacute;n extranjera directa, industria
          manufacturera y el fen&oacute;meno del nearshoring en M&eacute;xico.
        </p>

        {/* Headline stats from real trade data */}
        <div className="grid grid-cols-2 gap-3 mb-10">
          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Exportaciones totales
            </div>
            <div className="text-[28px] font-bold tracking-tight leading-none tabular-nums text-[var(--accent)]">
              {exports.latest?.value != null
                ? '$' + fmtNum(Number(exports.latest.value), 0)
                : '\u2014'}
            </div>
            {exports.latest?.period && (
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {exports.latest.period} &middot; millones de d&oacute;lares
              </div>
            )}
          </Card>

          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Importaciones totales
            </div>
            <div className="text-[28px] font-bold tracking-tight leading-none tabular-nums text-[var(--accent)]">
              {imports.latest?.value != null
                ? '$' + fmtNum(Number(imports.latest.value), 0)
                : '\u2014'}
            </div>
            {imports.latest?.period && (
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {imports.latest.period} &middot; millones de d&oacute;lares
              </div>
            )}
          </Card>
        </div>
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
          Fuente: INEGI (Balanza Comercial), SE, Banxico
        </div>
      </div>
    </>
  );
}
