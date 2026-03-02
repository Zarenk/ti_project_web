import { NextRequest, NextResponse } from 'next/server';
import { getAuthHeaders } from '@/utils/auth-token';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
  try {
    const headers = await getAuthHeaders();

    if (!headers.Authorization) {
      return NextResponse.json({ error: 'No authenticated' }, { status: 401 });
    }

    let body: string;
    try {
      const json = await request.json();
      body = JSON.stringify(json);
    } catch {
      body = JSON.stringify({ saleIds: [] });
    }

    const response = await fetch(`${BACKEND_URL}/api/whatsapp/invoice-send-counts`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching WhatsApp send counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch send counts' },
      { status: 500 },
    );
  }
}
