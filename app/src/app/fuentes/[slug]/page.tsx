import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Breadcrumb from '@/components/ui/Breadcrumb';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ExploradorClient from '@/app/explorador/ExploradorClient';
import { SOURCES } from '@/lib/sources';
import { getIndicators, getTopicsWithCounts } from '@/lib/data';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return SOURCES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const source = SOURCES.find((s) => s.slug === slug);
  if (!source) return { title: 'Fuente no encontrada | M\u00e9xico en Datos' };
  return {
    title: `${source.name}`,
    description: source.description,
    alternates: { canonical: `/fuentes/${slug}` },
  };
}

/** Map source slug to the `source` column value in the indicators table. */
const INDICATOR_SOURCE_FILTER: Record<string, string> = {
  inegi: 'BIE-BISE',
  banxico: 'banxico',
  sesnsp: 'SESNSP',
};

/** Sources whose data lives in domain tables (not indicators/indicator_values). */
const DOMAIN_TABLE_SOURCES: Record<string, { description: string; linkText: string; linkHref: string }[]> = {
  enoe: [
    { description: 'Informalidad, desempleo, subocupaci\u00f3n e ingreso por sector, edad, g\u00e9nero y educaci\u00f3n.', linkText: 'Ir a Empleo', linkHref: '/empleo' },
    { description: 'Tendencias trimestrales de informalidad e ingreso promedio.', linkText: 'Informalidad por sector', linkHref: '/empleo/informalidad' },
    { description: 'Salarios por sector, nivel educativo y g\u00e9nero.', linkText: 'Salarios', linkHref: '/empleo/salarios' },
  ],
  envipe: [
    { description: 'Cifra negra, victimizaci\u00f3n por delito, tasa de denuncia y confianza institucional.', linkText: 'Ir a Seguridad', linkHref: '/seguridad' },
  ],
  salud: [
    { description: 'Principales causas de muerte por grupo CIE-10, con tasas por 100 mil habitantes.', linkText: 'Mortalidad', linkHref: '/salud' },
    { description: 'Cat\u00e1logo de establecimientos de salud (CLUES) con ubicaci\u00f3n geogr\u00e1fica.', linkText: 'Infraestructura de salud', linkHref: '/salud' },
  ],
  ensanut: [
    { description: 'Prevalencia de obesidad, diabetes e hipertensi\u00f3n por estado, edad y sexo.', linkText: 'Ir a Salud', linkHref: '/salud' },
  ],
};

export default async function FuenteDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const source = SOURCES.find((s) => s.slug === slug);
  if (!source) notFound();

  // Load indicator data for sources that use the indicators table
  const sourceFilter = INDICATOR_SOURCE_FILTER[slug];
  let indicators: Awaited<ReturnType<typeof getIndicators>> = [];
  let topics: Awaited<ReturnType<typeof getTopicsWithCounts>> = [];

  if (sourceFilter) {
    [indicators, topics] = await Promise.all([
      getIndicators(),
      getTopicsWithCounts(),
    ]);
    indicators = indicators.filter((i) => i.source === sourceFilter);
  }

  const domainLinks = DOMAIN_TABLE_SOURCES[slug];

  return (
    <>
      <div className="pt-10 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Fuentes', href: '/fuentes' },
            { label: source.name },
          ]}
        />

        <div className="flex items-start gap-3 mb-2">
          <span className="text-3xl leading-none">{source.icon}</span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {source.name}
            </h1>
            <div className="text-sm text-[var(--text-muted)] mt-1">
              {source.fullName}
            </div>
          </div>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-2 max-w-[640px]">
          {source.description}
        </p>
        <div className="flex items-center gap-3 mb-8">
          {source.status === 'active' ? (
            <Badge label={source.datasets} />
          ) : (
            <Badge label="Pr\u00f3ximamente" color="rgba(255,255,255,0.3)" />
          )}
          <span className="text-xs text-[var(--text-muted)]">
            Actualizaci&oacute;n: {source.updateFreq}
          </span>
        </div>
      </div>

      {/* Indicator-based sources: show filterable explorer */}
      {indicators.length > 0 && (
        <>
          <SectionHeader title="Indicadores disponibles" />
          <ExploradorClient indicators={indicators} topics={topics} />
        </>
      )}

      {/* Domain-table sources: show links to relevant pages */}
      {domainLinks && (
        <div className="px-[var(--pad-page)] mb-10">
          <SectionHeader title="Datos disponibles" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {domainLinks.map((dl) => (
              <Link key={dl.linkHref + dl.linkText} href={dl.linkHref} className="block no-underline text-inherit">
                <Card interactive>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
                    {dl.description}
                  </p>
                  <span className="text-sm text-[var(--accent)]">
                    {dl.linkText} &rarr;
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Coming soon sources */}
      {source.status === 'coming' && (
        <div className="px-[var(--pad-page)] mb-10">
          <Card large>
            <div className="py-6 text-center">
              <div className="text-base font-semibold text-white tracking-tight mb-2">
                Integraci&oacute;n pr&oacute;ximamente
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[480px] mx-auto">
                Estamos trabajando en la integraci&oacute;n de datos de {source.fullName}.
              </p>
            </div>
          </Card>

          {source.plannedDatasets && source.plannedDatasets.length > 0 && (
            <div className="mt-6">
              <div className="text-xs font-semibold text-[var(--text-secondary)] mb-3">Datasets planeados</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {source.plannedDatasets.map((ds) => (
                  <Card key={ds}>
                    <div className="text-sm font-medium text-white">{ds}</div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* External link */}
      <div className="px-[var(--pad-page)] mb-10">
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--accent)] underline decoration-[var(--accent)]/30 underline-offset-[2.5px] hover:decoration-[var(--accent)] transition-colors"
        >
          Visitar {source.name} &rarr;
        </a>
      </div>
    </>
  );
}
