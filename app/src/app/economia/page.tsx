import Link from 'next/link';
import type { Metadata } from 'next';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Card from '@/components/ui/Card';
import SectionHeader from '@/components/ui/SectionHeader';
import TimeSeries from '@/components/charts/TimeSeries';
import { getLatestValue, getIndicatorValues } from '@/lib/data';
import { fmtNum, fmtPct } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Econom\u00eda | M\u00e9xico en Datos',
  description:
    'Panorama de la actividad econ\u00f3mica de M\u00e9xico: crecimiento, producci\u00f3n, precios y comercio exterior.',
};

export default async function EconomiaPage() {
  const [pib, igaeTotal, exportaciones, confianza, igaeValues] =
    await Promise.all([
      getLatestValue('735904'),
      getLatestValue('736939'),
      getLatestValue('127598'),
      getLatestValue('454168'),
      getIndicatorValues('736939', '00'),
    ]);

  // Prepare IGAE time series data
  const igaeNums = igaeValues
    .filter((v) => v.value != null)
    .map((v) => Number(v.value!));
  const igaeLabels = igaeValues
    .filter((v) => v.value != null)
    .map((v) => {
      const d = v.period_date;
      if (!d) return v.period ?? '';
      const s = typeof d === 'string' ? d : (d as Date).toISOString();
      return s.slice(0, 4);
    });
  const igaePeriods = igaeValues
    .filter((v) => v.value != null)
    .map((v) => v.period ?? '');

  const SECTORS = [
    {
      title: 'Actividades primarias',
      description:
        'Agricultura, ganader\u00eda, pesca y silvicultura.',
      indicatorId: '736943',
    },
    {
      title: 'Actividades secundarias',
      description:
        'Miner\u00eda, manufactura, construcci\u00f3n y electricidad.',
      indicatorId: '736945',
    },
    {
      title: 'Actividades terciarias',
      description:
        'Comercio, transporte, servicios financieros y gobierno.',
      indicatorId: '736947',
    },
  ];

  return (
    <>
      <div className="pt-10 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Econom\u00eda' },
          ]}
        />

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Econom&iacute;a
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 max-w-[640px]">
          Panorama de la actividad econ&oacute;mica de M&eacute;xico: crecimiento,
          producci&oacute;n, precios y comercio exterior.
        </p>

        {/* Headline stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              PIB (crecimiento)
            </div>
            <div className="text-[28px] font-bold tracking-tight leading-none tabular-nums text-[var(--accent)]">
              {pib?.latest?.value != null
                ? fmtPct(Number(pib.latest.value))
                : '\u2014'}
            </div>
            {pib?.latest?.period && (
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {pib.latest.period}
              </div>
            )}
          </Card>

          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              IGAE Total
            </div>
            <div className="text-[28px] font-bold tracking-tight leading-none tabular-nums text-[var(--accent)]">
              {igaeTotal?.latest?.value != null
                ? fmtNum(Number(igaeTotal.latest.value), 1)
                : '\u2014'}
            </div>
            {igaeTotal?.latest?.period && (
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {igaeTotal.latest.period} &middot; &iacute;ndice base 2018
              </div>
            )}
          </Card>

          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Exportaciones
            </div>
            <div className="text-[28px] font-bold tracking-tight leading-none tabular-nums text-[var(--accent)]">
              {exportaciones?.latest?.value != null
                ? '$' + fmtNum(Number(exportaciones.latest.value), 0)
                : '\u2014'}
            </div>
            {exportaciones?.latest?.period && (
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {exportaciones.latest.period} &middot; MDD
              </div>
            )}
          </Card>

          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Confianza del consumidor
            </div>
            <div className="text-[28px] font-bold tracking-tight leading-none tabular-nums text-[var(--accent)]">
              {confianza?.latest?.value != null
                ? fmtNum(Number(confianza.latest.value), 1)
                : '\u2014'}
            </div>
            {confianza?.latest?.period && (
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {confianza.latest.period} &middot; &iacute;ndice
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* IGAE trend */}
      <SectionHeader
        title="IGAE: Actividad econ\u00f3mica"
        linkText="Ver indicador"
        linkHref="/indicador/736939"
      />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <div className="mb-4">
            <div className="text-base font-semibold text-white tracking-tight">
              Indicador Global de la Actividad Econ&oacute;mica (IGAE)
            </div>
            <div className="text-[13px] text-[var(--text-muted)] mt-1">
              &Iacute;ndice base 2018=100, serie desestacionalizada
            </div>
          </div>
          {igaeNums.length > 0 ? (
            <TimeSeries
              series={[
                {
                  values: igaeNums,
                  color: 'var(--accent)',
                  label: 'IGAE Total',
                },
              ]}
              labels={igaeLabels}
              periods={igaePeriods}
              yUnit=""
              yStep={20}
              labelStep={Math.max(1, Math.floor(igaeLabels.length / 6))}
              valueDecimals={1}
            />
          ) : (
            <div className="py-6 text-center text-sm text-[var(--text-muted)]">
              Datos no disponibles
            </div>
          )}
        </Card>
      </div>

      {/* Sector breakdown */}
      <SectionHeader title="Actividad por sector" />
      <div className="px-[var(--pad-page)] mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SECTORS.map((sector) => (
            <Link key={sector.indicatorId} href={`/indicador/${sector.indicatorId}`}>
              <Card interactive large className="h-full">
                <div className="text-base font-semibold text-white tracking-tight mb-1">
                  {sector.title}
                </div>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {sector.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Sub-page links */}
      <SectionHeader title="Explora m\u00e1s" />
      <div className="px-[var(--pad-page)] mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link href="/comercio">
            <Card interactive large>
              <div className="text-base font-semibold text-white tracking-tight mb-1">
                Comercio exterior
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Exportaciones, importaciones, balanza comercial y nearshoring.
              </p>
            </Card>
          </Link>
          <Link href="/explorador">
            <Card interactive large>
              <div className="text-base font-semibold text-white tracking-tight mb-1">
                Explorador de indicadores
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Navega los 100+ indicadores econ&oacute;micos disponibles en la plataforma.
              </p>
            </Card>
          </Link>
        </div>
      </div>

      {/* Attribution */}
      <div className="px-[var(--pad-page)] mb-10">
        <div className="text-xs text-[var(--text-muted)] leading-relaxed">
          Fuente: INEGI (BIE), Banxico
        </div>
      </div>
    </>
  );
}
