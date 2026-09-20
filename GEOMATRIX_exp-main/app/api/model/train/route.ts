import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  try {
    const algorithm = req.nextUrl.searchParams.get('algorithm') ?? 'RandomForest';
    const res = await fetch(`${BACKEND}/api/model/train?algorithm=${algorithm}`, {
      method: 'POST',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
