import { NextRequest, NextResponse } from 'next/server';
import { getAuthHeaders } from '@/utils/auth-token';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function GET(request: NextRequest) {
  try {
    const headers = await getAuthHeaders();

    if (!headers.Authorization) {
      return NextResponse.json({ error: 'No authenticated' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const salesId = searchParams.get('salesId');
    const limit = searchParams.get('limit') || '100';

    const queryParams = new URLSearchParams();
    if (clientId) queryParams.set('clientId', clientId);
    if (salesId) queryParams.set('salesId', salesId);
    if (limit) queryParams.set('limit', limit);

    const response = await fetch(`${BACKEND_URL}/api/whatsapp/messages?${queryParams}`, {
      headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error getting messages:', error);
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}
