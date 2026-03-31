import Link from 'next/link';
import type { Metadata } from 'next';
import Card from '@/components/ui/Card';
import SectionHeader from '@/components/ui/SectionHeader';
import HBar from '@/components/charts/HBar';
import Footer from '@/components/ui/Footer';

export const metadata: Metadata = {
  title: 'Salud | M\u00e9xico en Datos',
  description:
    'Indicadores de salud p\u00fablica en M\u00e9xico: mortalidad, cobertura, infraestructura hospitalaria y m\u00e1s.',
};

// Static placeholder data based on known Mexican mortality statistics (2023 est.)
const LEADING_CAUSES = [
  { label: 'Enf. del coraz\u00f3n', value: 156.0, color: '#E74C3C' },
  { label: 'Diabetes mellitus', value: 102.0, color: '#F39C12' },
  { label: 'Tumores malignos', value: 73.0, color: '#9B59B6' },
  { label: 'Enf. del h\u00edgado', value: 41.0, color: '#E67E22' },
  { label: 'Cerebrovascular', value: 33.0, color: '#3498DB' },
  { label: 'Homicidios', value: 25.0, color: '#E74C3C' },
];

const SECTIONS = [
  {
    title: 'Mortalidad',
    description:
      'Principales causas de muerte, tendencias hist\u00f3ricas y clasificaci\u00f3n CIE-10. Datos de INEGI.',
    href: '/salud/mortalidad',
    ready: true,
  },
  {
    title: 'Cobertura de salud',
    description:
      'Asegurados IMSS, ISSSTE, Seguro Popular / INSABI / IMSS-Bienestar. Datos de IMSS y CONEVAL.',
    href: '/salud/cobertura',
    ready: true,
  },
  {
    title: 'Infraestructura',
    description:
      'Cat\u00e1logo de 30,000+ unidades m\u00e9dicas (CLUES): hospitales, cl\u00ednicas y centros de salud.',
    href: '/salud/infraestructura',
    ready: true,
  },
];

export default function SaludPage() {
  return (
    <>
      <div className="px-[var(--pad-page)] pt-10 pb-6">
        <Link
          href="/"
          className="text-[var(--text-muted)] text-sm hover:text-[var(--accent)] transition-colors"
        >
          &larr; Inicio
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-white mt-4 mb-2">
          Salud
        </h1>
        <p className="text-[var(--text-secondary)] text-base leading-relaxed max-w-[640px]">
          Indicadores de salud p&uacute;blica en M&eacute;xico: mortalidad, cobertura, infraestructura
          hospitalaria y acceso a servicios. Integramos datos de 6+ fuentes oficiales.
        </p>
      </div>

      {/* Headline metrics */}
      <div className="px-[var(--pad-page)] mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Principal causa de muerte
            </div>
            <div className="text-lg font-bold text-white">Enfermedades del coraz&oacute;n</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">~156 por cada 100k hab. (2023 est.)</div>
          </Card>
          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Esperanza de vida
            </div>
            <div className="text-lg font-bold text-white">75.1 a&ntilde;os</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">CONAPO 2023 est. (baj&oacute; en 2020-2021)</div>
          </Card>
          <Card>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Sin acceso a salud
            </div>
            <div className="text-lg font-bold text-white">39.1%</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">CONEVAL 2022, carencia por acceso</div>
          </Card>
        </div>
      </div>

      {/* Leading causes chart */}
      <SectionHeader title="Principales causas de muerte" />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <div className="mb-4">
            <div className="text-base font-semibold text-white tracking-tight">
              Tasa de mortalidad por causa (por cada 100,000 habitantes)
            </div>
            <div className="text-[13px] text-[var(--text-muted)] mt-1">
              Nacional, 2023 estimado
            </div>
          </div>
          <HBar
            data={LEADING_CAUSES}
            valueFmt={(v: number) => v.toFixed(0)}
          />
          <div className="text-xs text-[var(--text-muted)] mt-4 italic">
            Datos 2023 estimados. Serie hist&oacute;rica pr&oacute;ximamente.
          </div>
        </Card>
      </div>

      {/* Sub-sections */}
      <SectionHeader title="Explorar" />
      <div className="px-[var(--pad-page)] mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SECTIONS.map((section) => (
            <Link key={section.href} href={section.href}>
              <Card interactive className="h-full">
                <div className="text-base font-semibold text-white tracking-tight mb-2">
                  {section.title}
                </div>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {section.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Attribution */}
      <div className="px-[var(--pad-page)] mb-10">
        <div className="text-xs text-[var(--text-muted)] leading-relaxed">
          Fuentes: INEGI (Estad&iacute;sticas de Mortalidad), IMSS (Datos Abiertos),
          CONAPO (Proyecciones de Poblaci&oacute;n), CONEVAL, Secretar&iacute;a de Salud (CLUES)
        </div>
      </div>

      <Footer />
    </>
  );
}
