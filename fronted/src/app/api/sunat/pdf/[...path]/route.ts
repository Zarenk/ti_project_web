import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_URL } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const segments = path.map((s) => encodeURIComponent(s)).join("/");

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "No autenticado." },
        { status: 401 },
      );
    }

    const response = await fetch(
      `${BACKEND_URL}/api/sunat/pdf/${segments}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: data?.message ?? "PDF no disponible." },
        { status: response.status },
      );
    }

    const pdfBuffer = await response.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": response.headers.get("Content-Disposition") ?? "inline",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Error interno al obtener PDF." },
      { status: 500 },
    );
  }
}
