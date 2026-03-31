export interface Indicator {
  id: string;
  name_es: string;
  name_en: string | null;
  topic: string;
  subtopic: string | null;
  unit: string | null;
  frequency: string | null;
  source: string | null;
  geo_levels: string[] | null;
  last_synced_at: string | null;
  metadata: Record<string, unknown> | null;
}

export interface IndicatorValue {
  indicator_id: string;
  geo_code: string;
  period: string;
  period_date: string;
  value: number | null;
  status: string | null;
}

export interface GeographicArea {
  code: string;
  name: string;
  level: string;
  parent_code: string | null;
  lat: number | null;
  lng: number | null;
}
