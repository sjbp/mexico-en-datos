import type { Metadata } from 'next';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Card from '@/components/ui/Card';
import SectionHeader from '@/components/ui/SectionHeader';
import HBar from '@/components/charts/HBar';
import { getLeadingCausesOfDeath } from '@/lib/data';

export const metadata: Metadata = {
  title: 'Salud | M\u00e9xico en Datos',
  description:
    'Indicadores de salud p\u00fablica en M\u00e9xico: mortalidad, cobertura, infraestructura hospitalaria y m\u00e1s.',
};

const CAUSE_LABELS: Record<string, string> = {
  cardiovascular: 'Enf. del coraz\u00f3n',
  diabetes: 'Diabetes mellitus',
  cancer: 'Tumores malignos',
  liver_disease: 'Enf. del h\u00edgado',
  cerebrovascular: 'Cerebrovascular',
  homicide: 'Homicidios',
  respiratory: 'Inf. respiratorias',
  traffic_accidents: 'Acc. de tr\u00e1nsito',
  kidney_disease: 'Enf. del ri\u00f1\u00f3n',
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

export default async function SaludPage() {
  const causes = await getLeadingCausesOfDeath(2023);

  const topCause = causes[0];
  const chartData = causes
    .filter((c) => c.rate_per_100k != null)
    .map((c) => ({
      label: CAUSE_LABELS[c.cause_group] || c.cause_group,
      value: Number(c.rate_per_100k),
      color: CAUSE_COLORS[c.cause_group] || 'var(--accent)',
    }));

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
            <div className="text-lg font-bold text-white">
              {topCause ? (CAUSE_LABELS[topCause.cause_group] || topCause.cause_group) : 'Enfermedades del coraz\u00f3n'}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {topCause?.rate_per_100k != null
                ? `${Number(topCause.rate_per_100k).toFixed(1)} por cada 100k hab. (2023)`
                : '~156 por cada 100k hab. (2023 est.)'}
            </div>
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

      {/* Context block */}
      <div className="px-[var(--pad-page)] mb-8">
        <div className="border-l-2 border-[var(--accent)] pl-4 max-w-[700px]">
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)] mb-2" style={{ textWrap: 'pretty' }}>
            M&eacute;xico enfrenta una doble carga de mortalidad: enfermedades cr&oacute;nicas (diabetes, coraz&oacute;n, ri&ntilde;&oacute;n) que dominan la tabla, y violencia que aparece entre las primeras 10 causas &mdash;algo inusual en pa&iacute;ses de ingreso similar. La diabetes es particularmente cr&iacute;tica: M&eacute;xico tiene la tasa m&aacute;s alta de la OCDE y es la &uacute;nica econom&iacute;a grande donde es la segunda causa de muerte.
          </p>
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)]" style={{ textWrap: 'pretty' }}>
            El COVID-19 ha ca&iacute;do significativamente desde el pico de 2020-2021, pero dej&oacute; una huella duradera: la esperanza de vida baj&oacute; casi 4 a&ntilde;os y a&uacute;n no se recupera del todo. El dato de 39% sin acceso a servicios de salud refleja el vac&iacute;o que dej&oacute; la desaparici&oacute;n del Seguro Popular, a&uacute;n no cubierto completamente por el IMSS-Bienestar.
          </p>
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
              Nacional, 2023 &mdash; Microdatos de Defunciones Registradas (INEGI / Secretar&iacute;a de Salud)
            </div>
          </div>
          <HBar
            data={chartData}
            valueFmt={(v: number) => v.toFixed(1)}
          />
          <div className="text-xs text-[var(--text-muted)] mt-4">
            Fuente: Estad&iacute;sticas de Defunciones Registradas 2023. Clasificaci&oacute;n CIE-10. Tasa calculada con proyecci&oacute;n CONAPO.
          </div>
        </Card>
      </div>

      {/* Proximamente sections */}
      <SectionHeader title="Proximamente" />
      <div className="px-[var(--pad-page)] mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
