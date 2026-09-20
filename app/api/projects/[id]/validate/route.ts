import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const resolvedParams = context.params instanceof Promise ? await context.params : context.params;
    const id = resolvedParams?.id;
    const upstream = await fetch(`${BACKEND}/api/projects/${encodeURIComponent(id)}/validate`, {
      headers: { Accept: 'application/json' },
    });
    const text = await upstream.text();
    const data = text ? JSON.parse(text) : {};
    return NextResponse.json(data, { status: upstream.status });
  } catch (err: any) {
    return NextResponse.json({ error: `Validation check failed: ${err.message}` }, { status: 500 });
  }
}
