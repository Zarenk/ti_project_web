import { NextResponse } from "next/server"
import { cookies } from "next/headers"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

export async function POST(request: Request) {
  const formData = await request.formData()

  let token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) {
    token =
      (await cookies()).get("token")?.value ||
      request.headers.get("cookie")?.match(/token=([^;]+)/)?.[1]
  }

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  const res = await fetch(`${BACKEND_URL}/api/quotes/whatsapp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  const contentType = res.headers.get("content-type") || ""
  const isJson = contentType.includes("application/json")
  const data = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    return NextResponse.json(
      typeof data === "object" ? data : { message: data },
      { status: res.status },
    )
  }

  return NextResponse.json(typeof data === "object" ? data : { ok: true })
}
