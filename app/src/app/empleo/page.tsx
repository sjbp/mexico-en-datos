import Link from 'next/link';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import Footer from '@/components/ui/Footer';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { getHeadlineIndicators, getEmploymentByDimension, getLatestEmploymentQuarter } from '@/lib/data';
import { fmtPct, fmtCompact } from '@/lib/format';
import EmpleoClient from './EmpleoClient';

export default async function EmpleoPage() {
  const [headlines, sectorStats, latestQuarter] = await Promise.all([
    getHeadlineIndicators(),
    getEmploymentByDimension('sector'),
    getLatestEmploymentQuarter(),
  ]);

  // Extract employment-related headline indicators
  const unemployment = headlines.find((h) => h.indicator.id === '444614');
  const informality = headlines.find((h) => h.indicator.id === '444793');
  const underemployment = headlines.find((h) => h.indicator.id === '444894');
  const pea = headlines.find((h) => h.indicator.id === '444609');

  const hasMicrodata = sectorStats.length > 0;

  // Build sector informality data for HBar (if available)
  const sectorInformalityData = sectorStats
    .filter((s) => s.informality_rate != null)
    .map((s) => ({
      label: s.dimension_value,
      value: Number(s.informality_rate),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  return (
    <>
      <div className="pt-10 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Empleo' },
          ]}
        />

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Empleo en M&eacute;xico
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 max-w-[640px]">
          Panorama del mercado laboral mexicano: desocupaci&oacute;n, informalidad,
          subocupaci&oacute;n y salarios. Datos de la Encuesta Nacional de Ocupaci&oacute;n
          y Empleo (ENOE) del INEGI.
        </p>

        {/* Headline stats from indicator API */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Tasa de desocupaci&oacute;n
            </div>
            <div className="text-[28px] font-bold tracking-tight leading-none tabular-nums text-[var(--accent)]">
              {unemployment?.latest?.value != null
                ? fmtPct(Number(unemployment.latest.value))
                : '\u2014'}
            </div>
            {unemployment?.latest?.period && (
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {unemployment.latest.period}
              </div>
            )}
          </Card>

          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Tasa de informalidad
            </div>
            <div className="text-[28px] font-bold tracking-tight leading-none tabular-nums text-[var(--accent)]">
              {informality?.latest?.value != null
                ? fmtPct(Number(informality.latest.value))
                : '\u2014'}
            </div>
            {informality?.latest?.period && (
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {informality.latest.period}
              </div>
            )}
          </Card>

          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Tasa de subocupaci&oacute;n
            </div>
            <div className="text-[28px] font-bold tracking-tight leading-none tabular-nums text-[var(--accent)]">
              {underemployment?.latest?.value != null
                ? fmtPct(Number(underemployment.latest.value))
                : '\u2014'}
            </div>
            {underemployment?.latest?.period && (
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {underemployment.latest.period}
              </div>
            )}
          </Card>

          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              PEA
            </div>
            <div className="text-[28px] font-bold tracking-tight leading-none tabular-nums text-[var(--accent)]">
              {pea?.latest?.value != null
                ? fmtCompact(Number(pea.latest.value) * 1000)
                : '\u2014'}
            </div>
            {pea?.latest?.period && (
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {pea.latest.period} &middot; miles de personas
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Informality by sector */}
      <SectionHeader title="Informalidad por sector" linkText="Ver detalle" linkHref="/empleo/informalidad" />
      <div className="px-[var(--pad-page)] mb-10">
        {hasMicrodata ? (
          <EmpleoClient sectorInformalityData={sectorInformalityData} />
        ) : (
          <Card large>
            <div className="py-6 text-center">
              <div className="text-base font-semibold text-white tracking-tight mb-2">
                Datos detallados pr&oacute;ximamente
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[480px] mx-auto">
                El desglose de informalidad por sector econ&oacute;mico estara disponible
                una vez que se procesen los microdatos de la ENOE.
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Employment trends */}
      <SectionHeader title="Tendencias de empleo" />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <div className="py-6 text-center">
            <div className="text-base font-semibold text-white tracking-tight mb-2">
              Datos detallados pr&oacute;ximamente
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[480px] mx-auto">
              Series de tiempo de desocupaci&oacute;n, informalidad y subocupaci&oacute;n
              con desglose por dimensi&oacute;n. Disponible al procesar los microdatos de la ENOE.
            </p>
          </div>
        </Card>
      </div>

      {/* Sub-pages navigation */}
      <SectionHeader title="Explora por tema" />
      <div className="px-[var(--pad-page)] mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Link href="/empleo/informalidad">
            <Card interactive large>
              <div className="text-base font-semibold text-white tracking-tight mb-1">
                Informalidad laboral
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Tasa de informalidad por estado, sector, edad y g&eacute;nero.
              </p>
            </Card>
          </Link>
          <Link href="/empleo/salarios">
            <Card interactive large>
              <div className="text-base font-semibold text-white tracking-tight mb-1">
                Salarios e ingresos
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Ingreso promedio por sector, nivel educativo y g&eacute;nero.
              </p>
            </Card>
          </Link>
        </div>
      </div>

      <Footer />
    </>
  );
}
