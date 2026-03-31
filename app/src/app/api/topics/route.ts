import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const topics = await query<{ topic: string; count: number }>(
      `SELECT topic, COUNT(*)::int as count FROM indicators GROUP BY topic ORDER BY topic`
    );

    return NextResponse.json({ topics });
  } catch (error) {
    console.error('Error fetching topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}
