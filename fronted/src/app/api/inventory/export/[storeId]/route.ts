import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

async function resolveAuthToken(request: Request): Promise<string | undefined> {
  const headerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (headerToken) return headerToken;
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get('token')?.value;
  if (cookieToken) return cookieToken;
  const cookieHeader = request.headers.get('cookie');
  const match = cookieHeader?.match(/token=([^;]+)/);
  return match?.[1];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const { searchParams } = new URL(req.url);
  const token = await resolveAuthToken(req);

  const backendUrl = `${BACKEND_URL}/api/inventory/export/${storeId}?${searchParams}`;

  const res = await fetch(backendUrl, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      Cookie: req.headers.get('cookie') || '',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: text || 'Error al exportar inventario' },
      { status: res.status },
    );
  }

  const buffer = await res.arrayBuffer();
  const contentDisposition = res.headers.get('content-disposition') || `attachment; filename="inventario-${storeId}.xlsx"`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': contentDisposition,
      'Content-Length': buffer.byteLength.toString(),
    },
  });
}
