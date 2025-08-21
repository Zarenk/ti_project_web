import { authFetch } from "@/utils/auth-fetch"

export type Campaign = {
  id: number
  name: string
  status: string
}

export type Creative = {
  id: number
  name: string
  image?: string
}

export async function fetchCampaigns(
  organizationId: number,
  page = 1,
  pageSize = 5,
) {
  const res = await authFetch(
    `/ads/organizations/${organizationId}/campaigns?page=${page}&pageSize=${pageSize}`,
  )
  if (!res.ok) throw new Error("Failed to load campaigns")
  return res.json()
}

export async function fetchCampaign(organizationId: number, id: number) {
  const res = await authFetch(
    `/ads/organizations/${organizationId}/campaigns/${id}`,
  )
  if (!res.ok) throw new Error("Not found")
  return res.json()
}

export async function fetchCreative(organizationId: number, id: number) {
  const res = await authFetch(
    `/ads/organizations/${organizationId}/creatives/${id}`,
  )
  if (!res.ok) throw new Error("Not found")
  return res.json()
}

export async function createCampaign(
  organizationId: number,
  dto: { name: string; status: string },
) {
  const res = await authFetch(
    `/ads/organizations/${organizationId}/campaigns`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    },
  )
  if (!res.ok) throw new Error("Failed to create campaign")
  return res.json()
}

export async function createCreative(
  organizationId: number,
  campaignId: number,
  dto: { name: string },
) {
  const res = await authFetch(
    `/ads/organizations/${organizationId}/campaigns/${campaignId}/creatives`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    },
  )
  if (!res.ok) throw new Error("Failed to create creative")
  return res.json()
}

export async function uploadReferenceImage(
  file: File,
): Promise<{ url: string }> {
  const form = new FormData()
  form.append("file", file)
  const res = await authFetch("/ads/reference-image", {
    method: "POST",
    body: form,
  })
  if (!res.ok) throw new Error("Upload failed")
  return res.json()
}