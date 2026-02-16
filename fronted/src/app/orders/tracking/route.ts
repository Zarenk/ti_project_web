import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/utils';

export async function GET(
  _req: Request,
  { params }: { params: { code: string } }
) {
  const res = await fetch(`${BACKEND_URL}/orders/${params.code}/tracking`);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}