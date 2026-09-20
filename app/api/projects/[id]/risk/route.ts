import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const upstream = await fetch(`${BACKEND}/api/projects/${encodeURIComponent(id)}/predict-risk`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  const payload = await upstream.text();

  if (!upstream.ok) {
    let parsed: unknown = payload ? (() => { try { return JSON.parse(payload); } catch { return payload; } })() : { error: 'Prediction failed.' };
    return NextResponse.json(typeof parsed === 'object' && parsed ? parsed : { error: 'Prediction failed.' }, { status: upstream.status });
  }

  return NextResponse.json(payload ? JSON.parse(payload) : {}, { status: upstream.status });
}
