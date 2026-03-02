import { NextResponse } from "next/server";

import { BACKEND_URL } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = body?.token;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { message: "El token de verificación es obligatorio." },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${BACKEND_URL}/api/public/signup/verify-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? "No se pudo verificar el email." },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Error interno al verificar email." },
      { status: 500 },
    );
  }
}
