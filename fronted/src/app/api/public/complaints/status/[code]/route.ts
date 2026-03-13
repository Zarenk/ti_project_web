import { NextResponse } from "next/server"
import { BACKEND_URL } from "@/lib/utils"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const response = await fetch(
    `${BACKEND_URL}/api/public/complaints/status/${encodeURIComponent(code)}`
  )
  const data = await response.json()
  return NextResponse.json(data, { status: response.status })
}
