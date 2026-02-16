"use server"

import { NextResponse } from "next/server"

import { BACKEND_URL } from "@/lib/utils"

type PasswordRecoveryRequestBody = {
  email: string
}

type PasswordRecoveryPayload = {
  message?: string
  [key: string]: unknown
}

async function parseApiResponse<T>(
  response: Response,
): Promise<{ data: T | null; raw: string | null }> {
  const contentType = response.headers.get("content-type") ?? ""
  const isJson = contentType.includes("application/json")

  if (!isJson) {
    try {
      const text = await response.text()
      return { data: null, raw: text || null }
    } catch {
      return { data: null, raw: null }
    }
  }

  try {
    const json = (await response.json()) as T
    return { data: json, raw: null }
  } catch {
    return { data: null, raw: null }
  }
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as PasswordRecoveryRequestBody

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "El correo electrónico es obligatorio." },
        { status: 400 },
      )
    }

    const trimmedEmail = normalizeEmail(email)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json(
        { message: "El correo electrónico proporcionado no es válido." },
        { status: 400 },
      )
    }

    const response = await fetch(`${BACKEND_URL}/api/users/password/recovery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmedEmail }),
    })

    const { data, raw } = await parseApiResponse<PasswordRecoveryPayload>(response)

    if (!response.ok) {
      const message =
        (raw && raw.trim()) ||
        (data && typeof data === "object" && data.message ? String(data.message) : null) ||
        "No fue posible iniciar la recuperación."
      return NextResponse.json({ message }, { status: response.status })
    }

    const payload: PasswordRecoveryPayload =
      data && typeof data === "object" ? data : { message: raw ?? "Solicitud enviada." }
    if (!payload.message) {
      payload.message = "Solicitud de recuperación enviada."
    }
    return NextResponse.json(payload, { status: 200 })
  } catch (error) {
    console.error("Error en password-recovery:", error)
    return NextResponse.json(
      { message: "Ocurrió un error interno al procesar la recuperación de contraseña." },
      { status: 500 },
    )
  }
}
