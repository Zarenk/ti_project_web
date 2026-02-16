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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await resolveAuthToken(req);

  const res = await fetch(`${BACKEND_URL}/api/accounting/journal-entries/${params.id}/void`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Cookie: req.headers.get('cookie') || '',
    },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
