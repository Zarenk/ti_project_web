import { NextRequest, NextResponse } from 'next/server';
import { getAuthHeaders } from '@/utils/auth-token';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function GET() {
  try {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) {
      return NextResponse.json({ error: 'No authenticated' }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/whatsapp/auto-reply/config`, {
      headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error getting auto-reply config:', error);
    return NextResponse.json({ error: 'Failed to get config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) {
      return NextResponse.json({ error: 'No authenticated' }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/whatsapp/auto-reply/config`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error updating auto-reply config:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
