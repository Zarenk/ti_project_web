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

const mockCampaigns: Campaign[] = [
  { id: 1, name: "Spring Sale", status: "active" },
  { id: 2, name: "Summer Launch", status: "paused" },
]

const mockCreatives: Record<number, Creative[]> = {
  1: [
    { id: 1, name: "Banner 1" },
    { id: 2, name: "Banner 2" },
  ],
  2: [{ id: 3, name: "Video 1" }],
}

export async function fetchCampaigns(page = 1, pageSize = 5) {
  await new Promise((res) => setTimeout(res, 500))
  const start = (page - 1) * pageSize
  const items = mockCampaigns.slice(start, start + pageSize)
  return { items, total: mockCampaigns.length }
}

export async function fetchCampaign(id: number) {
  await new Promise((res) => setTimeout(res, 300))
  const campaign = mockCampaigns.find((c) => c.id === id)
  if (!campaign) throw new Error("Not found")
  return { campaign, creatives: mockCreatives[id] || [] }
}

export async function fetchCreative(id: number) {
  await new Promise((res) => setTimeout(res, 300))
  for (const list of Object.values(mockCreatives)) {
    const found = list.find((c) => c.id === id)
    if (found) return found
  }
  throw new Error("Not found")
}

export async function uploadReferenceImage(file: File): Promise<{ url: string }> {
  await new Promise((res) => setTimeout(res, 500))
  if (file.name.includes("fail")) {
    throw new Error("Upload failed")
  }
  return { url: URL.createObjectURL(file) }
}