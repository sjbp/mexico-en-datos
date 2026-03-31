import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Indicator } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const rows = await query<Indicator>(
      `SELECT * FROM indicators WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Indicator not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ indicator: rows[0] });
  } catch (error) {
    console.error('Error fetching indicator:', error);
    return NextResponse.json(
      { error: 'Failed to fetch indicator' },
      { status: 500 }
    );
  }
}
