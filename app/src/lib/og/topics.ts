/** Per-topic OG image configuration. Each topic picks a template:
 *  - `treemap`: default for topics with "top categories" data (seguridad, salud, empleo)
 *  - `editorial`: fallback for topics where a treemap doesn't fit (economia, comercio)
 *  - `dramatic`: manual override for "featured fact" shares (E template)
 *
 *  To override a topic with a dramatic "dato curioso" style, set its `override`
 *  here. The default template is used when `override` is absent.
 */

export type TopicKey = 'seguridad' | 'salud' | 'empleo' | 'economia' | 'comercio';

export interface TreemapConfig {
  kind: 'treemap';
  topicLabel: string;
  title: string;
  subtitle: string;
  dataSource: 'seguridad_crimes' | 'salud_causes' | 'empleo_sectors';
  sourceFooter: string;
}

export interface EditorialConfig {
  kind: 'editorial';
  topicLabel: string;
  title: string;
  subtitle: string;
  /** Up to 3 stat indicators shown as columns. */
  stats: Array<{
    label: string;
    indicatorId: string;
    format: 'percent' | 'currency' | 'raw' | 'compact';
  }>;
  /** Optional trend strip at the bottom — indicator id for a small chart. */
  chartIndicator?: string;
  chartLabel?: string;
  sourceFooter: string;
}

export interface DramaticConfig {
  kind: 'dramatic';
  topicLabel: string;
  preamble: string;
  /** Big line ("93 de cada 100") */
  fact: string;
  /** Continuation colored in accent ("delitos no se denuncian.") */
  subfact: string;
  /** Optional label above the sparkline strip. */
  sparkLabel?: string;
  /** Optional sparkline indicator for supporting chart. */
  sparkIndicator?: string;
  sourceFooter: string;
}

export type TopicOgConfig = TreemapConfig | EditorialConfig | DramaticConfig;

/** Default template per topic. */
export const TOPIC_DEFAULTS: Record<TopicKey, TopicOgConfig> = {
  seguridad: {
    kind: 'treemap',
    topicLabel: 'SEGURIDAD',
    title: 'Seguridad',
    subtitle: 'Delitos más frecuentes en México · ENVIPE',
    dataSource: 'seguridad_crimes',
    sourceFooter: 'Fuente: ENVIPE (INEGI)',
  },
  salud: {
    kind: 'treemap',
    topicLabel: 'SALUD',
    title: 'Salud',
    subtitle: 'Principales causas de muerte en México',
    dataSource: 'salud_causes',
    sourceFooter: 'Fuente: INEGI — Estadísticas de mortalidad',
  },
  empleo: {
    kind: 'treemap',
    topicLabel: 'EMPLEO',
    title: 'Empleo',
    subtitle: 'Sectores con mayor informalidad laboral',
    dataSource: 'empleo_sectors',
    sourceFooter: 'Fuente: ENOE (INEGI)',
  },
  economia: {
    kind: 'editorial',
    topicLabel: 'ECONOMÍA',
    title: 'Economía',
    subtitle: 'Crecimiento, precios y confianza en México',
    stats: [
      { label: 'INFLACIÓN ANUAL', indicatorId: 'SP30578', format: 'percent' },
      { label: 'CRECIMIENTO PIB', indicatorId: '735904', format: 'percent' },
      { label: 'CONFIANZA', indicatorId: '454168', format: 'raw' },
    ],
    chartIndicator: 'SP30578',
    chartLabel: 'INFLACIÓN ANUAL · ÚLTIMOS 24 MESES',
    sourceFooter: 'Fuente: INEGI · Banxico',
  },
  comercio: {
    kind: 'editorial',
    topicLabel: 'COMERCIO EXTERIOR',
    title: 'Comercio exterior',
    subtitle: 'Exportaciones, importaciones y la industria mexicana',
    stats: [
      { label: 'EXPORTACIONES · MDD', indicatorId: '127598', format: 'compact' },
      { label: 'IMPORTACIONES · MDD', indicatorId: '127601', format: 'compact' },
    ],
    chartIndicator: '127598',
    chartLabel: 'EXPORTACIONES TOTALES · ÚLTIMOS 60 MESES',
    sourceFooter: 'Fuente: INEGI · Balanza comercial',
  },
};

/** Manual overrides — hand-curated "dato dramático" versions. Populate when you want
 *  a specific topic's preview to hit social/WhatsApp as a featured fact instead of the
 *  default template. Unset = use default from TOPIC_DEFAULTS.
 */
export const TOPIC_OVERRIDES: Partial<Record<TopicKey, DramaticConfig>> = {
  // Example (not active — uncomment to flip seguridad to the editorial op-ed cover):
  // seguridad: {
  //   kind: 'dramatic',
  //   topicLabel: 'SEGURIDAD',
  //   preamble: 'EN MÉXICO,',
  //   fact: '93 de cada 100',
  //   subfact: 'delitos no se denuncian.',
  //   sparkLabel: 'CIFRA NEGRA NACIONAL · TENDENCIA',
  //   sparkIndicator: undefined,
  //   sourceFooter: 'Fuente: ENVIPE (INEGI)',
  // },
};

export function getTopicConfig(topic: TopicKey): TopicOgConfig {
  return TOPIC_OVERRIDES[topic] ?? TOPIC_DEFAULTS[topic];
}
