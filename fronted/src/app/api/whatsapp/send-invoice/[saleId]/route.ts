import { NextRequest, NextResponse } from 'next/server';
import { getAuthHeaders } from '@/utils/auth-token';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> },
) {
  try {
    const headers = await getAuthHeaders();

    if (!headers.Authorization) {
      return NextResponse.json({ error: 'No authenticated' }, { status: 401 });
    }

    const { saleId } = await params;

    // Forward request body (contains optional phone number)
    let body: string | undefined;
    try {
      const json = await request.json();
      body = JSON.stringify(json);
    } catch {
      // No body or invalid JSON — send empty object
      body = JSON.stringify({});
    }

    const response = await fetch(`${BACKEND_URL}/api/whatsapp/send-invoice/${saleId}`, {
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
    console.error('Error sending invoice via WhatsApp:', error);
    return NextResponse.json(
      { error: 'Failed to send invoice' },
      { status: 500 },
    );
  }
}
