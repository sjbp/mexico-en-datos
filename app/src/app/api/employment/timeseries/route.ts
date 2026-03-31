import { NextRequest, NextResponse } from 'next/server';
import { getEmploymentTimeseries } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const dimension = searchParams.get('dimension');
    const dimensionValue = searchParams.get('dimension_value');
    const metric = searchParams.get('metric');

    if (!dimension || !dimensionValue || !metric) {
      return NextResponse.json(
        { error: 'Missing required parameters: dimension, dimension_value, metric' },
        { status: 400 }
      );
    }

    const validMetrics = [
      'employed', 'informal', 'underemployed',
      'unemployment_rate', 'informality_rate',
      'avg_hours_worked', 'avg_monthly_income',
    ];
    if (!validMetrics.includes(metric)) {
      return NextResponse.json(
        { error: `Invalid metric. Valid values: ${validMetrics.join(', ')}` },
        { status: 400 }
      );
    }

    const timeseries = await getEmploymentTimeseries(dimension, dimensionValue, metric);
    return NextResponse.json({ timeseries });
  } catch (error) {
    console.error('Error in employment timeseries API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employment timeseries' },
      { status: 500 }
    );
  }
}
