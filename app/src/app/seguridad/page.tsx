import Breadcrumb from '@/components/ui/Breadcrumb';
import Card from '@/components/ui/Card';
import SectionHeader from '@/components/ui/SectionHeader';
import HBar from '@/components/charts/HBar';
import { getEnvipeStats, getCifraNegra, getLatestValue, getIndicatorValuesByState } from '@/lib/data';

export const metadata = {
  title: 'Seguridad - Mexico en Datos',
  description: 'Datos de criminalidad, cifra negra y percepcion de seguridad en Mexico. Fuente: ENVIPE, ENSU (INEGI) y SESNSP.',
};

export default async function SeguridadPage() {
  const [envipeNational, cifraNegra, homicideRate, stateHomicides] = await Promise.all([
    getEnvipeStats(undefined, '00', 'total'),
    getCifraNegra(undefined, '00'),
    getLatestValue('sesnsp_homicide_rate', '00'),
    getIndicatorValuesByState('sesnsp_homicide_rate', { latest: true }),
  ]);

  const latestEnvipe = envipeNational[0] ?? null;
  const latestCifraNegra = cifraNegra[0] ?? null;
  const latestHomicideRate = homicideRate.latest;

  // Top 10 most dangerous + bottom 5 safest
  const topDangerous = stateHomicides
    .filter((s) => s.value != null)
    .slice(0, 10)
    .map((s) => ({
      label: s.geo_name,
      value: Number(s.value),
      color: '#E74C3C',
    }));

  const bottomSafest = stateHomicides
    .filter((s) => s.value != null)
    .slice(-5)
    .reverse()
    .map((s) => ({
      label: s.geo_name,
      value: Number(s.value),
      color: '#2ECC71',
    }));

  const statePeriod = stateHomicides[0]?.period ?? '';

  return (
    <>
      <div className="pt-10 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Seguridad' },
          ]}
        />

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Seguridad Publica
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 max-w-2xl">
          Datos sobre criminalidad, victimizacion y percepcion de seguridad en Mexico.
          Fuentes: SESNSP (incidencia delictiva), ENVIPE (victimizacion anual) y ENSU (percepcion trimestral).
        </p>

        {/* Headline stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <Card large>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Homicidios Dolosos
            </div>
            {latestHomicideRate ? (
              <>
                <div className="text-[36px] font-bold tabular-nums text-[var(--negative)] leading-none mb-1">
                  {Number(latestHomicideRate.value).toFixed(1)}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  por cada 100 mil hab. ({latestHomicideRate.period})
                </div>
              </>
            ) : (
              <div className="text-sm text-[var(--text-muted)]">Datos detallados proximamente</div>
            )}
          </Card>

          <Card large>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Cifra Negra Nacional
            </div>
            {latestCifraNegra?.cifra_negra != null ? (
              <>
                <div className="text-[36px] font-bold tabular-nums text-[var(--negative)] leading-none mb-1">
                  {Number(latestCifraNegra.cifra_negra).toFixed(1)}%
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  de los delitos no se denuncian ({latestCifraNegra.year})
                </div>
              </>
            ) : (
              <div className="text-sm text-[var(--text-muted)]">Datos detallados proximamente</div>
            )}
          </Card>

          <Card large>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Tasa de Victimizacion
            </div>
            {latestEnvipe?.prevalence_rate != null ? (
              <>
                <div className="text-[36px] font-bold tabular-nums text-[var(--accent)] leading-none mb-1">
                  {Number(latestEnvipe.prevalence_rate).toLocaleString('es-MX', { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  victimas por cada 100 mil hab. 18+ ({latestEnvipe.year})
                </div>
              </>
            ) : (
              <div className="text-sm text-[var(--text-muted)]">Datos detallados proximamente</div>
            )}
          </Card>

          <Card large>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Confianza en Policia
            </div>
            {latestEnvipe?.trust_police != null ? (
              <>
                <div className="text-[36px] font-bold tabular-nums text-white leading-none mb-1">
                  {Number(latestEnvipe.trust_police).toFixed(1)}%
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  de la poblacion confia en la policia ({latestEnvipe.year})
                </div>
              </>
            ) : (
              <div className="text-sm text-[var(--text-muted)]">Datos detallados proximamente</div>
            )}
          </Card>
        </div>
      </div>

      {/* Cifra negra explainer */}
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="flex-1">
              <div className="text-base font-semibold text-white tracking-tight mb-2">
                Que es la cifra negra?
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
                La cifra negra representa el porcentaje de delitos cometidos que no fueron denunciados
                ante el Ministerio Publico o que no derivaron en una carpeta de investigacion. Es
                uno de los indicadores mas reveladores del sistema de justicia mexicano: la gran
                mayoria de los delitos simplemente nunca se reportan.
              </p>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Las razones principales incluyen desconfianza en la autoridad, considerarlo una
                perdida de tiempo, miedo a represalias y falta de pruebas. Esto significa que las
                estadisticas oficiales de incidencia delictiva solo capturan una fraccion de la
                realidad.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Homicide rate by state */}
      {topDangerous.length > 0 && (
        <>
          <SectionHeader title="Homicidios dolosos por estado" />
          <div className="px-[var(--pad-page)] mb-10">
            <Card large>
              <div className="mb-4">
                <div className="text-base font-semibold text-white tracking-tight">
                  Estados con mayor tasa de homicidios dolosos
                </div>
                <div className="text-[13px] text-[var(--text-muted)] mt-1">
                  Tasa por cada 100 mil habitantes ({statePeriod})
                </div>
              </div>
              <HBar
                data={topDangerous}
                valueFmt={(v: number) => v.toFixed(1)}
              />
            </Card>
          </div>

          <div className="px-[var(--pad-page)] mb-10">
            <Card large>
              <div className="mb-4">
                <div className="text-base font-semibold text-white tracking-tight">
                  Estados con menor tasa de homicidios dolosos
                </div>
                <div className="text-[13px] text-[var(--text-muted)] mt-1">
                  Tasa por cada 100 mil habitantes ({statePeriod})
                </div>
              </div>
              <HBar
                data={bottomSafest}
                valueFmt={(v: number) => v.toFixed(1)}
              />
            </Card>
          </div>
        </>
      )}

      {/* Proximamente sections */}
      <SectionHeader title="Proximamente" />
      <div className="px-[var(--pad-page)] mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card large>
            <div className="text-base font-semibold text-white tracking-tight mb-1">
              Cifra negra
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">
              Analisis de delitos no denunciados por estado y tipo de delito.
            </p>
            <div className="text-xs text-[var(--accent)]">
              Proximamente con datos de ENVIPE
            </div>
          </Card>
          <Card large>
            <div className="text-base font-semibold text-white tracking-tight mb-1">
              Percepcion de seguridad
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">
              Como se siente la poblacion en las principales ciudades del pais (ENSU trimestral).
            </p>
            <div className="text-xs text-[var(--accent)]">
              Proximamente con datos de ENSU
            </div>
          </Card>
        </div>
      </div>

      {/* Attribution */}
      <div className="px-[var(--pad-page)] mb-6">
        <p className="text-xs text-[var(--text-muted)]">
          Fuentes: SESNSP (incidencia delictiva), INEGI &mdash; ENVIPE (victimizacion)
          y ENSU (percepcion de seguridad urbana).
        </p>
      </div>

    </>
  );
}
