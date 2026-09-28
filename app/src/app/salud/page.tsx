import type { Metadata } from 'next';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Card from '@/components/ui/Card';
import SectionHeader from '@/components/ui/SectionHeader';
import HBar from '@/components/charts/HBar';
import {
  getLeadingCausesOfDeath,
  getMortalityByAge,
  getMortalityTrend,
  getTopCauseByAge,
  getTotalDeaths,
  getHealthFacilitySummary,
  getHospitalsPerCapita,
  getLatestMortalityYear,
  getIndicatorValues,
  getEnsanutNationalSummary,
} from '@/lib/data';
import { MortalityTrendChart, LifeExpectancyChart, HealthCoverageGapChart } from './SaludClient';

export const metadata: Metadata = {
  title: 'Salud | Mexico en Datos',
  description:
    'Panorama de salud en Mexico: mortalidad por causa y edad, tendencias historicas, crisis de diabetes, infraestructura hospitalaria. Datos de INEGI, ENSANUT e INSP.',
  alternates: { canonical: '/salud' },
};

const CAUSE_LABELS: Record<string, string> = {
  cardiovascular: 'Enf. del corazon',
  diabetes: 'Diabetes mellitus',
  cancer: 'Tumores malignos',
  liver_disease: 'Enf. del higado',
  cerebrovascular: 'Cerebrovascular',
  homicide: 'Homicidios',
  respiratory: 'Inf. respiratorias',
  traffic_accidents: 'Acc. de transito',
  kidney_disease: 'Enf. del rinon',
  covid19: 'COVID-19',
};

const CAUSE_COLORS: Record<string, string> = {
  cardiovascular: '#E74C3C',
  diabetes: '#F39C12',
  cancer: '#9B59B6',
  liver_disease: '#E67E22',
  cerebrovascular: '#3498DB',
  homicide: '#E74C3C',
  respiratory: '#2ECC71',
  traffic_accidents: '#1ABC9C',
  kidney_disease: '#8E44AD',
  covid19: '#34495E',
};

const TREND_CAUSES = [
  { cause: 'cardiovascular', label: 'Cardiovascular', color: '#E74C3C' },
  { cause: 'diabetes', label: 'Diabetes', color: '#F39C12' },
  { cause: 'cancer', label: 'Cancer', color: '#9B59B6' },
  { cause: 'homicide', label: 'Homicidios', color: '#EF4444' },
  { cause: 'respiratory', label: 'Respiratorias', color: '#2ECC71' },
];

// Sort age groups in natural order
const AGE_ORDER = ['15-24', '25-34', '35-44', '45-54', '55-64', '65-74', '75+'];

function formatNumber(n: number): string {
  return n.toLocaleString('es-MX');
}

export default async function SaludPage() {
  // Most recent year of mortality microdata in the DB
  const year = await getLatestMortalityYear();

  // Fetch all data in parallel
  const [
    causes,
    totalDeaths,
    diabetesByAge,
    topCauseByAge,
    facilitySummary,
    hospitalsPerCapita,
    healthAccessGap,
    lifeExpectancy,
    obesity,
    ensanutRows,
    ...trendResults
  ] = await Promise.all([
    getLeadingCausesOfDeath(year),
    getTotalDeaths(year),
    getMortalityByAge('diabetes', year),
    getTopCauseByAge(year),
    getHealthFacilitySummary(),
    getHospitalsPerCapita(),
    getIndicatorValues('coneval_sin_salud'),
    getIndicatorValues('esperanza_vida'),
    getIndicatorValues('ensanut_obesidad'),
    getEnsanutNationalSummary(),
    ...TREND_CAUSES.map((t) => getMortalityTrend(t.cause)),
  ]);

  // ENSANUT: diagnosed diabetes/hypertension from microdata (latest year),
  // obesity as published by INSP (latest year with an official figure)
  const ensanutYear = ensanutRows[0]?.year;
  const ensanutPct = (condition: string) => {
    const row = ensanutRows.find((r) => r.year === ensanutYear && r.condition === condition);
    return row?.prevalence_pct != null ? `${Number(row.prevalence_pct).toFixed(1)}%` : '—';
  };
  const obesityLatest = obesity.filter((d) => d.value != null).at(-1);
  const diabetesShare = Number(
    ensanutRows.find((r) => r.year === ensanutYear && r.condition === 'diabetes')?.prevalence_pct ?? 0
  );
  const obesityPct = obesityLatest ? `${Number(obesityLatest.value).toFixed(1)}%` : '—';

  const topCause = causes[0];
  const diabetesEntry = causes.find((c) => c.cause_group === 'diabetes');
  const diabetesRank = causes.findIndex((c) => c.cause_group === 'diabetes') + 1;

  // Leading causes chart data
  const chartData = causes
    .filter((c) => c.rate_per_100k != null)
    .map((c) => ({
      label: CAUSE_LABELS[c.cause_group] || c.cause_group,
      value: Number(c.rate_per_100k),
      color: CAUSE_COLORS[c.cause_group] || 'var(--accent)',
    }));

  // Trends data — build if we have multi-year data
  const hasMultiYearData = trendResults.some((r) => r.length > 1);
  let trendData: {
    years: string[];
    series: { cause: string; label: string; color: string; values: number[] }[];
  } | null = null;

  if (hasMultiYearData) {
    // Get union of all years
    const yearSet = new Set<number>();
    trendResults.forEach((r) => r.forEach((row) => yearSet.add(row.year)));
    const years = Array.from(yearSet).sort();

    trendData = {
      years: years.map(String),
      series: TREND_CAUSES.map((t, i) => {
        const data = trendResults[i];
        const byYear = new Map(data.map((r) => [r.year, Number(r.rate_per_100k ?? 0)]));
        return {
          cause: t.cause,
          label: t.label,
          color: t.color,
          values: years.map((y) => byYear.get(y) ?? 0),
        };
      }).filter((s) => s.values.some((v) => v > 0)),
    };
  }

  // Diabetes by age chart data (use deaths since rate_per_100k is NULL for age groups)
  const diabetesAgeData = diabetesByAge
    .filter((d) => !['0-4', '5-14'].includes(d.age_group))
    .sort((a, b) => {
      const ai = AGE_ORDER.indexOf(a.age_group);
      const bi = AGE_ORDER.indexOf(b.age_group);
      return ai - bi;
    })
    .map((d) => ({
      label: d.age_group + ' anos',
      value: d.deaths,
      color: '#F39C12',
    }));

  // Top cause by age — sorted and labeled
  const topCauseByAgeSorted = topCauseByAge
    .sort((a, b) => {
      const ai = AGE_ORDER.indexOf(a.age_group);
      const bi = AGE_ORDER.indexOf(b.age_group);
      return ai - bi;
    });

  // Facility count
  const totalFacilities = facilitySummary.reduce((sum, f) => sum + f.count, 0);

  // Facility chart data
  const facilityChartData = facilitySummary.slice(0, 8).map((f) => ({
    label: f.institution,
    value: f.count,
    color: '#FF9F43',
  }));

  // Life expectancy chart data (CONAPO; 2020+ are projections)
  const lifeRows = lifeExpectancy.filter((d) => d.value != null);
  const lifeExpData = {
    labels: lifeRows.map((d) => d.period),
    values: lifeRows.map((d) => Number(d.value)),
  };
  const lifeFirst = lifeRows[0];
  const lifeLatest = lifeRows[lifeRows.length - 1];
  const lifePre = lifeRows.find((d) => d.period === '2019');
  const lifeTrough = lifeRows
    .filter((d) => d.period === '2020' || d.period === '2021')
    .sort((a, b) => Number(a.value) - Number(b.value))[0];

  // Health coverage gap chart data (CONEVAL methodology, biennial)
  const gapRows = healthAccessGap.filter((d) => d.value != null);
  const coverageGapData = {
    labels: gapRows.map((d) => d.period),
    values: gapRows.map((d) => Number(d.value)),
  };
  const gapFirst = gapRows[0];
  const gapLatest = gapRows[gapRows.length - 1];
  const gapBy = new Map(gapRows.map((d) => [d.period, Number(d.value)]));
  const gapPct = (period: string) => {
    const v = gapBy.get(period);
    return v != null ? `${v.toFixed(1)}%` : '—';
  };

  // Hospitals per capita chart data (top 15 + bottom 5)
  const hospitalsChartData = hospitalsPerCapita.length > 0
    ? [
        ...hospitalsPerCapita.slice(0, 15),
        ...hospitalsPerCapita.slice(-5).filter((h) => !hospitalsPerCapita.slice(0, 15).includes(h)),
      ].map((h) => ({
        label: h.geo_name,
        value: h.per_100k,
        color: h.per_100k < hospitalsPerCapita[Math.floor(hospitalsPerCapita.length / 2)]?.per_100k
          ? '#EF4444'
          : 'var(--accent)',
      }))
    : [];

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-[var(--pad-page)] pt-10 pb-6">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Salud' },
          ]}
        />
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Salud
        </h1>
        <p className="text-[var(--text-secondary)] text-base leading-relaxed max-w-[640px]">
          Panorama de salud publica en Mexico: mortalidad, enfermedades cronicas, infraestructura hospitalaria. Datos de 6+ anos de registros oficiales y multiples fuentes.
        </p>
      </div>

      {/* ── Narrative intro ────────────────────────────────────────── */}
      <div className="px-[var(--pad-page)] mb-8">
        <div className="border-l-2 border-[var(--accent)] pl-4 max-w-[700px]">
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)] mb-2" style={{ textWrap: 'pretty' }}>
            Mexico enfrenta una triple crisis de salud: una epidemia de obesidad y diabetes ({obesityLatest ? `${Number(obesityLatest.value).toFixed(0)}% de obesidad en adultos` : 'mas de un tercio con obesidad'}, entre las mas altas de la OCDE), un colapso de cobertura ({gapLatest ? `${Number(gapLatest.value).toFixed(0)}% sin acceso en ${gapLatest.period}` : 'un tercio sin acceso'} tras el desmantelamiento del Seguro Popular), y enfermedades cronicas que matan a personas mas jovenes que en paises comparables.
          </p>
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)]" style={{ textWrap: 'pretty' }}>
            La diabetes es particularmente critica: es la unica economia grande donde aparece como segunda causa de muerte. El COVID-19 provoco la mayor caida de la esperanza de vida en decadas, y los homicidios siguen entre las 10 primeras causas &mdash; algo inusual en paises de ingreso similar.
          </p>
        </div>
      </div>

      {/* ── 1. Headline stats ──────────────────────────────────────── */}
      <div className="px-[var(--pad-page)] mb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Defunciones por causas principales {year}
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">
              {totalDeaths > 0 ? formatNumber(totalDeaths) : '~850,000'}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              Suma de las {causes.length} causas analizadas, nivel nacional
            </div>
          </Card>

          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Principal causa de muerte
            </div>
            <div className="text-lg font-bold text-white">
              {topCause
                ? (CAUSE_LABELS[topCause.cause_group] || topCause.cause_group)
                : 'Enf. del corazon'}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {topCause?.rate_per_100k != null
                ? `${Number(topCause.rate_per_100k).toFixed(1)} por 100k hab. (${year})`
                : '~150 por 100k hab. (2023 est.)'}
            </div>
          </Card>

          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Muertes por diabetes
            </div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: '#F39C12' }}>
              {diabetesEntry
                ? formatNumber(diabetesEntry.deaths)
                : '~110,000'}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {diabetesRank > 0 ? `${diabetesRank}a causa de muerte · ${year}` : year}
            </div>
          </Card>

          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              {totalFacilities > 0 ? 'Unidades de salud' : 'Sin acceso a salud'}
            </div>
            <div className="text-2xl font-bold text-white tabular-nums">
              {totalFacilities > 0
                ? formatNumber(totalFacilities)
                : gapLatest ? `${Number(gapLatest.value).toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {totalFacilities > 0
                ? 'Catalogo CLUES &middot; Sec. Salud'
                : `Carencia por acceso · ${gapLatest?.period ?? ''}`}
            </div>
          </Card>
        </div>
      </div>

      {/* ── 2. Leading causes of death ─────────────────────────────── */}
      <SectionHeader title="Principales causas de muerte" />
      <div className="px-[var(--pad-page)] mb-12">
        <Card large>
          <div className="mb-4">
            <div className="text-base font-semibold text-white tracking-tight">
              Tasa de mortalidad por causa
            </div>
            <div className="text-[13px] text-[var(--text-muted)] mt-1">
              Tasa por 100 mil habitantes, {year} &middot; Nacional &middot; Datos hasta: {year}
            </div>
          </div>
          <HBar
            data={chartData}
            valueFmt={(v: number) => v.toFixed(1)}
          />
          <div className="text-xs text-[var(--text-muted)] mt-4">
            Fuente: Estadisticas de Defunciones Registradas {year}, INEGI / Sec. Salud. Clasificacion CIE-10.
          </div>
        </Card>
      </div>

      {/* ── 3. Life expectancy trend ──────────────────────────────── */}
      <SectionHeader title="Esperanza de vida" />
      <div className="px-[var(--pad-page)] mb-12">
        <Card large>
          <div className="mb-4">
            <div className="text-base font-semibold text-white tracking-tight">
              Esperanza de vida al nacer
            </div>
            <div className="text-[13px] text-[var(--text-muted)] mt-1">
              Anos &middot; Nacional &middot; CONAPO &middot; {`${lifeFirst?.period}-${lifeLatest?.period} · 2020 en adelante son proyecciones`}
            </div>
          </div>
          <div className="h-[280px]">
            <LifeExpectancyChart data={lifeExpData} />
          </div>
          <div className="border-l-2 border-[var(--accent)] pl-4 mt-5 max-w-[640px]">
            <p className="text-[13px] leading-relaxed text-[var(--text-muted)]" style={{ textWrap: 'pretty' }}>
              {lifePre && lifeTrough && lifeLatest
                ? `La esperanza de vida cayo de ${Number(lifePre.value).toFixed(1)} a ${Number(lifeTrough.value).toFixed(1)} anos durante la pandemia de COVID-19 (2019-${lifeTrough.period}), una perdida de ${(Number(lifePre.value) - Number(lifeTrough.value)).toFixed(1)} anos. Para ${lifeLatest.period} CONAPO la estima en ${Number(lifeLatest.value).toFixed(1)} anos, ${Number(lifeLatest.value) >= Number(lifePre.value) ? 'por encima' : 'todavia por debajo'} del nivel pre-pandemia.`
                : 'La pandemia de COVID-19 redujo la esperanza de vida en Mexico entre 2020 y 2021.'}
            </p>
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-4">
            Fuente: CONAPO, Conciliacion Demografica 1950-2019 y Proyecciones de la Poblacion de Mexico y de las Entidades Federativas 2020-2070 (via INEGI).
          </div>
        </Card>
      </div>

      {/* ── 4. Health coverage gap ────────────────────────────────── */}
      <SectionHeader title="Cobertura de salud" />
      <div className="px-[var(--pad-page)] mb-12">
        <Card large className="border-l-2 border-[#EF4444]">
          <div className="mb-4">
            <div className="text-base font-semibold text-white tracking-tight">
              Poblacion sin acceso a servicios de salud
            </div>
            <div className="text-[13px] text-[var(--text-muted)] mt-1">
              % de la poblacion &middot; Nacional &middot; CONEVAL / INEGI &middot; {gapFirst?.period}-{gapLatest?.period}
            </div>
          </div>
          <div className="h-[280px]">
            <HealthCoverageGapChart data={coverageGapData} />
          </div>
          <div className="border-l-2 border-[#EF4444] pl-4 mt-5 max-w-[640px]">
            <p className="text-[13px] leading-relaxed text-[var(--text-muted)]" style={{ textWrap: 'pretty' }}>
              El porcentaje de la poblacion sin acceso a servicios de salud bajo de {gapPct('2008')} a {gapPct('2016')} entre 2008-2016 gracias al Seguro Popular. Tras su desmantelamiento y la transicion a INSABI y luego IMSS-Bienestar, la carencia se disparo a {gapPct('2022')} en 2022 &mdash; peor que en 2008.
              {gapLatest && gapLatest.period !== '2022' && ` En ${gapLatest.period} bajo a ${gapPct(gapLatest.period)}, aun muy por encima del nivel de 2016.`}
            </p>
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-4">
            Fuente: CONEVAL (2008-2022) e INEGI (2024 en adelante), Medicion multidimensional de la pobreza.
          </div>
        </Card>
      </div>

      {/* ── 5. Mortality trends ────────────────────────────────────── */}
      {trendData && trendData.years.length >= 2 ? (
        <>
          <SectionHeader title="Tendencias de mortalidad" />
          <div className="px-[var(--pad-page)] mb-12">
            <Card large>
              <div className="mb-4">
                <div className="text-base font-semibold text-white tracking-tight">
                  Tasa de mortalidad por causa, evolucion historica
                </div>
                <div className="text-[13px] text-[var(--text-muted)] mt-1">
                  Tasa por 100 mil habitantes &middot; Nacional &middot; Datos hasta: {trendData.years[trendData.years.length - 1]}
                </div>
              </div>
              <div className="h-[350px]">
                <MortalityTrendChart data={trendData} />
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4">
                {trendData.series.map((s) => (
                  <div key={s.cause} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <div className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
                    {s.label}
                  </div>
                ))}
              </div>
              <div className="border-l-2 border-[var(--accent)] pl-4 mt-5 max-w-[640px]">
                <p className="text-[13px] leading-relaxed text-[var(--text-muted)]" style={{ textWrap: 'pretty' }}>
                  El 2020 muestra un pico dramatico en mortalidad cardiovascular, diabetes y respiratoria &mdash; efecto directo e indirecto de la pandemia de COVID-19. Los homicidios se mantienen relativamente estables. Para 2023, las tasas bajan pero siguen por encima de los niveles pre-pandemia en varias categorias.
                </p>
              </div>
            </Card>
          </div>
        </>
      ) : (
        <>
          <SectionHeader title="Tendencias de mortalidad" />
          <div className="px-[var(--pad-page)] mb-12">
            <Card large>
              <div className="text-[13px] text-[var(--text-muted)] py-4">
                Datos historicos (2018-2023) proximamente. Se esta procesando informacion de multiples anos.
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ── 6. Diabetes: Mexico's crisis ───────────────────────────── */}
      {diabetesAgeData.length > 0 && (
        <>
          <SectionHeader title="Diabetes: la crisis mexicana" />
          <div className="px-[var(--pad-page)] mb-12">
            <Card large className="border-l-2 border-[#EF4444]">
              <div className="mb-5">
                <div className="text-base font-semibold text-white tracking-tight">
                  Muertes por diabetes por grupo de edad
                </div>
                <div className="text-[13px] text-[var(--text-muted)] mt-1">
                  Defunciones absolutas, {year} &middot; Nacional &middot; Datos hasta: {year}
                </div>
              </div>
              <HBar
                data={diabetesAgeData}
                valueFmt={(v: number) => formatNumber(v)}
              />
              <div className="border-l-2 border-[#F39C12] pl-4 mt-5 max-w-[640px]">
                <p className="text-[13px] leading-relaxed text-[var(--text-muted)]" style={{ textWrap: 'pretty' }}>
                  La diabetes mata a {diabetesEntry ? formatNumber(diabetesEntry.deaths) : '110,000'} personas al ano en Mexico.
                  A diferencia de otros paises, afecta desproporcionadamente a personas en edad productiva:
                  {' '}{formatNumber(diabetesAgeData.filter((d) => ['35-44 anos', '45-54 anos', '55-64 anos'].includes(d.label)).reduce((s, d) => s + d.value, 0))} muertes
                  ocurrieron entre los 35 y 64 anos en {year}.
                </p>
                <p className="text-[13px] leading-relaxed text-[var(--text-muted)] mt-2" style={{ textWrap: 'pretty' }}>
                  Segun la ENSANUT, {ensanutPct('diabetes')} de los adultos mexicanos tenian diabetes diagnosticada en {ensanutYear} y {obesityPct} tenian obesidad en {`${obesityLatest?.period ?? ''} — ambas tasas`} entre las mas altas del mundo. La diabetes diagnosticada es solo una parte: el INSP estima que alrededor de un tercio de los adultos con diabetes no lo sabe.
                </p>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ── 7. What kills each generation ──────────────────────────── */}
      {topCauseByAgeSorted.length > 0 && (
        <>
          <SectionHeader title="Que mata a cada generacion" />
          <div className="px-[var(--pad-page)] mb-12">
            <Card large>
              <div className="mb-5">
                <div className="text-base font-semibold text-white tracking-tight">
                  Principal causa de muerte por grupo de edad
                </div>
                <div className="text-[13px] text-[var(--text-muted)] mt-1">
                  Nacional, {year} &middot; Datos hasta: {year}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {topCauseByAgeSorted.map((row) => {
                  const causeLabel = CAUSE_LABELS[row.cause_group] || row.cause_group;
                  const causeColor = CAUSE_COLORS[row.cause_group] || 'var(--accent)';
                  return (
                    <div key={row.age_group} className="flex items-center gap-4">
                      <div className="w-[72px] shrink-0 text-right text-sm font-semibold text-[var(--text-secondary)] tabular-nums">
                        {row.age_group}
                      </div>
                      <div
                        className="px-3 py-1.5 rounded-md text-sm font-semibold"
                        style={{
                          background: causeColor + '1a',
                          color: causeColor,
                          borderLeft: `3px solid ${causeColor}`,
                        }}
                      >
                        {causeLabel}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] tabular-nums">
                        {formatNumber(row.deaths)} defunciones
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-l-2 border-[var(--accent)] pl-4 mt-5 max-w-[640px]">
                <p className="text-[13px] leading-relaxed text-[var(--text-muted)]" style={{ textWrap: 'pretty' }}>
                  Los homicidios son la principal causa de muerte entre los 15 y 34 anos &mdash; una anomalia en paises de ingreso medio-alto. A partir de los 45, las enfermedades cronicas toman el control: diabetes y cardiovascular dominan hasta los 75+. La transicion de violencia a enfermedad cronica sucede alrededor de los 35-44 anos.
                </p>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ── 8. Health infrastructure ───────────────────────────────── */}
      {facilityChartData.length > 0 ? (
        <>
          <SectionHeader title="Infraestructura de salud" />
          <div className="px-[var(--pad-page)] mb-12">
            <Card large>
              <div className="mb-4">
                <div className="text-base font-semibold text-white tracking-tight">
                  Unidades de salud por institucion
                </div>
                <div className="text-[13px] text-[var(--text-muted)] mt-1">
                  Catalogo CLUES &middot; Secretaria de Salud
                </div>
              </div>
              <HBar
                data={facilityChartData}
                valueFmt={(v: number) => formatNumber(v)}
              />
              <div className="text-xs text-[var(--text-muted)] mt-4">
                Fuente: Catalogo de Clave Unica de Establecimientos de Salud (CLUES), Secretaria de Salud.
              </div>
            </Card>
          </div>
        </>
      ) : (
        <>
          <SectionHeader title="Infraestructura de salud" />
          <div className="px-[var(--pad-page)] mb-12">
            <Card large>
              <div className="text-[13px] text-[var(--text-muted)] py-4">
                Infraestructura hospitalaria proximamente. Datos del Catalogo CLUES (Secretaria de Salud) en proceso de carga.
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ── 9. Hospitals per capita by state ──────────────────────── */}
      {hospitalsChartData.length > 0 && (
        <>
          <SectionHeader title="Hospitales per capita por estado" />
          <div className="px-[var(--pad-page)] mb-12">
            <Card large>
              <div className="mb-4">
                <div className="text-base font-semibold text-white tracking-tight">
                  Hospitales por cada 100 mil habitantes por estado
                </div>
                <div className="text-[13px] text-[var(--text-muted)] mt-1">
                  CLUES (hospitales) / CONAPO (poblacion est. 2023)
                </div>
              </div>
              <HBar
                data={hospitalsChartData}
                valueFmt={(v: number) => v.toFixed(1)}
              />
              <div className="border-l-2 border-[var(--accent)] pl-4 mt-5 max-w-[640px]">
                <p className="text-[13px] leading-relaxed text-[var(--text-muted)]" style={{ textWrap: 'pretty' }}>
                  La distribucion de infraestructura hospitalaria es profundamente desigual. Los estados del sureste tienen significativamente menos hospitales per capita que las entidades del norte y centro.
                </p>
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-4">
                Fuente: CLUES (Sec. Salud), CONAPO (Proyecciones de Poblacion 2023).
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ── 10. ENSANUT prevalence ──────────────────────────────────── */}
      <SectionHeader title="Prevalencia de enfermedades cronicas" />
      <div className="px-[var(--pad-page)] mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Obesidad en adultos
            </div>
            <div className="text-2xl font-bold text-white">{obesityPct}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {`ENSANUT ${obesityLatest?.period ?? ''} · IMC ≥ 30 · cifra del INSP`}
            </div>
          </Card>
          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Diabetes diagnosticada
            </div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: '#F39C12' }}>{ensanutPct('diabetes')}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {`ENSANUT ${ensanutYear ?? ''} · Adultos 20+ · diagnostico medico`}
            </div>
          </Card>
          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Hipertension diagnosticada
            </div>
            <div className="text-2xl font-bold text-white">{ensanutPct('hypertension')}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {`ENSANUT ${ensanutYear ?? ''} · Adultos 20+ · diagnostico medico`}
            </div>
          </Card>
        </div>
        <div className="border-l-2 border-[var(--accent)] pl-4 max-w-[640px]">
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)]" style={{ textWrap: 'pretty' }}>
            Mas de un tercio de los adultos mexicanos vive con obesidad, y {diabetesShare ? `alrededor de 1 de cada ${Math.round(100 / diabetesShare)}` : 'uno de cada diez'} tiene un diagnostico medico de diabetes. Las cifras diagnosticadas subestiman el problema: muchos adultos con diabetes o hipertension no lo saben. Estas enfermedades alimentan directamente las tasas de mortalidad por enfermedades cronicas que se observan arriba. Mexico tiene una de las tasas de obesidad mas altas de la OCDE.
          </p>
        </div>
      </div>

      {/* ── 11. Attribution ────────────────────────────────────────── */}
      <div className="px-[var(--pad-page)] mb-10">
        <div className="text-xs text-[var(--text-muted)] leading-relaxed">
          Fuentes: INEGI (Estadisticas de Mortalidad 2018-{year}), ENSANUT {ensanutYear} (INSP), Secretaria de Salud (CLUES), CONEVAL (Medicion de Pobreza), CONAPO (Proyecciones de Poblacion)
        </div>
      </div>
    </>
  );
}
