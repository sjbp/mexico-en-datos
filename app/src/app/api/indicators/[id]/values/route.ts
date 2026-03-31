import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { IndicatorValue } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const geo = searchParams.get('geo') || '00';
    const start = searchParams.get('start') || null;
    const end = searchParams.get('end') || null;

    const values = await query<IndicatorValue>(
      `SELECT * FROM indicator_values
       WHERE indicator_id = $1
         AND geo_code = $2
         AND ($3::date IS NULL OR period_date >= $3)
         AND ($4::date IS NULL OR period_date <= $4)
       ORDER BY period_date`,
      [id, geo, start, end]
    );

    return NextResponse.json({ values });
  } catch (error) {
    console.error('Error fetching indicator values:', error);
    return NextResponse.json(
      { error: 'Failed to fetch indicator values' },
      { status: 500 }
    );
  }
}
