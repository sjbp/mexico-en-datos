import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { GeographicArea } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const level = searchParams.get('level') || null;

    const areas = await query<GeographicArea>(
      `SELECT * FROM geographic_areas
       WHERE ($1::text IS NULL OR level = $1)
       ORDER BY level, name`,
      [level]
    );

    return NextResponse.json({ areas });
  } catch (error) {
    console.error('Error fetching geographic areas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch geographic areas' },
      { status: 500 }
    );
  }
}
