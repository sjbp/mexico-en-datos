import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const year = searchParams.get('year');
    const geo = searchParams.get('geo');
    const cause = searchParams.get('cause');
    const ageGroup = searchParams.get('age_group');
    const sex = searchParams.get('sex');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (year) {
      conditions.push(`year = $${paramIdx++}`);
      params.push(parseInt(year, 10));
    }
    if (geo) {
      conditions.push(`geo_code = $${paramIdx++}`);
      params.push(geo);
    }
    if (cause) {
      conditions.push(`cause_group = $${paramIdx++}`);
      params.push(cause);
    }
    if (ageGroup) {
      conditions.push(`age_group = $${paramIdx++}`);
      params.push(ageGroup);
    }
    if (sex) {
      conditions.push(`sex = $${paramIdx++}`);
      params.push(sex);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query(
      `SELECT year, geo_code, cause_group, icd10_range, age_group, sex, deaths, rate_per_100k
       FROM mortality_stats
       ${where}
       ORDER BY year DESC, deaths DESC
       LIMIT 1000`,
      params
    );

    return Response.json({ data: rows });
  } catch (error) {
    console.error('Error fetching mortality stats:', error);
    return Response.json({ error: 'Failed to fetch mortality stats' }, { status: 500 });
  }
}
