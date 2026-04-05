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

export interface EmploymentStat {
  quarter: string;
  quarter_date: string;
  geo_code: string;
  dimension: string;
  dimension_value: string;
  employed: number | null;
  informal: number | null;
  underemployed: number | null;
  unemployment_rate: number | null;
  informality_rate: number | null;
  avg_hours_worked: number | null;
  avg_monthly_income: number | null;
}

export interface EnvipeStat {
  year: number;
  geo_code: string;
  crime_type: string;
  prevalence_rate: number | null;
  cifra_negra: number | null;
  reported_rate: number | null;
  trust_police: number | null;
  trust_military: number | null;
  trust_judges: number | null;
  cost_per_victim: number | null;
}

export interface EnsuStat {
  quarter: string;
  quarter_date: string;
  city_code: string;
  city_name: string;
  feels_unsafe_pct: number | null;
  feels_unsafe_night_pct: number | null;
  witnessed_crime_pct: number | null;
  expects_crime_pct: number | null;
}

export interface MortalityStat {
  year: number;
  geo_code: string;
  cause_group: string;
  icd10_range: string | null;
  age_group: string;
  sex: string;
  deaths: number;
  rate_per_100k: number | null;
}

export interface HealthFacility {
  clues_id: string;
  name: string;
  institution: string;
  facility_type: string;
  geo_code: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

export interface EnsanutStat {
  year: number;
  geo_code: string;
  condition: string;           // 'obesity', 'overweight', 'diabetes', 'hypertension', 'hypertension_measured'
  age_group: string;           // '20+', '20-29', '30-39', etc.
  sex: string;                 // 'M', 'F', 'all'
  prevalence_pct: number | null;
  sample_size: number | null;
}
