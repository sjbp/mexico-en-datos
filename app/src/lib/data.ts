import { query } from './db';
import type { Indicator, IndicatorValue, EmploymentStat, EnvipeStat, EnsuStat, MortalityStat, HealthFacility } from './types';

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

// ── Headlines ───────────────────────────────────────────────────────────

const HEADLINE_INDICATOR_IDS = ['628194', '444614', '735904', '736939', '444793', '444894'];

export async function getHeadlineIndicators(): Promise<
  Array<{
    indicator: Indicator;
    latest: IndicatorValue | null;
    previous: IndicatorValue | null;
    sparkValues: number[];
  }>
> {
  try {
    const results = await Promise.all(
      HEADLINE_INDICATOR_IDS.map(async (id) => {
        const [indicator, { latest, previous }, recentValues] = await Promise.all([
          getIndicator(id),
          getLatestValue(id),
          getIndicatorValues(id, '00', 15),
        ]);
        if (!indicator) return null;
        return {
          indicator,
          latest,
          previous,
          sparkValues: recentValues
            .map((v) => (v.value != null ? Number(v.value) : null))
            .filter((v): v is number => v !== null),
        };
      })
    );
    return results.filter(
      (r): r is NonNullable<typeof r> => r !== null
    );
  } catch (error) {
    console.error('Error fetching headline indicators:', error);
    return [];
  }
}
