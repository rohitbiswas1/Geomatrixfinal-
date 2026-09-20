/**
 * Server-side Next.js API route — Gemini Explain Proxy
 * Proxies the request to FastAPI /api/gemini/explain.
 * GEMINI_API_KEY is read server-side by FastAPI — never exposed to the browser.
 */
import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const upstream = await fetch(`${BACKEND}/api/gemini/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Gemini proxy error';
    return NextResponse.json(
      { status: 'error', label: 'AI-generated decision support', summary: message, source: 'proxy_error' },
      { status: 502 }
    );
  }
}
