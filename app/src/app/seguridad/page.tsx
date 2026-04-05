import Breadcrumb from '@/components/ui/Breadcrumb';
import Card from '@/components/ui/Card';
import SectionHeader from '@/components/ui/SectionHeader';
import HBar from '@/components/charts/HBar';
import { getEnvipeStats, getCifraNegra, getCifraNegraByState, getLatestValue, getIndicatorValuesByState } from '@/lib/data';

export const metadata = {
  title: 'Seguridad - Mexico en Datos',
  description: 'Datos de criminalidad, cifra negra y percepcion de seguridad en Mexico. Fuente: ENVIPE, ENSU (INEGI) y SESNSP.',
};

// Human-readable labels for crime types
const CRIME_LABELS: Record<string, string> = {
  street_robbery: 'Robo/asalto en calle',
  home_robbery: 'Robo a casa habitacion',
  bank_fraud: 'Fraude bancario',
  threats: 'Amenazas',
  vehicle_partial_theft: 'Robo parcial de vehiculo',
  consumer_fraud: 'Fraude al consumidor',
  vehicle_theft: 'Robo total de vehiculo',
  extortion: 'Extorsion',
  vandalism: 'Vandalismo',
  assault: 'Lesiones',
  other_robbery: 'Otro tipo de robo',
  sexual_harassment: 'Acoso sexual',
  kidnapping: 'Secuestro',
  sexual_assault: 'Violacion sexual',
  other: 'Otros delitos',
};

export default async function SeguridadPage() {
  const [envipeNational, cifraNegra, envipeByCrime, homicideRate, stateHomicides] = await Promise.all([
    getEnvipeStats(undefined, '00', 'total'),
    getCifraNegra(undefined, '00'),
    getEnvipeStats(undefined, '00'),
    getLatestValue('sesnsp_homicide_rate', '00'),
    getIndicatorValuesByState('sesnsp_homicide_rate', { latest: true }),
  ]);

  const latestEnvipe = envipeNational[0] ?? null;
  const latestCifraNegra = cifraNegra.find((c) => c.crime_type === 'total') ?? cifraNegra[0] ?? null;
  const latestHomicideRate = homicideRate.latest;

  // Latest year for crime breakdowns
  const latestYear = latestEnvipe?.year ?? latestCifraNegra?.year ?? null;

  // Cifra negra by crime type (national, latest year)
  const cifraNegraByCrime = envipeByCrime
    .filter((s) => s.year === latestYear && s.crime_type !== 'total' && s.cifra_negra != null)
    .sort((a, b) => Number(b.cifra_negra) - Number(a.cifra_negra))
    .map((s) => ({
      label: CRIME_LABELS[s.crime_type] ?? s.crime_type,
      value: Number(s.cifra_negra),
      color: Number(s.cifra_negra) >= 90 ? '#E74C3C' : Number(s.cifra_negra) >= 80 ? '#E67E22' : '#F1C40F',
    }));

  // Prevalence by crime type (national, latest year)
  const prevalenceByCrime = envipeByCrime
    .filter((s) => s.year === latestYear && s.crime_type !== 'total' && s.prevalence_rate != null)
    .sort((a, b) => Number(b.prevalence_rate) - Number(a.prevalence_rate))
    .slice(0, 12)
    .map((s) => ({
      label: CRIME_LABELS[s.crime_type] ?? s.crime_type,
      value: Number(s.prevalence_rate),
      color: '#FF9F43',
    }));

  // Cifra negra trend (national, total, across years)
  const cifraNegraTrend = envipeNational
    .filter((s) => s.cifra_negra != null)
    .sort((a, b) => a.year - b.year);

  // Cifra negra by state (latest year)
  const cifraNegraByStateData = latestYear
    ? await getCifraNegraByState(latestYear)
    : [];
  const topCifraNegraStates = cifraNegraByStateData
    .slice(0, 10)
    .map((s) => ({
      label: s.geo_name,
      value: Number(s.cifra_negra),
      color: Number(s.cifra_negra) >= 93 ? '#E74C3C' : Number(s.cifra_negra) >= 90 ? '#E67E22' : '#F1C40F',
    }));
  const bottomCifraNegraStates = cifraNegraByStateData
    .slice(-5)
    .reverse()
    .map((s) => ({
      label: s.geo_name,
      value: Number(s.cifra_negra),
      color: '#2ECC71',
    }));

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

        <div className="border-l-2 border-[var(--accent)] pl-4 mb-6 max-w-[700px]">
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)]" style={{ textWrap: 'pretty' }}>
            Mexico tiene una de las tasas de homicidio mas altas de America Latina, aunque ha mostrado una tendencia a la baja desde su pico en 2019. Para poner en contexto: la tasa mexicana es ~5 veces la de Estados Unidos. Sin embargo, el dato mas revelador no son los homicidios sino la cifra negra &mdash;mas del 90% de los delitos nunca se denuncian, lo que significa que las estadisticas oficiales apenas capturan la superficie del problema.
          </p>
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
            {cifraNegraTrend.length > 1 && (
              <div className="md:w-[240px] shrink-0">
                <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                  Cifra Negra por Ano
                </div>
                <div className="flex flex-col gap-1">
                  {cifraNegraTrend.map((row) => (
                    <div key={row.year} className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">{row.year}</span>
                      <span className="font-semibold tabular-nums text-[var(--negative)]">
                        {Number(row.cifra_negra).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Cifra negra by crime type */}
      {cifraNegraByCrime.length > 0 && (
        <>
          <SectionHeader title="Cifra negra por tipo de delito" />
          <div className="px-[var(--pad-page)] mb-2">
            <div className="border-l-2 border-[var(--accent)] pl-4 mb-6 max-w-[700px]">
              <p className="text-[13px] leading-relaxed text-[var(--text-muted)]" style={{ textWrap: 'pretty' }}>
                Dato contraintuitivo: el robo total de vehiculo tiene la cifra negra mas baja de todos los delitos. La razon es practica &mdash;las aseguradoras exigen denuncia ante el Ministerio Publico para procesar el reclamo. Donde no hay incentivo economico para denunciar, la cifra negra se dispara por encima del 95%.
              </p>
            </div>
          </div>
          <div className="px-[var(--pad-page)] mb-10">
            <Card large>
              <div className="mb-4">
                <div className="text-base font-semibold text-white tracking-tight">
                  Porcentaje de delitos no denunciados por tipo
                </div>
                <div className="text-[13px] text-[var(--text-muted)] mt-1">
                  Nacional, ENVIPE {latestYear}. Fuente: INEGI.
                </div>
              </div>
              <HBar
                data={cifraNegraByCrime}
                maxVal={100}
                valueFmt={(v: number) => v.toFixed(1) + '%'}
              />
            </Card>
          </div>
        </>
      )}

      {/* Victimization prevalence by crime type */}
      {prevalenceByCrime.length > 0 && (
        <>
          <SectionHeader title="Victimizacion por tipo de delito" />
          <div className="px-[var(--pad-page)] mb-10">
            <Card large>
              <div className="mb-4">
                <div className="text-base font-semibold text-white tracking-tight">
                  Tasa de prevalencia por tipo de delito
                </div>
                <div className="text-[13px] text-[var(--text-muted)] mt-1">
                  Victimas por cada 100 mil habitantes 18+, nacional, ENVIPE {latestYear}
                </div>
              </div>
              <HBar
                data={prevalenceByCrime}
                valueFmt={(v: number) => v.toLocaleString('es-MX', { maximumFractionDigits: 0 })}
              />
            </Card>
          </div>
        </>
      )}

      {/* Homicide rate by state */}
      {topDangerous.length > 0 && (
        <>
          <SectionHeader title="Homicidios dolosos por estado" />
          <div className="px-[var(--pad-page)] mb-2">
            <div className="border-l-2 border-[var(--accent)] pl-4 mb-6 max-w-[700px]">
              <p className="text-[13px] leading-relaxed text-[var(--text-muted)]" style={{ textWrap: 'pretty' }}>
                Los estados con mayores tasas de homicidio coinciden con corredores de trafico de drogas y zonas de disputa territorial entre organizaciones criminales. Colima, Zacatecas y Baja California suelen encabezar la lista, mientras que Yucatan y Aguascalientes se mantienen consistentemente entre los mas seguros del pais.
              </p>
            </div>
          </div>
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

      {/* Cifra negra by state */}
      {topCifraNegraStates.length > 0 && (
        <>
          <SectionHeader title="Cifra negra por estado" />
          <div className="px-[var(--pad-page)] mb-10">
            <Card large>
              <div className="mb-4">
                <div className="text-base font-semibold text-white tracking-tight">
                  Estados con mayor cifra negra
                </div>
                <div className="text-[13px] text-[var(--text-muted)] mt-1">
                  % de delitos no denunciados, ENVIPE {latestYear}
                </div>
              </div>
              <HBar
                data={topCifraNegraStates}
                maxVal={100}
                valueFmt={(v: number) => v.toFixed(1) + '%'}
              />
            </Card>
          </div>

          {bottomCifraNegraStates.length > 0 && (
            <div className="px-[var(--pad-page)] mb-10">
              <Card large>
                <div className="mb-4">
                  <div className="text-base font-semibold text-white tracking-tight">
                    Estados con menor cifra negra
                  </div>
                  <div className="text-[13px] text-[var(--text-muted)] mt-1">
                    % de delitos no denunciados, ENVIPE {latestYear}
                  </div>
                </div>
                <HBar
                  data={bottomCifraNegraStates}
                  maxVal={100}
                  valueFmt={(v: number) => v.toFixed(1) + '%'}
                />
              </Card>
            </div>
          )}
        </>
      )}

      {/* Attribution */}
      <div className="px-[var(--pad-page)] mb-6">
        <p className="text-xs text-[var(--text-muted)]">
          Fuentes: SESNSP (incidencia delictiva), INEGI &mdash; ENVIPE (victimizacion)
          y ENSU (percepcion de seguridad urbana). Datos procesados de microdatos ENVIPE {latestYear && `${cifraNegraTrend.map(r => r.year).join(', ')}`}.
        </p>
      </div>

    </>
  );
}
