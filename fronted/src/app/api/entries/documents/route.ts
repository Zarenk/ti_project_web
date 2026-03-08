import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_URL } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const qs = searchParams.toString();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    const orgId = request.headers.get("x-org-id");
    const companyId = request.headers.get("x-company-id");
    if (orgId) headers["x-org-id"] = orgId;
    if (companyId) headers["x-company-id"] = companyId;

    const response = await fetch(
      `${BACKEND_URL}/api/entries/documents${qs ? `?${qs}` : ""}`,
      { headers },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return NextResponse.json(
        { message: data?.message ?? "Error al obtener documentos." },
        { status: response.status },
      );
    }

    return NextResponse.json(await response.json());
  } catch {
    return NextResponse.json(
      { message: "Error interno al obtener documentos." },
      { status: 500 },
    );
  }
}
