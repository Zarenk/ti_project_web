import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ruc = searchParams.get("ruc");
    const serie = searchParams.get("serie");
    const correlativo = searchParams.get("correlativo");

    if (!ruc || !serie || !correlativo) {
      return NextResponse.json(
        { message: "Debe proporcionar ruc, serie y correlativo." },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${BACKEND_URL}/api/public/verify?ruc=${encodeURIComponent(ruc)}&serie=${encodeURIComponent(serie)}&correlativo=${encodeURIComponent(correlativo)}`,
    );

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "Error interno al buscar comprobante." },
      { status: 500 },
    );
  }
}
