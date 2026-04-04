import Breadcrumb from '@/components/ui/Breadcrumb';
import Card from '@/components/ui/Card';

export const metadata = {
  title: 'Calendario de Publicaciones — Mexico en Datos',
  description: 'Proximas publicaciones de datos del INEGI, Banxico y otras fuentes oficiales.',
};

export default function CalendarioPage() {
  return (
    <>
      <div className="pt-10 pb-6 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Calendario' },
          ]}
        />
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Calendario de Publicaciones
        </h1>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-[600px]">
          Fechas de publicacion de datos oficiales de Mexico: INEGI, Banxico, CONEVAL, SESNSP y mas.
        </p>
      </div>
      <div className="px-[var(--pad-page)] mb-10">
        <Card large>
          <div className="py-6 text-center">
            <div className="text-base font-semibold text-white tracking-tight mb-2">
              Datos pr&oacute;ximamente
            </div>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-[480px] mx-auto">
              Estamos integrando el calendario oficial de publicaciones del INEGI,
              las decisiones de pol&iacute;tica monetaria de Banxico, y las fechas de
              actualizaci&oacute;n de encuestas como ENOE, ENVIPE y ENSU.
            </p>
          </div>
        </Card>
      </div>

      <div className="px-[var(--pad-page)] mb-10">
        <div className="text-xs text-[var(--text-muted)] leading-relaxed">
          Fuentes: INEGI (Calendario de Difusi&oacute;n), Banxico, CONEVAL, SESNSP
        </div>
      </div>
    </>
  );
}
