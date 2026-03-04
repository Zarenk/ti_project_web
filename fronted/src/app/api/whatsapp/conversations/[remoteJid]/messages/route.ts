import { NextRequest, NextResponse } from 'next/server';
import { getAuthHeaders } from '@/utils/auth-token';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ remoteJid: string }> }
) {
  try {
    const headers = await getAuthHeaders();

    if (!headers.Authorization) {
      return NextResponse.json({ error: 'No authenticated' }, { status: 401 });
    }

    const { remoteJid } = await params;
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const limit = searchParams.get('limit');

    const queryParams = new URLSearchParams();
    if (cursor) queryParams.set('cursor', cursor);
    if (limit) queryParams.set('limit', limit);

    const response = await fetch(
      `${BACKEND_URL}/api/whatsapp/conversations/${encodeURIComponent(remoteJid)}/messages?${queryParams}`,
      { headers }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error getting conversation messages:', error);
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}
