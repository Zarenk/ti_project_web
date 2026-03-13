import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000"

function forwardHeaders(req: NextRequest) {
  const headers: Record<string, string> = {}
  const cookie = req.headers.get("cookie") || ""
  const match = cookie.match(/authToken=([^;]+)/)
  if (match) headers["Authorization"] = `Bearer ${match[1]}`
  const tid = req.headers.get("x-tenant-id")
  if (tid) headers["x-tenant-id"] = tid
  headers["Content-Type"] = "application/json"
  return headers
}

export async function GET(req: NextRequest) {
  const res = await fetch(`${BACKEND_URL}/menu-config`, {
    headers: forwardHeaders(req),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${BACKEND_URL}/menu-config`, {
    method: "PUT",
    headers: forwardHeaders(req),
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
