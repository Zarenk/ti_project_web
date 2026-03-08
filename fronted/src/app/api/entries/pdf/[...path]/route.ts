import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/utils";

/**
 * Proxy for entry PDF files (invoices & guides).
 * In production the backend is an internal service, so the browser
 * cannot reach /uploads/* directly. This route streams the file through Next.js.
 *
 * Usage: GET /api/entries/pdf/uploads/invoices/file-123.pdf
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const segments = path.map((s) => encodeURIComponent(s)).join("/");

    const backendUrl = `${BACKEND_URL}/${segments}`;
    const response = await fetch(backendUrl);

    if (!response.ok) {
      return NextResponse.json(
        { message: "Documento no disponible." },
        { status: response.status },
      );
    }

    const buffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("Content-Type") ?? "application/pdf";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Error interno al obtener documento." },
      { status: 500 },
    );
  }
}
