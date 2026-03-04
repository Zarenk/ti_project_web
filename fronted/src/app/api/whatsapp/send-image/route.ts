import { NextRequest, NextResponse } from 'next/server';
import { getAuthHeaders } from '@/utils/auth-token';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
  try {
    const headers = await getAuthHeaders();

    if (!headers.Authorization) {
      return NextResponse.json({ error: 'No authenticated' }, { status: 401 });
    }

    // Forward FormData as-is to the backend
    const formData = await request.formData();

    const response = await fetch(`${BACKEND_URL}/api/whatsapp/send-image`, {
      method: 'POST',
      headers: {
        Authorization: headers.Authorization,
        'x-organization-id': headers['x-organization-id'] || '',
        'x-company-id': headers['x-company-id'] || '',
      },
      body: formData,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error sending image:', error);
    return NextResponse.json(
      { error: 'Failed to send image' },
      { status: 500 }
    );
  }
}
