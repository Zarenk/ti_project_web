import { NextResponse } from "next/server";
import { readErrorMessage, resolveAuthToken } from "../utils";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const PURGE_URL = `${BACKEND_URL}/api/system/purge`;

/**
 * POST /api/system/purge
 *
 * Solicita al backend que ejecute el proceso de depuración/limpieza de datos
 * temporales, propagando la respuesta JSON obtenida al cliente.
 */
export async function POST(request: Request) {
  const token = await resolveAuthToken(request);

  try {
    const response = await fetch(PURGE_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({ error: message }, { status: response.status });
      }
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("POST /api/system/purge failed", error);
    return NextResponse.json(
      { error: "No se pudo completar el proceso de depuración del sistema." },
      { status: 500 },
    );
  }
}