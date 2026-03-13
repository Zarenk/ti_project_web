import { authFetch } from "@/utils/auth-fetch"
import { BACKEND_URL } from "@/lib/utils"

export type MenuConfigData = {
  appearance: {
    theme: "dark" | "light"
    primaryColor: string
    backgroundColor: string
    textColor: string
    menuStyle: "elegante" | "luxury" | "moderno" | "tropical"
  }
  branding: {
    restaurantName: string
    description: string
    logoUrl: string | null
    bannerUrl: string | null
    showSearch: boolean
  }
  hours: {
    enabled: boolean
    schedule: Array<{
      day: string
      open: string
      close: string
      closed: boolean
    }>
  }
  categories: Array<{
    categoryId: number
    visible: boolean
    displayOrder: number
    displayName: string | null
  }>
  featuredProductIds: number[]
  hiddenProductIds: number[]
  productOverrides: Record<
    string,
    { menuDescription?: string; menuPrice?: number; featured?: boolean }
  >
  contact: {
    address: string
    phone: string
    email: string
    googleMapsUrl: string
  }
  socialLinks: {
    facebook: string
    instagram: string
    tiktok: string
    whatsapp: string
  }
  sharing: {
    slug: string | null
    enabled: boolean
  }
}

export type MenuConfigResponse = {
  data: MenuConfigData
  updatedAt: string
}

export async function getMenuConfig(): Promise<MenuConfigResponse> {
  const res = await authFetch("/menu-config")
  if (!res.ok) throw new Error("Error al cargar configuracion del menu")
  return res.json()
}

export type MenuCategory = {
  id: number
  name: string
  productCount: number
}

export type MenuProduct = {
  id: number
  name: string
  description: string | null
  price: number
  priceSell: number | null
  image: string | null
  images: string[]
  categoryId: number | null
  categoryName: string | null
  status: string
}

/** Fetch categories with product count for the menu editor */
export async function getMenuCategories(): Promise<MenuCategory[]> {
  const res = await authFetch(`${BACKEND_URL}/api/category`)
  if (!res.ok) return []
  const data = await res.json()
  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    productCount: c._count?.products ?? c.productCount ?? 0,
  }))
}

/** Fetch active products for the menu editor */
export async function getMenuProducts(): Promise<MenuProduct[]> {
  const res = await authFetch(`${BACKEND_URL}/api/products`)
  if (!res.ok) return []
  const data = await res.json()
  return (Array.isArray(data) ? data : data.products ?? [])
    .filter((p: any) => {
      const st = (p.status ?? "").toString().toUpperCase()
      return st === "ACTIVE" || st === "ACTIVO"
    })
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      priceSell: p.priceSell,
      image: p.image,
      images: Array.isArray(p.images) ? p.images.filter(Boolean) : [],
      categoryId: p.categoryId ?? p.category?.id ?? null,
      categoryName: p.category?.name ?? null,
      status: p.status,
    }))
}

export async function updateMenuConfig(
  data: Partial<MenuConfigData>,
  expectedUpdatedAt?: string,
): Promise<MenuConfigResponse> {
  const res = await authFetch("/menu-config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, expectedUpdatedAt }),
  })
  if (res.status === 409) {
    throw new Error("La configuracion fue modificada por otro usuario. Recarga la pagina.")
  }
  if (!res.ok) throw new Error("Error al guardar configuracion del menu")
  return res.json()
}
