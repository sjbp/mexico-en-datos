import type { Metadata } from 'next';
import Breadcrumb from '@/components/ui/Breadcrumb';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import { getIndicatorValues, getLatestValue } from '@/lib/data';
import { fmtNum } from '@/lib/format';
import ComercioClient from './ComercioClient';

export const metadata: Metadata = {
  title: 'Comercio y Manufactura | México en Datos',
  description:
    'Exportaciones, importaciones, inversión extranjera directa, industria manufacturera y el fenómeno del nearshoring en México.',
};

const SUBSECTIONS = [
  {
    title: 'Socios Comerciales',
    description:
      'Principales socios comerciales de México: Estados Unidos, China, Canadá. Composición por tipo de bien.',
  },
  {
    title: 'Composición de Exportaciones',
    description:
      'Desglose de exportaciones por sector: automotriz, electrónica, agroalimentario, petróleo y manufactura.',
  },
  {
    title: 'Inversión Extranjera Directa',
    description:
      'IED por país de origen y sector receptor. Tendencias de nearshoring y nuevas plantas anunciadas.',
  },
];

export default async function ComercioPage() {
  const [exportValues, importValues, latestExports, latestImports, igaeIndustrial] =
    await Promise.all([
      getIndicatorValues('127598', '00', 60),
      getIndicatorValues('127601', '00', 60),
      getLatestValue('127598'),
      getLatestValue('127601'),
      getLatestValue('736883'),
    ]);

  // Compute trade balance from latest values
  const expVal = latestExports.latest?.value != null ? Number(latestExports.latest.value) : null;
  const impVal = latestImports.latest?.value != null ? Number(latestImports.latest.value) : null;
  const tradeBalance = expVal != null && impVal != null ? expVal - impVal : null;

  // Prepare chart data
  const chartExports = exportValues.map((v) => ({
    period: v.period,
    value: v.value != null ? Number(v.value) : null,
  }));
  const chartImports = importValues.map((v) => ({
    period: v.period,
    value: v.value != null ? Number(v.value) : null,
  }));

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

        {/* Headline stats — 4 cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Exportaciones totales
            </div>
            <div className="text-[28px] font-bold tracking-tight leading-none tabular-nums text-[var(--accent)]">
              {expVal != null ? '$' + fmtNum(expVal, 0) : '\u2014'}
            </div>
            {latestExports.latest?.period && (
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {latestExports.latest.period} &middot; millones de d&oacute;lares
              </div>
            )}
          </Card>

          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Importaciones totales
            </div>
            <div className="text-[28px] font-bold tracking-tight leading-none tabular-nums text-[var(--accent)]">
              {impVal != null ? '$' + fmtNum(impVal, 0) : '\u2014'}
            </div>
            {latestImports.latest?.period && (
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {latestImports.latest.period} &middot; millones de d&oacute;lares
              </div>
            )}
          </Card>

          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Balanza comercial
            </div>
            <div
              className={`text-[28px] font-bold tracking-tight leading-none tabular-nums ${
                tradeBalance != null && tradeBalance >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}
            >
              {tradeBalance != null
                ? (tradeBalance >= 0 ? '+$' : '-$') + fmtNum(Math.abs(tradeBalance), 0)
                : '\u2014'}
            </div>
            {latestExports.latest?.period && (
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {latestExports.latest.period} &middot; millones de d&oacute;lares
              </div>
            )}
          </Card>

          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              IGAE Industrial
            </div>
            <div className="text-[28px] font-bold tracking-tight leading-none tabular-nums text-[var(--accent)]">
              {igaeIndustrial.latest?.value != null
                ? fmtNum(Number(igaeIndustrial.latest.value), 1)
                : '\u2014'}
            </div>
            {igaeIndustrial.latest?.period && (
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                {igaeIndustrial.latest.period} &middot; &iacute;ndice base 2018=100
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Trade trend chart */}
      <SectionHeader title="Tendencia del comercio exterior" />
      <div className="px-[var(--pad-page)] mb-4">
        <ComercioClient exportValues={chartExports} importValues={chartImports} />
      </div>
      <div className="px-[var(--pad-page)] mb-12">
        <div className="border-l-2 border-[var(--accent)] pl-4 max-w-[700px]">
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)]" style={{ textWrap: 'pretty' }}>
            M&eacute;xico exporta m&aacute;s de $50,000 millones de d&oacute;lares al mes, cifra que lo coloca entre los 10 mayores exportadores del mundo. La balanza comercial muestra si el pa&iacute;s vende m&aacute;s de lo que compra: un super&aacute;vit indica fortaleza exportadora, mientras que un d&eacute;ficit refleja mayor dependencia de importaciones (com&uacute;n en meses de alta importaci&oacute;n de bienes intermedios para manufactura). Observa los patrones estacionales: diciembre suele mostrar ca&iacute;das por cierre de plantas, mientras que marzo-abril repuntan con la producci&oacute;n automotriz.
          </p>
        </div>
      </div>

      {/* Nearshoring context */}
      <SectionHeader title="Contexto" />
      <div className="px-[var(--pad-page)] mb-12">
        <Card large className="border-l-4 border-l-[var(--accent)]">
          <div className="text-base font-semibold text-white tracking-tight mb-3">
            El fen&oacute;meno del nearshoring
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
            La diversificaci&oacute;n de cadenas de suministro globales &mdash;acelerada por la
            pandemia y las tensiones comerciales entre Estados Unidos y China&mdash; ha
            posicionado a M&eacute;xico como uno de los principales beneficiarios del nearshoring.
            La manufactura mexicana, particularmente en los sectores automotriz,
            electr&oacute;nico y agroalimentario, ha experimentado un crecimiento sostenido
            impulsado por su proximidad geogr&aacute;fica, tratados comerciales (T-MEC) y costos
            laborales competitivos.
          </p>
          <div className="flex items-baseline gap-2 bg-[var(--surface)] rounded-lg p-3 border border-[var(--border)]">
            <span className="text-2xl font-bold text-[var(--accent)] tabular-nums">#1</span>
            <span className="text-sm text-[var(--text-secondary)]">
              M&eacute;xico se convirti&oacute; en el principal socio comercial de Estados Unidos
              en 2023, superando a China y Canad&aacute;.
            </span>
          </div>
        </Card>
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
