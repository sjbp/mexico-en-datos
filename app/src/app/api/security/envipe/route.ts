import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface EnvipeStat {
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const year = searchParams.get('year');
    const geo = searchParams.get('geo') || null;
    const crimeType = searchParams.get('crime_type') || null;

    const rows = await query<EnvipeStat>(
      `SELECT * FROM envipe_stats
       WHERE ($1::int IS NULL OR year = $1)
         AND ($2::text IS NULL OR geo_code = $2)
         AND ($3::text IS NULL OR crime_type = $3)
       ORDER BY year DESC, geo_code, crime_type`,
      [year ? parseInt(year, 10) : null, geo, crimeType]
    );

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error('Error fetching ENVIPE stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ENVIPE data' },
      { status: 500 }
    );
  }
}
