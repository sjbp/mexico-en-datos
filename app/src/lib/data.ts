import { query } from './db';
import type { Indicator, IndicatorValue } from './types';

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

const HEADLINE_INDICATOR_IDS = ['628194', '444614', '735904', '444793', '444894'];

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
