import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get('status') ?? 'Open';
    const limit = req.nextUrl.searchParams.get('limit') ?? '100';
    const res = await fetch(`${BACKEND}/api/alerts?status=${status}&limit=${limit}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json([], { status: 200 });
  }
}
