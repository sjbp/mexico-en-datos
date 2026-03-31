import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const geo = searchParams.get('geo');
    const institution = searchParams.get('institution');
    const type = searchParams.get('type');
    const limit = searchParams.get('limit');

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (geo) {
      // Support both state (2-digit) and municipality (5-digit) geo codes
      if (geo.length === 2) {
        conditions.push(`LEFT(geo_code, 2) = $${paramIdx++}`);
      } else {
        conditions.push(`geo_code = $${paramIdx++}`);
      }
      params.push(geo);
    }
    if (institution) {
      conditions.push(`institution = $${paramIdx++}`);
      params.push(institution);
    }
    if (type) {
      conditions.push(`facility_type = $${paramIdx++}`);
      params.push(type);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const maxRows = limit ? Math.min(parseInt(limit, 10), 5000) : 500;
    params.push(maxRows);

    const rows = await query(
      `SELECT clues_id, name, institution, facility_type, geo_code, address, lat, lng
       FROM health_facilities
       ${where}
       ORDER BY name
       LIMIT $${paramIdx}`,
      params
    );

    return Response.json({ data: rows });
  } catch (error) {
    console.error('Error fetching health facilities:', error);
    return Response.json({ error: 'Failed to fetch health facilities' }, { status: 500 });
  }
}
