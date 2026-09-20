import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const upstream = await fetch(`${BACKEND}/api/projects/${encodeURIComponent(id)}/explain`, {
    headers: { Accept: 'application/json' },
  });
  const payload = await upstream.text();

  if (!upstream.ok) {
    let parsed: unknown = payload ? (() => { try { return JSON.parse(payload); } catch { return payload; } })() : { error: 'Recommendations unavailable.' };
    return NextResponse.json(typeof parsed === 'object' && parsed ? parsed : { error: 'Recommendations unavailable.' }, { status: upstream.status });
  }

  const json = payload ? JSON.parse(payload) : { shap_features: [] };
  return NextResponse.json({ data: json.shap_features ?? [] }, { status: upstream.status });
}
