import { NextRequest, NextResponse } from 'next/server';
import { getAuthHeaders } from '@/utils/auth-token';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
  try {
    const headers = await getAuthHeaders();

    if (!headers.Authorization) {
      return NextResponse.json({ error: 'No authenticated' }, { status: 401 });
    }

    const fresh = request.nextUrl.searchParams.get('fresh');
    const url = fresh === 'true'
      ? `${BACKEND_URL}/api/whatsapp/connect?fresh=true`
      : `${BACKEND_URL}/api/whatsapp/connect`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error connecting WhatsApp:', error);
    return NextResponse.json(
      { error: 'Failed to connect WhatsApp' },
      { status: 500 }
    );
  }
}
