import type { MetadataRoute } from "next"
import { BACKEND_URL } from "@/lib/utils"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ""
  if (!baseUrl) return []

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/store`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/cart`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/faq`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/track-order`, changeFrequency: "monthly", priority: 0.3 },
  ]

  // Dynamic product pages
  let productPages: MetadataRoute.Sitemap = []
  try {
    const res = await fetch(`${BACKEND_URL}/api/public/products`, {
      cache: "no-store",
    })
    if (res.ok) {
      const products: { id: number; updatedAt?: string }[] = await res.json()
      productPages = products.map((p) => ({
        url: `${baseUrl}/store/${p.id}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }))
    }
  } catch {
    // Silently skip — sitemap will only contain static pages
  }

  return [...staticPages, ...productPages]
}
