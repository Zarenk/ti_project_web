import { NextResponse } from "next/server";

import { BACKEND_URL } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body?.email;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "El correo es obligatorio." },
        { status: 400 },
      );
    }

    const response = await fetch(
      `${BACKEND_URL}/api/public/signup/resend-verification`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message ?? "No se pudo reenviar el correo." },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Error interno al reenviar verificación." },
      { status: 500 },
    );
  }
}
