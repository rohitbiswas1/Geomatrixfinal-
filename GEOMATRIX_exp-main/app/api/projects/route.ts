import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

async function readJsonPayload(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qs = searchParams.toString();
  const upstream = await fetch(`${BACKEND}/api/projects${qs ? `?${qs}` : ''}`, {
    headers: { Accept: 'application/json' },
  });
  const payload = await readJsonPayload(upstream);

  if (!upstream.ok) {
    return NextResponse.json(
      typeof payload === 'object' && payload ? payload : { error: 'Failed to load projects from backend.' },
      { status: upstream.status }
    );
  }

  return NextResponse.json(payload ?? [], { status: upstream.status });
}

export async function POST(req: NextRequest) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const upstream = await fetch(`${BACKEND}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await readJsonPayload(upstream);

  if (!upstream.ok) {
    return NextResponse.json(
      typeof payload === 'object' && payload ? payload : { error: 'Project creation failed.' },
      { status: upstream.status }
    );
  }

  return NextResponse.json(payload ?? {}, { status: upstream.status });
}
