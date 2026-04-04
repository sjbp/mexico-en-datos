import type { Metadata } from 'next';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Card from '@/components/ui/Card';
import SectionHeader from '@/components/ui/SectionHeader';
import HBar from '@/components/charts/HBar';

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

export default function SaludPage() {
  return (
    <>
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

      {/* Proximamente sections */}
      <SectionHeader title="Proximamente" />
      <div className="px-[var(--pad-page)] mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card large>
            <div className="text-base font-semibold text-white tracking-tight mb-1">
              Mortalidad
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">
              Principales causas de muerte, tendencias hist&oacute;ricas y clasificaci&oacute;n CIE-10.
            </p>
            <div className="text-xs text-[var(--accent)]">
              Proximamente con datos de INEGI (Estad&iacute;sticas de Mortalidad)
            </div>
          </Card>
          <Card large>
            <div className="text-base font-semibold text-white tracking-tight mb-1">
              Cobertura de salud
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">
              Asegurados IMSS, ISSSTE, IMSS-Bienestar y carencia por acceso a servicios de salud.
            </p>
            <div className="text-xs text-[var(--accent)]">
              Proximamente con datos de IMSS y CONEVAL
            </div>
          </Card>
          <Card large>
            <div className="text-base font-semibold text-white tracking-tight mb-1">
              Infraestructura
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">
              Cat&aacute;logo de 30,000+ unidades m&eacute;dicas: hospitales, cl&iacute;nicas y centros de salud.
            </p>
            <div className="text-xs text-[var(--accent)]">
              Proximamente con datos de CLUES (Secretar&iacute;a de Salud)
            </div>
          </Card>
        </div>
      </div>

      {/* Attribution */}
      <div className="px-[var(--pad-page)] mb-10">
        <div className="text-xs text-[var(--text-muted)] leading-relaxed">
          Fuentes: INEGI (Estad&iacute;sticas de Mortalidad), IMSS (Datos Abiertos),
          CONAPO (Proyecciones de Poblaci&oacute;n), CONEVAL, Secretar&iacute;a de Salud (CLUES)
        </div>
      </div>

    </>
  );
}
