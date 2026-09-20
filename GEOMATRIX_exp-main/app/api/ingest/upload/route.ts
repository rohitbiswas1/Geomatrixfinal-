import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  try {
    const dataType = req.nextUrl.searchParams.get('data_type') ?? 'projects';
    const formData = await req.formData();

    const res = await fetch(`${BACKEND}/api/ingest/upload?data_type=${dataType}`, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type — let fetch set the multipart boundary automatically
    });

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
