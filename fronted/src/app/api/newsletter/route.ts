import { NextResponse } from 'next/server';

import { BACKEND_URL } from "@/lib/utils";

export async function POST(request: Request) {
  const formData = await request.json();

  const res = await fetch(`${BACKEND_URL}/api/newsletter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }

  return NextResponse.json(data);
}