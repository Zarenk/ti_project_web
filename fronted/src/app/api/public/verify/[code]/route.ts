import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    const response = await fetch(
      `${BACKEND_URL}/api/public/verify/${encodeURIComponent(code)}`,
    );

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "Error interno al verificar comprobante." },
      { status: 500 },
    );
  }
}
