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

    const rows = await query<IndicatorValue>(
      `SELECT * FROM indicator_values
       WHERE indicator_id = $1
         AND geo_code = $2
       ORDER BY period_date DESC
       LIMIT 2`,
      [id, geo]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No values found for this indicator' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      latest: rows[0],
      previous: rows[1] ?? null,
    });
  } catch (error) {
    console.error('Error fetching latest indicator value:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest indicator value' },
      { status: 500 }
    );
  }
}
