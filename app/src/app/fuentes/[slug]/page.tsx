import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
  if (!source) return { title: 'Fuente no encontrada | México en Datos' };
  return {
    title: `${source.name} | Fuentes | México en Datos`,
    description: source.description,
  };
}

export default async function FuenteDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const source = SOURCES.find((s) => s.slug === slug);
  if (!source) notFound();

  // For active sources with indicator data, load indicators
  let indicators: Awaited<ReturnType<typeof getIndicators>> = [];
  let topics: Awaited<ReturnType<typeof getTopicsWithCounts>> = [];
  if (source.status === 'active') {
    [indicators, topics] = await Promise.all([
      getIndicators(),
      getTopicsWithCounts(),
    ]);
    // Filter indicators by source for specific source pages
    if (source.slug === 'banxico') {
      indicators = indicators.filter((i) => i.source === 'banxico');
    } else if (source.slug === 'inegi') {
      indicators = indicators.filter((i) => i.source === 'BIE-BISE');
    }
  }

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
            <Badge label="Próximamente" color="rgba(255,255,255,0.3)" />
          )}
          <span className="text-xs text-[var(--text-muted)]">
            Actualización: {source.updateFreq}
          </span>
        </div>
      </div>

      {source.status === 'active' && indicators.length > 0 ? (
        <>
          <SectionHeader title="Indicadores disponibles" />
          <ExploradorClient indicators={indicators} topics={topics} />

          <div className="px-[var(--pad-page)] mt-10 mb-10">
            <Card large>
              <div className="text-base font-semibold text-white tracking-tight mb-2">
                Metodolog&iacute;a y actualizaci&oacute;n
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Los indicadores se obtienen del API del Banco de Indicadores del INEGI
                (BIE). La frecuencia de actualizaci&oacute;n var&iacute;a por indicador:
                quincenal para precios al consumidor, mensual para empleo y producci&oacute;n,
                trimestral para PIB y balanza comercial, y anual para censos.
                Los datos se sincronizan autom&aacute;ticamente.
              </p>
            </Card>
          </div>
        </>
      ) : (
        <>
          {/* Coming soon for non-active sources */}
          <div className="px-[var(--pad-page)] mb-10">
            <Card large>
              <div className="py-6 text-center">
                <div className="text-base font-semibold text-white tracking-tight mb-2">
                  Integraci&oacute;n pr&oacute;ximamente
                </div>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[480px] mx-auto">
                  Estamos trabajando en la integraci&oacute;n de datos de {source.fullName}.
                  Pronto podr&aacute;s explorar estos indicadores directamente en
                  M&eacute;xico en Datos.
                </p>
              </div>
            </Card>
          </div>

          {source.plannedDatasets && source.plannedDatasets.length > 0 && (
            <>
              <SectionHeader title="Datasets planeados" />
              <div className="px-[var(--pad-page)] mb-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {source.plannedDatasets.map((ds) => (
                    <Card key={ds}>
                      <div className="text-sm font-medium text-white">{ds}</div>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

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
      )}
    </>
  );
}
