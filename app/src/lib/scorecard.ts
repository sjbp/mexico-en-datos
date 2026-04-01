export interface ScorecardItem {
  id: string;
  label: string;
  sourceType: 'inegi' | 'derived' | 'static';
  indicatorId?: string;
  derivedFrom?: string;
  derivedMethod?: 'yoy_growth' | 'yoy_pct_change';
  staticValue?: number;
  staticPeriod?: string;
  staticDate?: string;
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
    sourceType: 'derived',
    derivedFrom: '444612',
    derivedMethod: 'yoy_pct_change',
    unit: 'percent',
    format: 'percent1',
    isGoodDown: true,
    context: 'Meta Banxico: 3% +/- 1pp',
    href: '/indicador/444612',
  },
  {
    id: 'pib_growth',
    label: 'Crecimiento PIB',
    sourceType: 'derived',
    derivedFrom: '735904',
    derivedMethod: 'yoy_growth',
    unit: 'percent',
    format: 'percent1',
    isGoodDown: false,
    context: 'Variacion % anual',
    href: '/indicador/735904',
  },
  {
    id: 'desempleo',
    label: 'Desempleo',
    sourceType: 'inegi',
    indicatorId: '444614',
    unit: 'percent',
    format: 'percent1',
    isGoodDown: true,
    context: 'Tasa de desocupacion',
    href: '/indicador/444614',
  },
  {
    id: 'tipo_cambio',
    label: 'Tipo de cambio',
    sourceType: 'static',
    staticValue: 20.51,
    staticPeriod: 'Banxico · Proximamente',
    staticDate: '2026-03-01',
    unit: 'currency',
    format: 'currency2',
    isGoodDown: true,
    context: 'USD/MXN',
    href: '/calendario',
  },
  {
    id: 'informalidad',
    label: 'Informalidad laboral',
    sourceType: 'inegi',
    indicatorId: '444793',
    unit: 'percent',
    format: 'percent1',
    isGoodDown: true,
    context: '% de ocupados informales',
    href: '/indicador/444793',
  },
  {
    id: 'homicidios',
    label: 'Homicidios',
    sourceType: 'static',
    staticValue: 25.2,
    staticPeriod: 'SESNSP · 2024',
    staticDate: '2024-12-01',
    unit: 'rate',
    format: 'rate1',
    isGoodDown: true,
    context: 'Tasa por 100 mil hab.',
    href: '/seguridad',
  },
  {
    id: 'sin_salud',
    label: 'Sin acceso a salud',
    sourceType: 'static',
    staticValue: 39.1,
    staticPeriod: 'CONEVAL · 2024',
    staticDate: '2024-01-01',
    unit: 'percent',
    format: 'percent1',
    isGoodDown: true,
    context: '% de la poblacion',
    href: '/salud/cobertura',
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
