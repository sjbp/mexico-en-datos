export interface ScorecardItem {
  id: string;
  label: string;
  sourceType: 'inegi' | 'static';
  indicatorId?: string;
  staticValue?: number;
  staticPeriod?: string;
  staticDate?: string;
  sparkIndicatorId?: string;    // Optional: pull sparkline from this indicator even for static items
  unit: string;
  format: string;
  isGoodDown: boolean;
  context: string;
  href: string;
}

export const SCORECARD: ScorecardItem[] = [
  {
    id: 'inflacion',
    label: 'Inflacion anual',
    sourceType: 'inegi',
    indicatorId: 'SP30578',
    unit: 'percent',
    format: 'percent1',
    isGoodDown: true,
    context: 'Var. % anual INPC · Banxico',
    href: '/indicador/SP30578',
  },
  {
    id: 'pib',
    label: 'Crecimiento PIB',
    sourceType: 'inegi',
    indicatorId: '735904',
    unit: 'percent',
    format: 'percent1',
    isGoodDown: false,
    context: 'Variacion % anual · Trimestral',
    href: '/indicador/735904',
  },
  {
    id: 'desempleo',
    label: 'Desempleo',
    sourceType: 'inegi',
    indicatorId: '444612',
    unit: 'percent',
    format: 'percent1',
    isGoodDown: true,
    context: 'Tasa de desocupacion · 32 ciudades',
    href: '/indicador/444612',
  },
  {
    id: 'tipo_cambio',
    label: 'Tipo de cambio',
    sourceType: 'inegi',
    indicatorId: 'SF43718',
    unit: 'currency',
    format: 'currency2',
    isGoodDown: true,
    context: 'USD/MXN FIX · Banxico',
    href: '/indicador/SF43718',
  },
  {
    id: 'informalidad',
    label: 'Informalidad laboral',
    sourceType: 'inegi',
    indicatorId: '444619',
    unit: 'percent',
    format: 'percent1',
    isGoodDown: true,
    context: 'TIL1 · 32 ciudades',
    href: '/indicador/444619',
  },
  {
    id: 'homicidios',
    label: 'Homicidios',
    sourceType: 'inegi',
    indicatorId: 'sesnsp_homicide_rate',
    sparkIndicatorId: 'sesnsp_homicide_count',
    unit: 'rate',
    format: 'rate1',
    isGoodDown: true,
    context: 'Tasa por 100 mil hab. · SESNSP',
    href: '/seguridad',
  },
  {
    id: 'sin_salud',
    label: 'Sin acceso a salud',
    sourceType: 'static',
    staticValue: 39.1,
    staticPeriod: 'CONEVAL · 2022',
    staticDate: '2022-01-01',
    sparkIndicatorId: 'coneval_sin_salud',
    unit: 'percent',
    format: 'percent1',
    isGoodDown: true,
    context: '% de la poblacion',
    href: '/indicador/coneval_sin_salud',
  },
  {
    id: 'confianza',
    label: 'Confianza del consumidor',
    sourceType: 'inegi',
    indicatorId: '454168',
    unit: 'index',
    format: 'index1',
    isGoodDown: false,
    context: 'ICC > 50 = optimismo',
    href: '/indicador/454168',
  },
];
