import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    const response = await fetch(
      `${BACKEND_URL}/api/public/verify/${encodeURIComponent(code)}/pdf`,
    );

    if (!response.ok) {
      return NextResponse.json(
        { message: "PDF no disponible." },
        { status: response.status },
      );
    }

    const pdfBuffer = await response.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="comprobante-${code}.pdf"`,
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Error interno al descargar PDF." },
      { status: 500 },
    );
  }
}
