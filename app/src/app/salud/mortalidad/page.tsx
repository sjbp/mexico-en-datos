import Link from 'next/link';
import type { Metadata } from 'next';
import Card from '@/components/ui/Card';
import SectionHeader from '@/components/ui/SectionHeader';
import HBar from '@/components/charts/HBar';
import Footer from '@/components/ui/Footer';

export const metadata: Metadata = {
  title: 'Mortalidad | Salud | M\u00e9xico en Datos',
  description:
    'Principales causas de muerte en M\u00e9xico, clasificaci\u00f3n CIE-10, tendencias hist\u00f3ricas por estado, edad y sexo.',
};

const CAUSE_BREAKDOWN = [
  { label: 'Enf. del coraz\u00f3n', value: 156.0, color: '#E74C3C' },
  { label: 'Diabetes mellitus', value: 102.0, color: '#F39C12' },
  { label: 'Tumores malignos', value: 73.0, color: '#9B59B6' },
  { label: 'Enf. del h\u00edgado', value: 41.0, color: '#E67E22' },
  { label: 'Cerebrovascular', value: 33.0, color: '#3498DB' },
  { label: 'Homicidios', value: 25.0, color: '#E74C3C' },
  { label: 'Inf. respiratorias', value: 22.0, color: '#2ECC71' },
  { label: 'Acc. de tr\u00e1nsito', value: 15.0, color: '#95A5A6' },
  { label: 'Enf. del ri\u00f1\u00f3n', value: 14.0, color: '#1ABC9C' },
  { label: 'COVID-19', value: 8.0, color: '#34495E' },
];

const ICD10_GROUPS = [
  { code: 'I00-I99', name: 'Enfermedades del coraz\u00f3n', description: 'Incluye infarto al miocardio, insuficiencia cardiaca, hipertensi\u00f3n.' },
  { code: 'E10-E14', name: 'Diabetes mellitus', description: 'Tipo 1 y tipo 2. M\u00e9xico tiene una de las tasas m\u00e1s altas del mundo.' },
  { code: 'C00-D48', name: 'Tumores malignos (c\u00e1ncer)', description: 'Todos los tipos de c\u00e1ncer.' },
  { code: 'K70-K77', name: 'Enfermedades del h\u00edgado', description: 'Cirrosis, hepatitis alcoh\u00f3lica, enfermedad hep\u00e1tica grasa.' },
  { code: 'I60-I69', name: 'Enfermedades cerebrovasculares', description: 'Accidentes cerebrovasculares (derrames).' },
  { code: 'X85-Y09', name: 'Homicidios', description: 'Agresiones que resultan en muerte.' },
  { code: 'J00-J99', name: 'Infecciones respiratorias', description: 'Neumon\u00eda, influenza, infecciones de v\u00edas respiratorias.' },
  { code: 'V01-V89', name: 'Accidentes de tr\u00e1nsito', description: 'Muertes por accidentes viales.' },
  { code: 'N17-N19', name: 'Enfermedades del ri\u00f1\u00f3n', description: 'Insuficiencia renal aguda y cr\u00f3nica.' },
  { code: 'U07', name: 'COVID-19', description: 'C\u00f3digo de emergencia asignado por la OMS.' },
];

export default function MortalidadPage() {
  return (
    <>
      <div className="px-[var(--pad-page)] pt-10 pb-6">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-4">
          <Link href="/" className="hover:text-[var(--accent)] transition-colors">Inicio</Link>
          <span>/</span>
          <Link href="/salud" className="hover:text-[var(--accent)] transition-colors">Salud</Link>
          <span>/</span>
          <span className="text-[var(--text-secondary)]">Mortalidad</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Mortalidad en M&eacute;xico
        </h1>
        <p className="text-[var(--text-secondary)] text-base leading-relaxed max-w-[640px]">
          An&aacute;lisis de las principales causas de muerte usando datos de INEGI y la
          Clasificaci&oacute;n Internacional de Enfermedades (CIE-10) de la OMS. Cada defunci&oacute;n
          registrada en M&eacute;xico incluye un c&oacute;digo CIE-10 que indica la causa, lo que
          permite clasificar y rastrear tendencias.
        </p>
      </div>

      {/* Cause breakdown */}
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
            data={CAUSE_BREAKDOWN}
            valueFmt={(v: number) => v.toFixed(0)}
          />
          <div className="text-xs text-[var(--text-muted)] mt-4 italic">
            Datos 2023 estimados. Serie hist&oacute;rica pr&oacute;ximamente.
          </div>
        </Card>
      </div>

      {/* Trend placeholder */}
      <SectionHeader title="Tendencia hist\u00f3rica" />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <div className="py-6 text-center">
            <p className="text-[var(--text-muted)] text-sm">
              Gr&aacute;fica de tendencias de mortalidad por causa (2010&ndash;2023) pr&oacute;ximamente.
            </p>
            <p className="text-[var(--text-muted)] text-xs mt-2">
              Se mostrar&aacute; la evoluci&oacute;n de cada causa de muerte a lo largo del tiempo,
              incluyendo el impacto de COVID-19 en 2020&ndash;2021.
            </p>
          </div>
        </Card>
      </div>

      {/* ICD-10 classification reference */}
      <SectionHeader title="Clasificaci\u00f3n CIE-10" />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <div className="mb-4">
            <div className="text-base font-semibold text-white tracking-tight">
              Grupos de causas de muerte
            </div>
            <div className="text-[13px] text-[var(--text-muted)] mt-1">
              Agrupaciones basadas en la Clasificaci&oacute;n Internacional de Enfermedades, 10a revisi&oacute;n (CIE-10)
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {ICD10_GROUPS.map((group) => (
              <div key={group.code} className="flex gap-3 text-sm">
                <div className="w-[80px] shrink-0 font-mono text-xs text-[var(--accent)] pt-[2px]">
                  {group.code}
                </div>
                <div>
                  <div className="text-white font-medium">{group.name}</div>
                  <div className="text-[var(--text-muted)] text-xs mt-0.5">{group.description}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Attribution */}
      <div className="px-[var(--pad-page)] mb-10">
        <div className="text-xs text-[var(--text-muted)] leading-relaxed">
          Fuentes: INEGI (Estad&iacute;sticas de Mortalidad), CONAPO (Proyecciones de Poblaci&oacute;n)
        </div>
      </div>

      <Footer />
    </>
  );
}
