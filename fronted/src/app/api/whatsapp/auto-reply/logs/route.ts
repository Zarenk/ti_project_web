import { NextResponse } from 'next/server';
import { getAuthHeaders } from '@/utils/auth-token';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function GET(request: Request) {
  try {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) {
      return NextResponse.json({ error: 'No authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    const response = await fetch(
      `${BACKEND_URL}/api/whatsapp/auto-reply/logs?limit=${limit}&offset=${offset}`,
      { headers },
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error getting auto-reply logs:', error);
    return NextResponse.json({ error: 'Failed to get logs' }, { status: 500 });
  }
}
