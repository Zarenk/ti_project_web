import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  "http://localhost:4000";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "No autenticado." },
        { status: 401 },
      );
    }

    const formData = await request.formData();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    // Forward tenant headers if present
    const orgId = request.headers.get("x-org-id");
    const companyId = request.headers.get("x-company-id");
    if (orgId) headers["x-org-id"] = orgId;
    if (companyId) headers["x-company-id"] = companyId;

    const response = await fetch(`${BACKEND}/api/sunat/upload-pdf`, {
      method: "POST",
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { message: "Error interno al subir PDF." },
      { status: 500 },
    );
  }
}
