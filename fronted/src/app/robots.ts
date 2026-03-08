import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || ""

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/store", "/store/*", "/cart", "/faq", "/contact", "/verify/*"],
        disallow: ["/dashboard", "/dashboard/*", "/api", "/api/*", "/login", "/register", "/signup", "/users", "/portal"],
      },
    ],
    sitemap: baseUrl ? `${baseUrl}/sitemap.xml` : undefined,
  }
}
