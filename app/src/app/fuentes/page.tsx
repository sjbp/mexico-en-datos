import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { SOURCES } from '@/lib/sources';

export const metadata: Metadata = {
  title: 'Fuentes de Datos | México en Datos',
  description:
    'Accede directamente a los datos de las principales instituciones estadísticas de México.',
  alternates: { canonical: '/fuentes' },
};

export default function FuentesPage() {
  return (
    <>
      <div className="pt-10 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Fuentes de Datos' },
          ]}
        />

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Fuentes de Datos
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 max-w-[640px]">
          Accede directamente a los datos de las principales instituciones
          estad&iacute;sticas de M&eacute;xico.
        </p>
      </div>

      <div className="px-[var(--pad-page)] mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SOURCES.map((source) => (
            <Link
              key={source.slug}
              href={`/fuentes/${source.slug}`}
              className="block no-underline text-inherit"
            >
              <Card interactive large className="h-full">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl leading-none">{source.icon}</span>
                    <div>
                      <div className="text-base font-semibold text-white tracking-tight">
                        {source.name}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] leading-tight">
                        {source.fullName}
                      </div>
                    </div>
                  </div>
                  {source.status === 'active' ? (
                    <Badge label={source.datasets} />
                  ) : (
                    <Badge label="Próximamente" color="rgba(255,255,255,0.3)" />
                  )}
                </div>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-3">
                  {source.description}
                </p>
                <div className="text-xs text-[var(--text-muted)]">
                  Actualización: {source.updateFreq}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
