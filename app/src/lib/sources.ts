export interface DataSource {
  slug: string;
  name: string;
  fullName: string;
  icon: string;
  description: string;
  datasets: string;
  updateFreq: string;
  status: 'active' | 'coming';
  url: string;
  plannedDatasets?: string[];
}

export const SOURCES: DataSource[] = [
  {
    slug: 'inegi',
    name: 'INEGI',
    fullName: 'Instituto Nacional de Estad\u00edstica y Geograf\u00eda',
    icon: '\uD83D\uDCCA',
    description:
      'Indicadores econ\u00f3micos: PIB, IGAE, confianza del consumidor, actividad industrial y m\u00e1s.',
    datasets: '14 series',
    updateFreq: 'Quincenal a anual',
    status: 'active',
    url: 'https://www.inegi.org.mx',
  },
  {
    slug: 'banxico',
    name: 'Banxico',
    fullName: 'Banco de M\u00e9xico',
    icon: '\uD83C\uDFE6',
    description:
      'Tipo de cambio, tasas de inter\u00e9s, inflaci\u00f3n general y subyacente.',
    datasets: '5 series',
    updateFreq: 'Diaria a quincenal',
    status: 'active',
    url: 'https://www.banxico.org.mx',
  },
  {
    slug: 'enoe',
    name: 'ENOE',
    fullName: 'Encuesta Nacional de Ocupaci\u00f3n y Empleo',
    icon: '\uD83D\uDCBC',
    description:
      'Empleo, informalidad, salarios, horas trabajadas por sector, edad, g\u00e9nero y educaci\u00f3n.',
    datasets: '7 dimensiones',
    updateFreq: 'Trimestral',
    status: 'active',
    url: 'https://www.inegi.org.mx/programas/enoe/',
  },
  {
    slug: 'sesnsp',
    name: 'SESNSP',
    fullName: 'Secretariado Ejecutivo del Sistema Nacional de Seguridad P\u00fablica',
    icon: '\uD83D\uDEE1\uFE0F',
    description:
      'Homicidios dolosos y otros delitos de alto impacto por estado, mensuales.',
    datasets: '2 series',
    updateFreq: 'Mensual',
    status: 'active',
    url: 'https://www.gob.mx/sesnsp',
  },
  {
    slug: 'envipe',
    name: 'ENVIPE',
    fullName: 'Encuesta Nacional de Victimizaci\u00f3n y Percepci\u00f3n sobre Seguridad P\u00fablica',
    icon: '\uD83D\uDD12',
    description:
      'Cifra negra, victimizaci\u00f3n por delito, confianza en polic\u00eda, ej\u00e9rcito y jueces.',
    datasets: '3 a\u00f1os',
    updateFreq: 'Anual',
    status: 'active',
    url: 'https://www.inegi.org.mx/programas/envipe/',
  },
  {
    slug: 'salud',
    name: 'Sec. Salud',
    fullName: 'Secretar\u00eda de Salud / DGIS',
    icon: '\uD83C\uDFE5',
    description:
      'Mortalidad por causas (CIE-10), cat\u00e1logo de establecimientos de salud (CLUES).',
    datasets: '6 a\u00f1os',
    updateFreq: 'Anual',
    status: 'active',
    url: 'https://www.gob.mx/salud',
  },
  {
    slug: 'ensanut',
    name: 'ENSANUT',
    fullName: 'Encuesta Nacional de Salud y Nutrici\u00f3n',
    icon: '\uD83E\uDE7A',
    description:
      'Prevalencia de obesidad, diabetes e hipertensi\u00f3n por estado, edad y sexo.',
    datasets: '2022',
    updateFreq: 'Cada 6 a\u00f1os',
    status: 'active',
    url: 'https://ensanut.insp.mx',
  },
  {
    slug: 'coneval',
    name: 'CONEVAL',
    fullName: 'Consejo Nacional de Evaluaci\u00f3n de la Pol\u00edtica de Desarrollo Social',
    icon: '\uD83D\uDCCB',
    description:
      'Medici\u00f3n de pobreza multidimensional, carencias sociales, l\u00edneas de pobreza.',
    datasets: 'Pr\u00f3ximamente',
    updateFreq: 'Bienal',
    status: 'coming',
    url: 'https://www.coneval.org.mx',
    plannedDatasets: [
      'Pobreza multidimensional por entidad',
      'Carencias sociales',
      '\u00cdndice de rezago social',
    ],
  },
  {
    slug: 'imss',
    name: 'IMSS',
    fullName: 'Instituto Mexicano del Seguro Social',
    icon: '\uD83C\uDFE5',
    description:
      'Trabajadores asegurados por estado y sector, salario base de cotizaci\u00f3n.',
    datasets: 'Pr\u00f3ximamente',
    updateFreq: 'Mensual',
    status: 'coming',
    url: 'http://datos.imss.gob.mx',
    plannedDatasets: [
      'Trabajadores asegurados por entidad',
      'Trabajadores por sector econ\u00f3mico',
      'Salario base de cotizaci\u00f3n',
    ],
  },
];
