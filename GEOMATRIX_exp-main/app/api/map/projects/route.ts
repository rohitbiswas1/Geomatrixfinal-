import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ data: [], message: 'No real project map data is available yet.' }, { status: 200 });
}
