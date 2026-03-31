import { NextRequest, NextResponse } from 'next/server';
import { getEmploymentByDimension } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const dimension = searchParams.get('dimension');
    const geo = searchParams.get('geo') || '00';
    const quarter = searchParams.get('quarter') || undefined;

    if (!dimension) {
      return NextResponse.json(
        { error: 'Missing required parameter: dimension' },
        { status: 400 }
      );
    }

    const validDimensions = ['sector', 'age_group', 'gender', 'education', 'occupation'];
    if (!validDimensions.includes(dimension)) {
      return NextResponse.json(
        { error: `Invalid dimension. Valid values: ${validDimensions.join(', ')}` },
        { status: 400 }
      );
    }

    const stats = await getEmploymentByDimension(dimension, geo, quarter);
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error in employment API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employment data' },
      { status: 500 }
    );
  }
}
