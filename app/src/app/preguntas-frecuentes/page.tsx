import type { Metadata } from 'next';
import Breadcrumb from '@/components/ui/Breadcrumb';

export const metadata: Metadata = {
  title: 'Preguntas Frecuentes | M\u00e9xico en Datos',
  description:
    'Resuelve tus dudas sobre M\u00e9xico en Datos: fuentes oficiales, metodolog\u00eda, actualizaci\u00f3n de datos, asistente de IA y m\u00e1s.',
};

interface FAQ {
  q: string;
  a: string;
}

const FAQS: FAQ[] = [
  // ── Sobre el proyecto ────────────────────────────────────
  {
    q: '\u00bfQu\u00e9 es M\u00e9xico en Datos?',
    a: 'Es una plataforma abierta y gratuita que re\u00fane indicadores oficiales sobre la econom\u00eda, el empleo, la seguridad y la salud de M\u00e9xico en un solo lugar. Nuestro objetivo es hacer m\u00e1s accesibles los datos p\u00fablicos que ya existen pero que suelen estar dispersos en m\u00faltiples sitios gubernamentales.',
  },
  {
    q: '\u00bfQui\u00e9n est\u00e1 detr\u00e1s de este proyecto?',
    a: 'M\u00e9xico en Datos es un proyecto independiente de datos abiertos. No tiene filiaci\u00f3n con ning\u00fan partido pol\u00edtico, gobierno ni empresa. El c\u00f3digo fuente es p\u00fablico en GitHub.',
  },
  {
    q: '\u00bfCu\u00e1l es el prop\u00f3sito del proyecto?',
    a: 'Democratizar el acceso a datos oficiales de M\u00e9xico. Queremos que cualquier persona \u2014 periodista, estudiante, investigador o ciudadano \u2014 pueda explorar y entender los n\u00fameros clave del pa\u00eds sin necesidad de navegar por m\u00faltiples portales gubernamentales ni saber programar.',
  },
  {
    q: '\u00bfEl proyecto es gratuito?',
    a: 'S\u00ed, completamente. No hay suscripciones, paywalls ni registro. Todos los datos y visualizaciones son de libre acceso.',
  },

  // ── Fuentes y datos ──────────────────────────────────────
  {
    q: '\u00bfDe d\u00f3nde provienen los datos?',
    a: 'Exclusivamente de fuentes oficiales del gobierno de M\u00e9xico: INEGI (indicadores econ\u00f3micos), Banco de M\u00e9xico (inflaci\u00f3n, tipo de cambio), SESNSP (seguridad), ENOE (empleo), ENVIPE (victimizaci\u00f3n), Secretar\u00eda de Salud (mortalidad), ENSANUT (salud) y CONEVAL (pobreza). Puedes consultar la lista completa en la secci\u00f3n de Fuentes.',
  },
  {
    q: '\u00bfCon qu\u00e9 frecuencia se actualizan los datos?',
    a: 'Depende de la fuente. El tipo de cambio se actualiza diariamente, la inflaci\u00f3n cada quincena, el PIB trimestralmente y las encuestas como ENVIPE y ENSANUT una vez al a\u00f1o. Cada tarjeta de fuente en la p\u00e1gina principal muestra la fecha de su \u00faltima actualizaci\u00f3n.',
  },
  {
    q: '\u00bfLos datos se modifican o editan de alguna forma?',
    a: 'No. Tomamos las cifras oficiales tal cual las publican las instituciones. No aplicamos ajustes, estimaciones propias ni proyecciones. Las \u00fanicas transformaciones son de formato: convertir c\u00f3digos de estado a nombres legibles, calcular variaciones entre periodos y generar visualizaciones.',
  },
  {
    q: '\u00bfPuedo descargar los datos?',
    a: 'Actualmente los datos se visualizan en la plataforma y a trav\u00e9s del asistente de IA. Estamos evaluando agregar exportaci\u00f3n a CSV en futuras versiones. Mientras tanto, todos los datos originales est\u00e1n disponibles en los sitios oficiales de cada fuente.',
  },
  {
    q: '\u00bfPor qu\u00e9 no aparece un indicador que busco?',
    a: 'Estamos agregando fuentes de forma progresiva. Si hay un indicador espec\u00edfico que te gustar\u00eda ver, puedes abrir un issue en nuestro repositorio de GitHub. Priorizamos las m\u00e9tricas de mayor inter\u00e9s p\u00fablico.',
  },

  // ── Asistente de IA ──────────────────────────────────────
  {
    q: '\u00bfC\u00f3mo funciona el asistente de IA?',
    a: 'Usa un modelo de lenguaje (Claude de Anthropic) conectado a nuestra base de datos. Cuando haces una pregunta, el modelo elige qu\u00e9 datos consultar, ejecuta la consulta y genera una respuesta con texto y gr\u00e1ficas. Todo ocurre en tiempo real sobre datos oficiales, no sobre informaci\u00f3n memorizada.',
  },
  {
    q: '\u00bfEl asistente puede inventar datos?',
    a: 'El sistema est\u00e1 dise\u00f1ado para responder \u00fanicamente con datos de nuestra base. Si no tiene informaci\u00f3n sobre un tema, lo indica expl\u00edcitamente. Como cualquier sistema de IA, puede cometer errores de interpretaci\u00f3n, por lo que siempre citamos la fuente para que puedas verificar.',
  },
  {
    q: '\u00bfQu\u00e9 tipos de preguntas puedo hacerle?',
    a: 'Cualquier pregunta sobre los datos disponibles: "\u00bfCu\u00e1l es la inflaci\u00f3n actual?", "Comparar informalidad vs ingreso por sector", "Homicidios por estado", "\u00bfQu\u00e9 delitos tienen mayor cifra negra?", entre muchas otras. Tambi\u00e9n puedes pedir gr\u00e1ficas espec\u00edficas como scatter plots o distribuciones.',
  },
  {
    q: '\u00bfQu\u00e9 tipos de gr\u00e1ficas genera?',
    a: 'Barras horizontales (rankings y comparaciones), l\u00edneas temporales (tendencias), scatter plots (correlaci\u00f3n entre dos variables) y distribuciones (c\u00f3mo se reparte un valor entre estados). El asistente elige autom\u00e1ticamente la mejor visualizaci\u00f3n seg\u00fan tu pregunta.',
  },

  // ── Metodolog\u00eda ────────────────────────────────────────
  {
    q: '\u00bfC\u00f3mo se recopilan los datos?',
    a: 'Usamos pipelines automatizados que consultan las APIs oficiales de INEGI y Banco de M\u00e9xico, y procesan los microdatos p\u00fablicos de encuestas como ENOE, ENVIPE y ENSANUT. Los datos se almacenan en una base de datos PostgreSQL y se sirven a trav\u00e9s de la plataforma.',
  },
  {
    q: '\u00bfQu\u00e9 significa "cifra negra"?',
    a: 'Es el porcentaje de delitos que no se denuncian ante las autoridades. Lo mide el INEGI a trav\u00e9s de la ENVIPE (Encuesta Nacional de Victimizaci\u00f3n). En M\u00e9xico, la cifra negra nacional ronda el 93%, lo que significa que la gran mayor\u00eda de los delitos no llega a conocimiento de las autoridades.',
  },
  {
    q: '\u00bfQu\u00e9 es la tasa de informalidad?',
    a: 'Es el porcentaje de trabajadores que no tienen acceso a seguridad social ni prestaciones laborales. La mide el INEGI a trav\u00e9s de la ENOE. Incluye tanto empleo independiente informal como empleo subordinado sin registro ante el IMSS.',
  },
  {
    q: '\u00bfQu\u00e9 indicadores econ\u00f3micos incluyen?',
    a: 'PIB real, IGAE (actividad econ\u00f3mica mensual), inflaci\u00f3n general y subyacente, tipo de cambio peso-d\u00f3lar, tasa de inter\u00e9s de referencia de Banxico, confianza del consumidor, exportaciones e importaciones, entre otros.',
  },

  // ── T\u00e9cnico y contribuciones ──────────────────────────
  {
    q: '\u00bfCon qu\u00e9 tecnolog\u00eda est\u00e1 construido?',
    a: 'Next.js (React) para el frontend, PostgreSQL (Neon) para la base de datos, Vercel AI SDK para el streaming del asistente de IA, y Claude de Anthropic como modelo de lenguaje. El c\u00f3digo es open source y est\u00e1 disponible en GitHub.',
  },
  {
    q: '\u00bfPuedo contribuir al proyecto?',
    a: 'S\u00ed. El repositorio est\u00e1 en GitHub y aceptamos contribuciones: desde reportar errores en los datos hasta agregar nuevas fuentes o mejorar las visualizaciones. Revisa los issues abiertos para ver en qu\u00e9 puedes ayudar.',
  },
  {
    q: '\u00bfPuedo usar los datos para mi investigaci\u00f3n o proyecto?',
    a: 'S\u00ed, todos los datos provienen de fuentes p\u00fablicas del gobierno mexicano y son de libre uso. Solo te pedimos que cites la fuente original (INEGI, Banxico, etc.) en tus publicaciones.',
  },
  {
    q: '\u00bfC\u00f3mo reporto un error en los datos?',
    a: 'Abre un issue en nuestro repositorio de GitHub describiendo el indicador, el valor que ves y el valor que esperar\u00edas seg\u00fan la fuente oficial. Investigamos cada reporte y corregimos lo antes posible.',
  },
];

export default function PreguntasFrecuentes() {
  return (
    <>
      <div className="pt-10 px-[var(--pad-page)]">
        <Breadcrumb
          items={[
            { label: 'Inicio', href: '/' },
            { label: 'Preguntas frecuentes' },
          ]}
        />

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Preguntas frecuentes
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-10 max-w-[640px]">
          Todo lo que necesitas saber sobre M&eacute;xico en Datos: de d&oacute;nde vienen
          los datos, c&oacute;mo funciona el asistente de IA y c&oacute;mo puedes contribuir.
        </p>
      </div>

      <div className="px-[var(--pad-page)] mb-16 max-w-[800px]">
        <dl>
          {FAQS.map((faq, i) => (
            <div key={i} className="py-5 border-b border-[var(--border)]">
              <dt className="text-[15px] font-semibold text-white mb-2">
                {faq.q}
              </dt>
              <dd className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                {faq.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* JSON-LD structured data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map((faq) => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            })),
          }),
        }}
      />
    </>
  );
}
