import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface EnsuStat {
  quarter: string;
  quarter_date: string;
  city_code: string;
  city_name: string;
  feels_unsafe_pct: number | null;
  feels_unsafe_night_pct: number | null;
  witnessed_crime_pct: number | null;
  expects_crime_pct: number | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const quarter = searchParams.get('quarter') || null;
    const city = searchParams.get('city') || null;

    const rows = await query<EnsuStat>(
      `SELECT * FROM ensu_stats
       WHERE ($1::text IS NULL OR quarter = $1)
         AND ($2::text IS NULL OR city_code = $2)
       ORDER BY quarter_date DESC, city_name`,
      [quarter, city]
    );

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('Error fetching ENSU stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ENSU data' },
      { status: 500 }
    );
  }
}
