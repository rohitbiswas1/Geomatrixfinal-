import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ data: [], message: 'Stage analytics require real project records in the database.' }, { status: 200 });
}
