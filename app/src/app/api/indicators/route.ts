import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import type { Indicator } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const topic = searchParams.get('topic') || null;

    const indicators = await query<Indicator>(
      `SELECT * FROM indicators WHERE ($1::text IS NULL OR topic = $1) ORDER BY topic, name_es`,
      [topic]
    );

    return NextResponse.json({ indicators });
  } catch (error) {
    console.error('Error fetching indicators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch indicators' },
      { status: 500 }
    );
  }
}
