import { NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/projects/dashboard-summary`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      {
        total_projects: 0,
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        total_land_ha: 0,
        total_families: 0,
        avg_risk_score: null,
        alerts_open: 0,
        data_available: false,
        message: String(err),
      },
      { status: 200 }
    );
  }
}
