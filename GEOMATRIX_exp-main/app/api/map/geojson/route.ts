import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const riskLevel = searchParams.get('risk_level');
  const query = riskLevel ? `?risk_level=${riskLevel}` : '';

  try {
    const res = await fetch(`${BACKEND_URL}/api/map/geojson${query}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Backend HTTP ${res.status}`);
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({
      type: 'FeatureCollection',
      features: [],
      message: `Failed to load GeoJSON from backend: ${err.message}`,
    });
  }
}
