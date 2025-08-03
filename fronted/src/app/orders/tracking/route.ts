import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const res = await fetch(`${BACKEND_URL}/orders/${params.code}/tracking`);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}