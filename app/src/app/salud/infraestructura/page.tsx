import Link from 'next/link';
import type { Metadata } from 'next';
import Breadcrumb from '@/components/ui/Breadcrumb';
import Card from '@/components/ui/Card';
import SectionHeader from '@/components/ui/SectionHeader';
import HBar from '@/components/charts/HBar';

export const metadata: Metadata = {
  title: 'Infraestructura de Salud | M\u00e9xico en Datos',
  description:
    'Cat\u00e1logo de unidades m\u00e9dicas en M\u00e9xico (CLUES): hospitales, cl\u00ednicas y centros de salud por instituci\u00f3n.',
};

// Placeholder data: approximate facility counts by institution from CLUES
const FACILITIES_BY_INSTITUTION = [
  { label: 'SSA / IMSS-Bienestar', value: 14200, color: '#2ECC71' },
  { label: 'IMSS', value: 5400, color: '#3498DB' },
  { label: 'ISSSTE', value: 1200, color: '#9B59B6' },
  { label: 'Privada', value: 8500, color: '#E67E22' },
  { label: 'PEMEX / SEDENA / SEMAR', value: 450, color: '#95A5A6' },
  { label: 'Otras', value: 1800, color: '#34495E' },
];

const FACILITIES_BY_TYPE = [
  { label: 'Centros de salud', value: 13500, color: '#2ECC71' },
  { label: 'Hospitales', value: 4800, color: '#E74C3C' },
  { label: 'Cl\u00ednicas', value: 6200, color: '#3498DB' },
  { label: 'Laboratorios', value: 2100, color: '#F39C12' },
  { label: 'Otros', value: 4900, color: '#95A5A6' },
];

export default function InfraestructuraPage() {
  return (
    <>
      <div className="px-[var(--pad-page)] pt-10 pb-6">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Salud', href: '/salud' },
            { label: 'Infraestructura' },
          ]}
        />
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Infraestructura de salud
        </h1>
        <p className="text-[var(--text-secondary)] text-base leading-relaxed max-w-[640px]">
          M&eacute;xico cuenta con m&aacute;s de 30,000 unidades m&eacute;dicas registradas en el
          cat&aacute;logo CLUES (Clave &Uacute;nica de Establecimientos de Salud) de la
          Secretar&iacute;a de Salud. Incluye hospitales, cl&iacute;nicas, centros de salud y
          laboratorios de todas las instituciones p&uacute;blicas y privadas.
        </p>
      </div>

      {/* Facilities by institution */}
      <SectionHeader title="Unidades m\u00e9dicas por instituci\u00f3n" />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <div className="mb-4">
            <div className="text-base font-semibold text-white tracking-tight">
              Establecimientos de salud activos
            </div>
            <div className="text-[13px] text-[var(--text-muted)] mt-1">
              Estimado nacional, cat&aacute;logo CLUES
            </div>
          </div>
          <HBar
            data={FACILITIES_BY_INSTITUTION}
            valueFmt={(v: number) => v.toLocaleString('es-MX')}
          />
          <div className="text-xs text-[var(--text-muted)] mt-4 italic">
            Datos estimados del cat&aacute;logo CLUES. Cifras reales pr&oacute;ximamente.
          </div>
        </Card>
      </div>

      {/* Facilities by type */}
      <SectionHeader title="Unidades por tipo" />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <div className="mb-4">
            <div className="text-base font-semibold text-white tracking-tight">
              Establecimientos por tipo de unidad
            </div>
            <div className="text-[13px] text-[var(--text-muted)] mt-1">
              Estimado nacional
            </div>
          </div>
          <HBar
            data={FACILITIES_BY_TYPE}
            valueFmt={(v: number) => v.toLocaleString('es-MX')}
          />
        </Card>
      </div>

      {/* Map placeholder */}
      <SectionHeader title="Mapa de unidades m\u00e9dicas" />
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <div className="py-8 text-center">
            <p className="text-[var(--text-muted)] text-sm">
              Mapa interactivo con las 30,000+ unidades m&eacute;dicas geolocalizadas pr&oacute;ximamente.
            </p>
            <p className="text-[var(--text-muted)] text-xs mt-2">
              Cada punto incluir&aacute; nombre, instituci&oacute;n, tipo y servicios disponibles.
            </p>
          </div>
        </Card>
      </div>

      {/* Attribution */}
      <div className="px-[var(--pad-page)] mb-10">
        <div className="text-xs text-[var(--text-muted)] leading-relaxed">
          Fuente: Secretar&iacute;a de Salud (CLUES &mdash; Clave &Uacute;nica de Establecimientos de Salud)
        </div>
      </div>

    </>
  );
}
