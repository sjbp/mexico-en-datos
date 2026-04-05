import { query } from './db';
import type { Indicator, IndicatorValue, EmploymentStat, EnvipeStat, EnsuStat, MortalityStat, HealthFacility, EnsanutStat } from './types';

export async function getIndicators(topic?: string): Promise<Indicator[]> {
  try {
    return await query<Indicator>(
      `SELECT * FROM indicators WHERE ($1::text IS NULL OR topic = $1) ORDER BY topic, name_es`,
      [topic ?? null]
    );
  } catch (error) {
    console.error('Error fetching indicators:', error);
    return [];
  }
}

export async function getIndicator(id: string): Promise<Indicator | null> {
  try {
    const rows = await query<Indicator>(
      `SELECT * FROM indicators WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  } catch (error) {
    console.error('Error fetching indicator:', error);
    return null;
  }
}

export async function getIndicatorValues(
  id: string,
  geo: string = '00',
  limit?: number
): Promise<IndicatorValue[]> {
  try {
    const rows = await query<IndicatorValue>(
      limit
        ? `SELECT * FROM indicator_values
           WHERE indicator_id = $1 AND geo_code = $2
           ORDER BY period_date DESC
           LIMIT $3`
        : `SELECT * FROM indicator_values
           WHERE indicator_id = $1 AND geo_code = $2
           ORDER BY period_date`,
      limit ? [id, geo, limit] : [id, geo]
    );
    // Always return ascending order for charts
    if (limit) rows.reverse();
    return rows;
  } catch (error) {
    console.error('Error fetching indicator values:', error);
    return [];
  }
}

export async function getLatestValue(
  id: string,
  geo: string = '00'
): Promise<{ latest: IndicatorValue | null; previous: IndicatorValue | null }> {
  try {
    const rows = await query<IndicatorValue>(
      `SELECT * FROM indicator_values
       WHERE indicator_id = $1 AND geo_code = $2
       ORDER BY period_date DESC
       LIMIT 2`,
      [id, geo]
    );
    return {
      latest: rows[0] ?? null,
      previous: rows[1] ?? null,
    };
  } catch (error) {
    console.error('Error fetching latest value:', error);
    return { latest: null, previous: null };
  }
}

export async function getTopicsWithCounts(): Promise<{ topic: string; count: number }[]> {
  try {
    return await query<{ topic: string; count: number }>(
      `SELECT topic, COUNT(*)::int as count FROM indicators GROUP BY topic ORDER BY topic`
    );
  } catch (error) {
    console.error('Error fetching topics:', error);
    return [];
  }
}

export async function getIndicatorValuesByState(
  id: string,
  options?: { latest?: boolean },
): Promise<(IndicatorValue & { geo_name: string })[]> {
  try {
    if (options?.latest) {
      return await query<IndicatorValue & { geo_name: string }>(
        `SELECT iv.*, ga.name as geo_name
         FROM indicator_values iv
         JOIN geographic_areas ga ON ga.code = iv.geo_code
         WHERE iv.indicator_id = $1
           AND iv.geo_code != '00'
           AND iv.period_date = (
             SELECT MAX(iv2.period_date) FROM indicator_values iv2
             WHERE iv2.indicator_id = $1 AND iv2.geo_code = iv.geo_code
           )
         ORDER BY iv.value DESC`,
        [id]
      );
    }
    return await query<IndicatorValue & { geo_name: string }>(
      `SELECT iv.*, ga.name as geo_name
       FROM indicator_values iv
       JOIN geographic_areas ga ON ga.code = iv.geo_code
       WHERE iv.indicator_id = $1 AND iv.geo_code != '00'
       ORDER BY iv.period_date, iv.geo_code`,
      [id]
    );
  } catch (error) {
    console.error('Error fetching indicator values by state:', error);
    return [];
  }
}

// ── Employment (Scope 2) ────────────────────────────────────────────────

export async function getEmploymentByDimension(
  dimension: string,
  geo: string = '00',
  quarter?: string,
): Promise<EmploymentStat[]> {
  try {
    if (quarter) {
      return await query<EmploymentStat>(
        `SELECT * FROM employment_stats
         WHERE dimension = $1 AND geo_code = $2 AND quarter = $3
         ORDER BY dimension_value`,
        [dimension, geo, quarter]
      );
    }
    // Latest quarter
    return await query<EmploymentStat>(
      `SELECT es.* FROM employment_stats es
       INNER JOIN (
         SELECT MAX(quarter_date) AS max_date FROM employment_stats
         WHERE dimension = $1 AND geo_code = $2
       ) latest ON es.quarter_date = latest.max_date
       WHERE es.dimension = $1 AND es.geo_code = $2
       ORDER BY es.dimension_value`,
      [dimension, geo]
    );
  } catch (error) {
    console.error('Error fetching employment by dimension:', error);
    return [];
  }
}

export async function getEmploymentTimeseries(
  dimension: string,
  dimensionValue: string,
  metric: string,
): Promise<{ quarter: string; quarter_date: string; value: number | null }[]> {
  // Allowlist of valid metric columns to prevent SQL injection
  const validMetrics = [
    'employed', 'informal', 'underemployed',
    'unemployment_rate', 'informality_rate',
    'avg_hours_worked', 'avg_monthly_income',
  ];
  if (!validMetrics.includes(metric)) {
    console.error('Invalid metric:', metric);
    return [];
  }

  try {
    return await query<{ quarter: string; quarter_date: string; value: number | null }>(
      `SELECT quarter, quarter_date, ${metric} as value
       FROM employment_stats
       WHERE dimension = $1 AND dimension_value = $2 AND geo_code = '00'
       ORDER BY quarter_date`,
      [dimension, dimensionValue]
    );
  } catch (error) {
    console.error('Error fetching employment timeseries:', error);
    return [];
  }
}

export async function getEmploymentTrends(): Promise<{
  quarters: string[];
  informality: (number | null)[];
  avgIncome: (number | null)[];
}> {
  try {
    // Aggregate national-level stats per quarter using gender dimension (Hombre + Mujer = total)
    const rows = await query<{
      quarter: string;
      quarter_date: string;
      informality_rate: number | null;
      avg_income: number | null;
    }>(
      `SELECT quarter, quarter_date,
              CASE WHEN SUM(employed) > 0
                   THEN ROUND((SUM(informal)::numeric / SUM(employed)::numeric) * 100, 2)
                   ELSE NULL END as informality_rate,
              ROUND(AVG(avg_monthly_income)::numeric, 0) as avg_income
       FROM employment_stats
       WHERE dimension = 'gender' AND geo_code = '00'
       GROUP BY quarter, quarter_date
       ORDER BY quarter_date`
    );

    return {
      quarters: rows.map(r => r.quarter),
      informality: rows.map(r => r.informality_rate != null ? Number(r.informality_rate) : null),
      avgIncome: rows.map(r => r.avg_income != null ? Number(r.avg_income) : null),
    };
  } catch (error) {
    console.error('Error fetching employment trends:', error);
    return { quarters: [], informality: [], avgIncome: [] };
  }
}

export async function getLatestEmploymentQuarter(): Promise<string | null> {
  try {
    const rows = await query<{ quarter: string }>(
      `SELECT quarter FROM employment_stats ORDER BY quarter_date DESC LIMIT 1`
    );
    return rows[0]?.quarter ?? null;
  } catch (error) {
    console.error('Error fetching latest employment quarter:', error);
    return null;
  }
}

// ── Security (Scope 3) ─────────────────────────────────────────────────

export async function getEnvipeStats(
  year?: number,
  geo?: string,
  crimeType?: string,
): Promise<EnvipeStat[]> {
  try {
    return await query<EnvipeStat>(
      `SELECT * FROM envipe_stats
       WHERE ($1::int IS NULL OR year = $1)
         AND ($2::text IS NULL OR geo_code = $2)
         AND ($3::text IS NULL OR crime_type = $3)
       ORDER BY year DESC, geo_code, crime_type`,
      [year ?? null, geo ?? null, crimeType ?? null]
    );
  } catch (error) {
    console.error('Error fetching ENVIPE stats:', error);
    return [];
  }
}

export async function getEnsuStats(
  quarter?: string,
  city?: string,
): Promise<EnsuStat[]> {
  try {
    return await query<EnsuStat>(
      `SELECT * FROM ensu_stats
       WHERE ($1::text IS NULL OR quarter = $1)
         AND ($2::text IS NULL OR city_code = $2)
       ORDER BY quarter_date DESC, city_name`,
      [quarter ?? null, city ?? null]
    );
  } catch (error) {
    console.error('Error fetching ENSU stats:', error);
    return [];
  }
}

export async function getCifraNegra(
  year?: number,
  geo?: string,
): Promise<EnvipeStat[]> {
  try {
    return await query<EnvipeStat>(
      `SELECT * FROM envipe_stats
       WHERE ($1::int IS NULL OR year = $1)
         AND ($2::text IS NULL OR geo_code = $2)
         AND cifra_negra IS NOT NULL
       ORDER BY year DESC, geo_code`,
      [year ?? null, geo ?? null]
    );
  } catch (error) {
    console.error('Error fetching cifra negra:', error);
    return [];
  }
}

// ── Health & Mortality (Scope 4) ───────────────────────────────────────

export async function getMortalityStats(
  year?: number,
  geo?: string,
  cause?: string,
): Promise<MortalityStat[]> {
  try {
    return await query<MortalityStat>(
      `SELECT * FROM mortality_stats
       WHERE ($1::int IS NULL OR year = $1)
         AND ($2::text IS NULL OR geo_code = $2)
         AND ($3::text IS NULL OR cause_group = $3)
         AND age_group = 'all' AND sex = 'all'
       ORDER BY year DESC, deaths DESC`,
      [year ?? null, geo ?? null, cause ?? null]
    );
  } catch (error) {
    console.error('Error fetching mortality stats:', error);
    return [];
  }
}

export async function getMortalityTimeseries(
  cause: string,
  geo: string = '00',
): Promise<MortalityStat[]> {
  try {
    return await query<MortalityStat>(
      `SELECT * FROM mortality_stats
       WHERE cause_group = $1 AND geo_code = $2
         AND age_group = 'all' AND sex = 'all'
       ORDER BY year`,
      [cause, geo]
    );
  } catch (error) {
    console.error('Error fetching mortality timeseries:', error);
    return [];
  }
}

export async function getHealthFacilities(
  geo?: string,
  institution?: string,
): Promise<HealthFacility[]> {
  try {
    if (geo && institution) {
      return await query<HealthFacility>(
        `SELECT clues_id, name, institution, facility_type, geo_code, address, lat, lng
         FROM health_facilities
         WHERE LEFT(geo_code, 2) = $1 AND institution = $2
         ORDER BY name LIMIT 500`,
        [geo, institution]
      );
    }
    if (geo) {
      return await query<HealthFacility>(
        `SELECT clues_id, name, institution, facility_type, geo_code, address, lat, lng
         FROM health_facilities
         WHERE LEFT(geo_code, 2) = $1
         ORDER BY name LIMIT 500`,
        [geo]
      );
    }
    if (institution) {
      return await query<HealthFacility>(
        `SELECT clues_id, name, institution, facility_type, geo_code, address, lat, lng
         FROM health_facilities
         WHERE institution = $1
         ORDER BY name LIMIT 500`,
        [institution]
      );
    }
    return await query<HealthFacility>(
      `SELECT clues_id, name, institution, facility_type, geo_code, address, lat, lng
       FROM health_facilities
       ORDER BY name LIMIT 500`
    );
  } catch (error) {
    console.error('Error fetching health facilities:', error);
    return [];
  }
}

export async function getHealthFacilitiesByState(): Promise<
  { geo_code: string; geo_name: string; institution: string; count: number }[]
> {
  try {
    return await query<{
      geo_code: string;
      geo_name: string;
      institution: string;
      count: number;
    }>(
      `SELECT hf.geo_code, ga.name AS geo_name, hf.institution, COUNT(*)::int AS count
       FROM health_facilities hf
       JOIN geographic_areas ga ON ga.code = hf.geo_code
       GROUP BY hf.geo_code, ga.name, hf.institution
       ORDER BY ga.name, count DESC`
    );
  } catch (error) {
    console.error('Error fetching health facilities by state:', error);
    return [];
  }
}

export async function getHealthFacilitySummary(): Promise<
  { institution: string; count: number }[]
> {
  try {
    return await query<{ institution: string; count: number }>(
      `SELECT institution, COUNT(*)::int AS count
       FROM health_facilities
       GROUP BY institution
       ORDER BY count DESC`
    );
  } catch (error) {
    console.error('Error fetching health facility summary:', error);
    return [];
  }
}

export async function getLeadingCausesOfDeath(
  year: number,
  geo: string = '00',
): Promise<MortalityStat[]> {
  try {
    return await query<MortalityStat>(
      `SELECT * FROM mortality_stats
       WHERE year = $1 AND geo_code = $2
         AND age_group = 'all' AND sex = 'all'
       ORDER BY deaths DESC
       LIMIT 10`,
      [year, geo]
    );
  } catch (error) {
    console.error('Error fetching leading causes of death:', error);
    return [];
  }
}

// ── Mortality by age group for a specific cause ────────────────────────

export async function getMortalityByAge(
  cause: string,
  year: number = 2023,
  geo: string = '00',
): Promise<MortalityStat[]> {
  try {
    return await query<MortalityStat>(
      `SELECT * FROM mortality_stats
       WHERE cause_group = $1 AND year = $2 AND geo_code = $3
         AND sex = 'all' AND age_group NOT IN ('all')
       ORDER BY age_group`,
      [cause, year, geo]
    );
  } catch (error) {
    console.error('Error fetching mortality by age:', error);
    return [];
  }
}

// ── Mortality trend across years for a cause (national, all ages) ──────

export async function getMortalityTrend(
  cause: string,
  geo: string = '00',
): Promise<MortalityStat[]> {
  try {
    return await query<MortalityStat>(
      `SELECT * FROM mortality_stats
       WHERE cause_group = $1 AND geo_code = $2
         AND age_group = 'all' AND sex = 'all'
       ORDER BY year`,
      [cause, geo]
    );
  } catch (error) {
    console.error('Error fetching mortality trend:', error);
    return [];
  }
}

// ── Top cause of death per age group ───────────────────────────────────

export async function getTopCauseByAge(
  year: number = 2023,
  geo: string = '00',
): Promise<{ age_group: string; cause_group: string; deaths: number; rate_per_100k: number | null }[]> {
  try {
    return await query<{ age_group: string; cause_group: string; deaths: number; rate_per_100k: number | null }>(
      `WITH ranked AS (
         SELECT age_group, cause_group, deaths, rate_per_100k,
                ROW_NUMBER() OVER (PARTITION BY age_group ORDER BY deaths DESC) as rn
         FROM mortality_stats
         WHERE year = $1 AND geo_code = $2 AND sex = 'all'
           AND age_group NOT IN ('all', '0-4', '5-14')
       )
       SELECT age_group, cause_group, deaths, rate_per_100k
       FROM ranked WHERE rn = 1
       ORDER BY age_group`,
      [year, geo]
    );
  } catch (error) {
    console.error('Error fetching top cause by age:', error);
    return [];
  }
}

// ── Total deaths summary ───────────────────────────────────────────────

export async function getTotalDeaths(
  year: number = 2023,
  geo: string = '00',
): Promise<number> {
  try {
    const rows = await query<{ total: number }>(
      `SELECT SUM(deaths)::int as total FROM mortality_stats
       WHERE year = $1 AND geo_code = $2
         AND age_group = 'all' AND sex = 'all'`,
      [year, geo]
    );
    return rows[0]?.total ?? 0;
  } catch (error) {
    console.error('Error fetching total deaths:', error);
    return 0;
  }
}

// ── ENSANUT Health Survey (Scope 4) ───────────────────────────────────

export async function getEnsanutStats(
  condition?: string,
  geo?: string,
  year?: number,
): Promise<EnsanutStat[]> {
  try {
    return await query<EnsanutStat>(
      `SELECT * FROM ensanut_stats
       WHERE ($1::text IS NULL OR condition = $1)
         AND ($2::text IS NULL OR geo_code = $2)
         AND ($3::int IS NULL OR year = $3)
       ORDER BY year DESC, condition, age_group, sex`,
      [condition ?? null, geo ?? null, year ?? null]
    );
  } catch (error) {
    console.error('Error fetching ENSANUT stats:', error);
    return [];
  }
}

export async function getEnsanutNationalSummary(
  year?: number,
): Promise<EnsanutStat[]> {
  try {
    return await query<EnsanutStat>(
      `SELECT * FROM ensanut_stats
       WHERE geo_code = '00'
         AND age_group = '20+'
         AND sex = 'all'
         AND ($1::int IS NULL OR year = $1)
       ORDER BY year DESC, condition`,
      [year ?? null]
    );
  } catch (error) {
    console.error('Error fetching ENSANUT national summary:', error);
    return [];
  }
}

export async function getEnsanutByState(
  condition: string,
  year?: number,
): Promise<(EnsanutStat & { geo_name: string })[]> {
  try {
    return await query<EnsanutStat & { geo_name: string }>(
      `SELECT es.*, ga.name as geo_name
       FROM ensanut_stats es
       JOIN geographic_areas ga ON ga.code = es.geo_code
       WHERE es.condition = $1
         AND es.geo_code != '00'
         AND es.age_group = '20+'
         AND es.sex = 'all'
         AND ($2::int IS NULL OR es.year = $2)
       ORDER BY es.prevalence_pct DESC`,
      [condition, year ?? null]
    );
  } catch (error) {
    console.error('Error fetching ENSANUT by state:', error);
    return [];
  }
}

export async function getCifraNegraByState(
  year?: number,
): Promise<(EnvipeStat & { geo_name: string })[]> {
  try {
    return await query<EnvipeStat & { geo_name: string }>(
      `SELECT es.*, ga.name as geo_name
       FROM envipe_stats es
       JOIN geographic_areas ga ON ga.code = es.geo_code
       WHERE es.crime_type = 'total'
         AND es.geo_code != '00'
         AND ($1::int IS NULL OR es.year = $1)
         AND es.cifra_negra IS NOT NULL
       ORDER BY es.cifra_negra DESC`,
      [year ?? null]
    );
  } catch (error) {
    console.error('Error fetching cifra negra by state:', error);
    return [];
  }
}

// ── Headlines ───────────────────────────────────────────────────────────

import { SCORECARD, type ScorecardItem } from './scorecard';

export interface HeadlineResult {
  id: string;
  label: string;
  value: string;
  change: number;
  changePeriod: string;
  sub: string;
  sparkValues: number[];
  isGoodDown: boolean;
  href: string;
}

function formatScorecardValue(raw: number, format: string): string {
  switch (format) {
    case 'percent1':
      return raw.toFixed(1) + '%';
    case 'currency2':
      return '$' + raw.toFixed(2);
    case 'rate1':
      return raw.toFixed(1);
    case 'index1':
      return raw.toFixed(1);
    case 'index2':
      return raw.toFixed(2);
    case 'compact':
      if (raw >= 1e6) return (raw / 1e6).toFixed(1) + 'M';
      if (raw >= 1e3) return (raw / 1e3).toFixed(1) + 'K';
      return raw.toFixed(0);
    default:
      return raw.toFixed(1);
  }
}

async function resolveInegi(item: ScorecardItem): Promise<HeadlineResult | null> {
  const id = item.indicatorId!;
  const [{ latest, previous }, recentValues] = await Promise.all([
    getLatestValue(id),
    getIndicatorValues(id, '00', 15),
  ]);
  if (!latest || latest.value == null) return null;
  const latestVal = Number(latest.value);
  const prevVal = previous?.value != null ? Number(previous.value) : null;
  const change = prevVal != null ? latestVal - prevVal : 0;
  return {
    id: item.id,
    label: item.label,
    value: formatScorecardValue(latestVal, item.format),
    change,
    changePeriod: latest.period ? `· ${latest.period}` : '',
    sub: item.context,
    sparkValues: recentValues
      .map((v) => (v.value != null ? Number(v.value) : null))
      .filter((v): v is number => v !== null),
    isGoodDown: item.isGoodDown,
    href: item.href,
  };
}

async function resolveStatic(item: ScorecardItem): Promise<HeadlineResult> {
  let sparkValues: number[] = [];

  // Optionally pull sparkline from a related indicator
  if (item.sparkIndicatorId) {
    try {
      const values = await getIndicatorValues(item.sparkIndicatorId, '00', 15);
      sparkValues = values
        .map((v) => (v.value != null ? Number(v.value) : null))
        .filter((v): v is number => v !== null);
    } catch {
      // Sparkline is optional — don't fail if it errors
    }
  }

  return {
    id: item.id,
    label: item.label,
    value: formatScorecardValue(item.staticValue!, item.format),
    change: 0,
    changePeriod: '',
    sub: item.staticPeriod ?? item.context,
    sparkValues,
    isGoodDown: item.isGoodDown,
    href: item.href,
  };
}

export async function getHeadlineIndicators(): Promise<HeadlineResult[]> {
  const results = await Promise.all(
    SCORECARD.map(async (item) => {
      try {
        switch (item.sourceType) {
          case 'inegi':
            return await resolveInegi(item);
          case 'static':
            return await resolveStatic(item);
          default:
            return null;
        }
      } catch (error) {
        console.error(`Error resolving scorecard item ${item.id}:`, error);
        return null;
      }
    })
  );
  return results.filter((r): r is HeadlineResult => r !== null);
}
