import Breadcrumb from '@/components/ui/Breadcrumb';
import Card from '@/components/ui/Card';
import Footer from '@/components/ui/Footer';
import { getEnsuStats } from '@/lib/data';

export const metadata = {
  title: 'Percepcion de Seguridad - Mexico en Datos',
  description: 'Percepcion de seguridad en las principales ciudades de Mexico. Datos trimestrales de la ENSU (INEGI).',
};

export default async function PercepcionPage() {
  const ensuData = await getEnsuStats();

  return (
    <>
      <div className="pt-10 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Seguridad', href: '/seguridad' },
            { label: 'Percepcion de seguridad' },
          ]}
        />

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Percepcion de Seguridad
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 max-w-2xl">
          La ENSU (Encuesta Nacional de Seguridad Publica Urbana) mide trimestralmente como se
          siente la poblacion en mas de 75 ciudades del pais: si se sienten seguros, si han sido
          testigos de actos delictivos, y si esperan ser victimas en los proximos meses.
        </p>

        {/* Explainer */}
        <Card large className="mb-8">
          <div className="text-base font-semibold text-white tracking-tight mb-2">
            Sobre la ENSU
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
            A diferencia de la ENVIPE (que mide victimizacion real), la ENSU captura la percepcion
            subjetiva de seguridad. Ambas son complementarias: una persona puede vivir en una
            ciudad con baja incidencia delictiva pero sentirse insegura (o viceversa).
          </p>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            La encuesta se realiza por telefono a personas de 18 anos y mas en 75+ ciudades de interes.
            Se publica trimestralmente desde finales de 2013.
          </p>
        </Card>
      </div>

      {/* ENSU quarterly trend placeholder */}
      <div className="px-[var(--pad-page)] mb-10">
        <h2 className="text-xl font-bold tracking-tight text-white mb-4">
          Tendencia trimestral
        </h2>
        <Card large>
          <div className="py-8 text-center">
            <div className="text-sm text-[var(--text-muted)]">
              Datos detallados proximamente
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Porcentaje de la poblacion que se siente insegura, trimestre a trimestre.
            </p>
          </div>
        </Card>
      </div>

      {/* City ranking placeholder */}
      <div className="px-[var(--pad-page)] mb-10">
        <h2 className="text-xl font-bold tracking-tight text-white mb-4">
          Ranking por ciudad
        </h2>
        <Card large>
          <div className="py-8 text-center">
            <div className="text-sm text-[var(--text-muted)]">
              Datos detallados proximamente
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Las ciudades donde mas (y menos) gente se siente insegura, con datos del ultimo trimestre disponible.
            </p>
          </div>
        </Card>
      </div>

      {/* Witnessed crime placeholder */}
      <div className="px-[var(--pad-page)] mb-10">
        <h2 className="text-xl font-bold tracking-tight text-white mb-4">
          Conductas delictivas presenciadas
        </h2>
        <Card large>
          <div className="py-8 text-center">
            <div className="text-sm text-[var(--text-muted)]">
              Datos detallados proximamente
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Porcentaje de la poblacion que ha presenciado consumo de alcohol en via publica, robos, vandalismo,
              disparos, venta de droga, y otros actos delictivos en los alrededores de su vivienda.
            </p>
          </div>
        </Card>
      </div>

      {/* Expectation of victimization placeholder */}
      <div className="px-[var(--pad-page)] mb-10">
        <h2 className="text-xl font-bold tracking-tight text-white mb-4">
          Expectativa de victimizacion
        </h2>
        <Card large>
          <div className="py-8 text-center">
            <div className="text-sm text-[var(--text-muted)]">
              Datos detallados proximamente
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Porcentaje de la poblacion que espera ser victima de algun delito en los proximos 3 meses.
            </p>
          </div>
        </Card>
      </div>

      {/* Attribution */}
      <div className="px-[var(--pad-page)] mb-6">
        <p className="text-xs text-[var(--text-muted)]">
          Fuente: INEGI, Encuesta Nacional de Seguridad Publica Urbana (ENSU).
        </p>
      </div>

      <Footer />
    </>
  );
}
