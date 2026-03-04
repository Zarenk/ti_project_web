import { NextRequest, NextResponse } from 'next/server';
import { getAuthHeaders } from '@/utils/auth-token';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ remoteJid: string }> }
) {
  try {
    const headers = await getAuthHeaders();

    if (!headers.Authorization) {
      return NextResponse.json({ error: 'No authenticated' }, { status: 401 });
    }

    const { remoteJid } = await params;

    const response = await fetch(
      `${BACKEND_URL}/api/whatsapp/conversations/${encodeURIComponent(remoteJid)}/info`,
      { headers }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error getting contact info:', error);
    return NextResponse.json(
      { error: 'Failed to get contact info' },
      { status: 500 }
    );
  }
}
