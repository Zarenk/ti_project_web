import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

async function resolveAuthToken(request: Request): Promise<string | undefined> {
  const headerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (headerToken) {
    return headerToken;
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  const cookieHeader = request.headers.get('cookie');
  const match = cookieHeader?.match(/token=([^;]+)/);
  return match?.[1];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = await resolveAuthToken(req);

  const res = await fetch(`${BACKEND_URL}/api/accounting/journal-entries?${searchParams}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Cookie: req.headers.get('cookie') || '',
    },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token = await resolveAuthToken(req);

  const res = await fetch(`${BACKEND_URL}/api/accounting/journal-entries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Cookie: req.headers.get('cookie') || '',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
