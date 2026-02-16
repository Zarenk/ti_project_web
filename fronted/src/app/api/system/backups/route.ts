import { NextResponse } from "next/server";
import { readErrorMessage, resolveAuthToken } from "../utils";
import { BACKEND_URL } from "@/lib/utils";
const BACKUPS_URL = `${BACKEND_URL}/api/system/backups`;

/**
 * POST /api/system/backups
 *
 * Inicia la generación de un respaldo completo en el backend y transmite el
 * archivo resultante al cliente que realiza la petición.
 */
export async function POST(request: Request) {
  const token = await resolveAuthToken(request);

  try {
    const response = await fetch(BACKUPS_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({ error: message }, { status: response.status });
      }
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const headers = new Headers();
    const disposition = response.headers.get("content-disposition");
    if (disposition) {
      headers.set("content-disposition", disposition);
    }
    const contentType = response.headers.get("content-type");
    if (contentType) {
      headers.set("content-type", contentType);
    }
    headers.set("cache-control", "no-store");

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("POST /api/system/backups failed", error);
    return NextResponse.json(
      { error: "No se pudo generar el respaldo del sistema." },
      { status: 500 },
    );
  }
}