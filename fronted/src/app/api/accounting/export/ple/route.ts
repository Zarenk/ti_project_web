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

  const res = await fetch(`${BACKEND_URL}/api/accounting/export/ple?${searchParams}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Cookie: req.headers.get('cookie') || '',
    },
  });

  if (!res.ok) {
    const error = await res.text();
    return NextResponse.json({ error }, { status: res.status });
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get('content-disposition');

  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': contentDisposition || 'attachment; filename="export.txt"',
    },
  });
}
