import { useState, useEffect, useCallback } from "react"
import { getProduct, getPublicProduct, getProducts, getPublicProducts } from "../../dashboard/products/products.api"
import { getStoresWithProduct, getPublicStoresWithProduct, getBatchStock, getPublicBatchStock } from "../../dashboard/inventory/inventory.api"
import { getAuthToken } from "@/utils/auth-token"

export interface RelatedProduct {
  id: number
  name: string
  description: string
  price: number
  brand: { name: string; logoSvg?: string; logoPng?: string } | null
  category: string
  images: string[]
  stock: number | null
  specification?: {
    processor?: string
    ram?: string
    storage?: string
    graphics?: string
    screen?: string
    resolution?: string
    refreshRate?: string
    connectivity?: string
  }
}

export interface StoreStockItem {
  storeName: string
  stock: number
}

export function useProductData(id: string) {
  const [product, setProduct] = useState<any>(null)
  const [stock, setStock] = useState<number | null>(null)
  const [storeStock, setStoreStock] = useState<StoreStockItem[]>([])
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([])

  const fetchProduct = useCallback(async () => {
    try {
      const hasAuth = Boolean(await getAuthToken())
      const data = hasAuth ? await getProduct(id) : await getPublicProduct(id)
      setProduct(data)
    } catch (error) {
      console.error("Error fetching product:", error)
    }
  }, [id])

  useEffect(() => {
    void fetchProduct()
  }, [fetchProduct])

  useEffect(() => {
    async function fetchStock() {
      try {
        const hasAuth = Boolean(await getAuthToken())
        const stores = hasAuth
          ? await getStoresWithProduct(Number(id))
          : await getPublicStoresWithProduct(Number(id))
        const storeItems: StoreStockItem[] = stores.map((s: any) => ({
          storeName: s.store?.name ?? s.storeName ?? "Tienda",
          stock: s.stock ?? 0,
        }))
        setStoreStock(storeItems)
        const total = storeItems.reduce((sum, s) => sum + s.stock, 0)
        setStock(total)
      } catch (error) {
        console.error("Error fetching stock:", error)
      }
    }
    if (product) {
      fetchStock()
    }
  }, [product, id])

  useEffect(() => {
    async function fetchRelated() {
      try {
        const hasAuth = Boolean(await getAuthToken())
        const all = hasAuth ? await getProducts() : await getPublicProducts()
        const filtered = all.filter(
          (p: any) =>
            p.id !== product.id &&
            (p.category?.name === product.category?.name ||
              p.brand?.name === product.brand?.name),
        )

        const slice = filtered.slice(0, 4)
        const productIds = slice.map((p: any) => p.id)

        let stockMap: Record<number, number> = {}
        try {
          stockMap = hasAuth
            ? await getBatchStock(productIds)
            : await getPublicBatchStock(productIds)
        } catch {
          // fallback: no stock info
        }

        const mapped: RelatedProduct[] = slice.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description || "",
          price: p.priceSell ?? p.price,
          brand: p.brand
            ? { name: p.brand.name, logoSvg: p.brand.logoSvg, logoPng: p.brand.logoPng }
            : null,
          category: p.category?.name || "Sin categoría",
          images: p.images || [],
          stock: stockMap[p.id] ?? null,
          specification: p.specification ?? undefined,
        }))

        setRelatedProducts(mapped)
      } catch (err) {
        console.error("Error fetching related products:", err)
      }
    }
    if (product) {
      fetchRelated()
    }
  }, [product])

  return {
    product,
    setProduct,
    stock,
    storeStock,
    relatedProducts,
    setRelatedProducts,
    fetchProduct,
  }
}
