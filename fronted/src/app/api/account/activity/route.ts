import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { BACKEND_URL } from '@/lib/utils'

const querySchema = z.object({
  clientId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(20),
})

const activitySchema = z.object({
  items: z.array(z.any()),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})

export type AccountActivityResponse = z.infer<typeof activitySchema>

async function fetchAccountActivity(
  params: z.infer<typeof querySchema>,
  token: string,
): Promise<AccountActivityResponse> {
  const qs = new URLSearchParams()
  if (params.clientId) qs.set('clientId', params.clientId)
  if (params.from) qs.set('from', params.from)
  if (params.to) qs.set('to', params.to)
  if (params.type) qs.set('type', params.type)
  if (params.q) qs.set('q', params.q)
  qs.set('page', params.page.toString())
  qs.set('pageSize', params.pageSize.toString())

  const res = await fetch(`${BACKEND_URL}/api/account/activity?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok) {
    throw { response: { status: res.status, data } }
  }
  return activitySchema.parse(data)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const params = querySchema.parse(Object.fromEntries(url.searchParams))

  let token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    token =
      (await cookies()).get('token')?.value ||
      request.headers.get('cookie')?.match(/token=([^;]+)/)?.[1]
  }
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profileRes = await fetch(`${BACKEND_URL}/api/users/profile`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  const profileData = await profileRes.json()
  if (!profileRes.ok) {
    return NextResponse.json(profileData, { status: profileRes.status })
  }
  if (profileData.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const data = await fetchAccountActivity(params, token)
    return NextResponse.json(data)
  } catch (err: any) {
    if (err.response) {
      return NextResponse.json(err.response.data, { status: err.response.status })
    }
    return NextResponse.json({ error: 'Failed to fetch account activity' }, { status: 500 })
  }
}
