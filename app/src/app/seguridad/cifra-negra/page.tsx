import Breadcrumb from '@/components/ui/Breadcrumb';
import Card from '@/components/ui/Card';
import { getCifraNegra } from '@/lib/data';

export const metadata = {
  title: 'Cifra Negra - Mexico en Datos',
  description: 'Analisis de delitos no denunciados en Mexico: la cifra negra por estado y tipo de delito. Fuente: ENVIPE (INEGI).',
};

export default async function CifraNegraPage() {
  const cifraNegraNational = await getCifraNegra(undefined, '00');
  const latest = cifraNegraNational[0] ?? null;

  return (
    <>
      <div className="pt-10 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Seguridad', href: '/seguridad' },
            { label: 'Cifra negra' },
          ]}
        />

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Cifra Negra
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-8 max-w-2xl">
          La cifra negra mide el porcentaje de delitos que no se denuncian o que no derivan en una
          carpeta de investigacion. Es el indicador mas importante para entender la brecha entre
          la criminalidad real y la reportada oficialmente.
        </p>

        {/* Headline number */}
        {latest?.cifra_negra != null && (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-8 inline-block">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-2">
              Cifra negra nacional
            </div>
            <div className="text-[48px] font-bold tabular-nums text-[var(--negative)] leading-none mb-1">
              {Number(latest.cifra_negra).toFixed(1)}%
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              de los delitos no se denuncian o no se investigan ({latest.year})
            </div>
          </div>
        )}

        {/* Why it matters */}
        <Card large className="mb-8">
          <div className="text-base font-semibold text-white tracking-tight mb-2">
            Por que importa
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
            Cuando se habla de seguridad en Mexico, las cifras oficiales de incidencia delictiva
            solo cuentan los delitos que la gente denuncia. Pero la ENVIPE revela que la gran
            mayoria de los delitos nunca llegan a conocimiento de las autoridades.
          </p>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
            Esto tiene consecuencias profundas: los recursos policiales se asignan con base en datos
            incompletos, los ciudadanos pierden confianza en las instituciones, y la impunidad se
            retroalimenta (si no denuncio porque no sirve de nada, las autoridades no registran el
            delito, y las estadisticas muestran que &ldquo;baja la criminalidad&rdquo;).
          </p>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            Las principales razones para no denunciar: desconfianza en la autoridad, considerarlo
            perdida de tiempo, miedo a represalias del agresor, tramites largos y hostilidad
            institucional.
          </p>
        </Card>
      </div>

      {/* State-level breakdown placeholder */}
      <div className="px-[var(--pad-page)] mb-10">
        <h2 className="text-xl font-bold tracking-tight text-white mb-4">
          Cifra negra por estado
        </h2>
        <Card large>
          <div className="py-8 text-center">
            <div className="text-sm text-[var(--text-muted)]">
              Datos detallados proximamente
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Ranking de estados por porcentaje de delitos no denunciados, con comparativo contra el promedio nacional.
            </p>
          </div>
        </Card>
      </div>

      {/* By crime type placeholder */}
      <div className="px-[var(--pad-page)] mb-10">
        <h2 className="text-xl font-bold tracking-tight text-white mb-4">
          Cifra negra por tipo de delito
        </h2>
        <Card large>
          <div className="py-8 text-center">
            <div className="text-sm text-[var(--text-muted)]">
              Datos detallados proximamente
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Comparativa de cifra negra por tipo de delito: extorsion, fraude, robo, amenazas, lesiones.
              Algunos delitos tienen tasas de no-denuncia superiores al 98%.
            </p>
          </div>
        </Card>
      </div>

      {/* Historical trend placeholder */}
      <div className="px-[var(--pad-page)] mb-10">
        <h2 className="text-xl font-bold tracking-tight text-white mb-4">
          Tendencia historica
        </h2>
        <Card large>
          <div className="py-8 text-center">
            <div className="text-sm text-[var(--text-muted)]">
              Datos detallados proximamente
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Evolucion de la cifra negra desde 2011. La ENVIPE se publica anualmente.
            </p>
          </div>
        </Card>
      </div>

      {/* Attribution */}
      <div className="px-[var(--pad-page)] mb-6">
        <p className="text-xs text-[var(--text-muted)]">
          Fuente: INEGI, Encuesta Nacional de Victimizacion y Percepcion sobre Seguridad Publica (ENVIPE).
        </p>
      </div>

    </>
  );
}
