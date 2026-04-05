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
    fullName: 'Instituto Nacional de Estadística y Geografía',
    icon: '\uD83D\uDCCA',
    description:
      'Indicadores económicos, encuestas, censos y microdatos. La principal fuente de estadísticas de México.',
    datasets: '14 series',
    updateFreq: 'Quincenal a anual',
    status: 'active',
    url: 'https://www.inegi.org.mx',
  },
  {
    slug: 'banxico',
    name: 'Banxico',
    fullName: 'Banco de México',
    icon: '\uD83C\uDFE6',
    description:
      'Tipo de cambio, tasas de interés, inflación, política monetaria e indicadores financieros.',
    datasets: '5 series',
    updateFreq: 'Diaria a quincenal',
    status: 'active',
    url: 'https://www.banxico.org.mx',
  },
  {
    slug: 'imss',
    name: 'IMSS',
    fullName: 'Instituto Mexicano del Seguro Social',
    icon: '\uD83C\uDFE5',
    description:
      'Trabajadores asegurados por estado y sector, cobertura de salud, utilización de servicios.',
    datasets: 'Próximamente',
    updateFreq: 'Mensual',
    status: 'coming',
    url: 'http://datos.imss.gob.mx',
    plannedDatasets: [
      'Trabajadores asegurados por entidad',
      'Trabajadores por sector económico',
      'Salario base de cotización',
      'Patrones registrados',
    ],
  },
  {
    slug: 'coneval',
    name: 'CONEVAL',
    fullName: 'Consejo Nacional de Evaluación de la Política de Desarrollo Social',
    icon: '\uD83D\uDCCB',
    description:
      'Medición de pobreza multidimensional, carencias sociales, evaluación de programas.',
    datasets: 'Próximamente',
    updateFreq: 'Bienal',
    status: 'coming',
    url: 'https://www.coneval.org.mx',
    plannedDatasets: [
      'Pobreza multidimensional por entidad',
      'Carencias sociales',
      'Líneas de pobreza por ingresos',
      'Índice de rezago social',
    ],
  },
  {
    slug: 'conapo',
    name: 'CONAPO',
    fullName: 'Consejo Nacional de Población',
    icon: '\uD83D\uDC65',
    description:
      'Proyecciones de población, esperanza de vida, tasas de fecundidad y mortalidad.',
    datasets: 'Próximamente',
    updateFreq: 'Anual',
    status: 'coming',
    url: 'https://www.gob.mx/conapo',
    plannedDatasets: [
      'Proyecciones de población 2020-2070',
      'Esperanza de vida al nacer',
      'Tasa global de fecundidad',
      'Razón de dependencia',
    ],
  },
  {
    slug: 'salud',
    name: 'Secretaría de Salud',
    fullName: 'Secretaría de Salud Federal',
    icon: '\u2695\uFE0F',
    description:
      'Catálogo de establecimientos de salud (CLUES), vigilancia epidemiológica, datos de COVID-19.',
    datasets: 'Próximamente',
    updateFreq: 'Variable',
    status: 'coming',
    url: 'https://www.gob.mx/salud',
    plannedDatasets: [
      'CLUES (catálogo de unidades médicas)',
      'Vigilancia epidemiológica semanal',
      'Anuarios de morbilidad',
      'Datos históricos COVID-19',
    ],
  },
];
