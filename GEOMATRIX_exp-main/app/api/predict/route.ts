import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    {
      error: 'Model not trained — insufficient real labeled data.',
      message: 'Model not trained — insufficient real labeled data.'
    },
    { status: 503 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Model not trained — insufficient real labeled data.',
      message: 'Model not trained — insufficient real labeled data.'
    },
    { status: 503 }
  );
}
