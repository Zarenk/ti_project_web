import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("authToken")?.value

    if (!token) {
      return NextResponse.json({ error: "No authenticated" }, { status: 401 })
    }

    const body = await request.json()

    const response = await fetch(`${BACKEND_URL}/series/batch-check`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error("Error batch checking series:", error)
    return NextResponse.json({ error: "Failed to batch check series" }, { status: 500 })
  }
}
