"use server"

import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

import { BACKEND_URL } from "@/lib/utils"

type LoginPayload = {
  access_token?: string
  message?: string
  [key: string]: unknown
}

type LoginRequestBody = {
  email: string
  password: string
}

type ApiErrorPayload = {
  message: string
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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginRequestBody
    const { email, password } = body

    const res = await fetch(`${BACKEND_URL}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const { data, raw } = await parseApiResponse<LoginPayload | ApiErrorPayload>(res)

    if (!res.ok) {
      const message =
        (raw && raw.trim()) ||
        (data && typeof data === "object" && "message" in data ? String(data.message) : null) ||
        "Error en autenticación"
      const errorPayload: ApiErrorPayload =
        data && typeof data === "object" ? { ...data, message } : { message }
      return NextResponse.json(errorPayload, { status: res.status || 500 })
    }

    const payload: LoginPayload =
      data && typeof data === "object" ? data : { message: raw ?? "Inicio de sesión correcto" }

    const response = NextResponse.json(payload)
    if (payload.access_token) {
      response.cookies.set("token", payload.access_token, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      })
    }
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno en login"
    return NextResponse.json({ message }, { status: 500 })
  }
}

type ProfileResponse = {
  id: number
  username?: string
  email?: string
  [key: string]: unknown
}

function normalizeTokenFromHeaders(request: NextRequest): string | null {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (bearer) return bearer
  const cookieHeader = request.headers.get("cookie")
  if (!cookieHeader) return null
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export async function GET(request: NextRequest) {
  try {
    let token = normalizeTokenFromHeaders(request)

    if (!token) {
      token = (await cookies()).get("token")?.value ?? null
    }
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const res = await fetch(`${BACKEND_URL}/api/users/profile`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })

    const { data, raw } = await parseApiResponse<ProfileResponse>(res)

    if (!res.ok) {
      const message =
        (raw && raw.trim()) ||
        (data && typeof data === "object" && "message" in data ? String(data.message) : null) ||
        "Error al obtener perfil"
      return NextResponse.json({ message }, { status: res.status || 500 })
    }

    const payload = data && typeof data === "object" ? data : {}
    return NextResponse.json({ ...payload, access_token: token })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno en perfil"
    return NextResponse.json({ message }, { status: 500 })
  }
}
