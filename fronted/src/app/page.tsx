"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Laptop,
  Monitor,
  HardDrive,
  Cpu,
  Gamepad2,
  Headphones,
  Keyboard,
  Mouse,
  Tablet,
  Printer,
  Smartphone,
  Server,
  Truck,
  Shield,
  Headset,
  CreditCard,
  Loader2,
  type LucideIcon,
} from "lucide-react"
import Navbar from "@/components/navbar"
import { toast } from "sonner"
import ProductForm from "@/app/dashboard/products/new/product-form"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  getProducts,
  getProduct,
  getPublicProducts,
} from "./dashboard/products/products.api"
import {
  getCategoriesWithCount,
  getCategories,
  getPublicCategoriesWithCount,
} from "./dashboard/categories/categories.api"
import { getStoresWithProduct, getPublicStoresWithProduct } from "./dashboard/inventory/inventory.api"
import { getRecentEntries } from "./dashboard/entries/entries.api"
import UltimosIngresosSection from "@/components/home/UltimosIngresosSection"
import HeroSection from "@/components/home/HeroSection"
import FeaturedProductsSection from "@/components/home/FeaturedProductsSection"
import CategoriesSection from "@/components/home/CategoriesSection"
import BenefitsSection from "@/components/home/BenefitsSection"
import TestimonialsSection from "@/components/home/TestimonialSection"
import NewsletterSection from "@/components/home/NewsletterSection"
import { Skeleton } from "@/components/ui/skeleton"
import { getAuthToken } from "@/utils/auth-token"

type ProductsResponse = Awaited<ReturnType<typeof getProducts>>
type ProductListItem = ProductsResponse extends Array<infer Item> ? Item : never
type ProductDetail = Awaited<ReturnType<typeof getProduct>>

type CategoriesResponse = Awaited<ReturnType<typeof getCategories>>
type CategoryRecord = CategoriesResponse extends Array<infer Item> ? Item : never

type CategoriesWithCountResponse = Awaited<ReturnType<typeof getCategoriesWithCount>>
type CategoryCountRecord = CategoriesWithCountResponse extends Array<infer Item> ? Item : never

type StoreStockResponse = Awaited<ReturnType<typeof getStoresWithProduct>>
type StoreStockRecord = StoreStockResponse extends Array<infer Item> ? Item : never


interface Brand {
  name: string
  logoSvg?: string
  logoPng?: string
}

interface FeaturedProduct {
  id: number
  name: string
  description: string
  price: number
  brand: Brand | null
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

interface HomeCategory {
  name: string
  icon: LucideIcon
  count: number
}

interface RecentProduct {
  id: number
  name: string
  description: string
  price: number
  brand: Brand | null
  category: string
  images: string[]
  stock: number
}

type GsapContext = import("gsap/gsap-core").Context

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined
  }
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const extractImages = (images: unknown): string[] | null =>
  Array.isArray(images) && images.every((img) => typeof img === "string" && img.length > 0)
    ? images
    : null

const mapBrand = (brand: unknown): Brand | null => {
  if (!brand || typeof brand !== "object") {
    return null
  }
  const record = brand as Record<string, unknown>
  const name = typeof record.name === "string" ? record.name : null
  if (!name) {
    return null
  }
  return {
    name,
    logoSvg: typeof record.logoSvg === "string" ? record.logoSvg : undefined,
    logoPng: typeof record.logoPng === "string" ? record.logoPng : undefined,
  }
}

const mapSpecification = (spec: unknown): FeaturedProduct["specification"] | undefined => {
  if (!spec || typeof spec !== "object") {
    return undefined
  }
  const record = spec as Record<string, unknown>
  return {
    processor: typeof record.processor === "string" ? record.processor : undefined,
    ram: typeof record.ram === "string" ? record.ram : undefined,
    storage: typeof record.storage === "string" ? record.storage : undefined,
    graphics: typeof record.graphics === "string" ? record.graphics : undefined,
    screen: typeof record.screen === "string" ? record.screen : undefined,
    resolution: typeof record.resolution === "string" ? record.resolution : undefined,
    refreshRate: typeof record.refreshRate === "string" ? record.refreshRate : undefined,
    connectivity: typeof record.connectivity === "string" ? record.connectivity : undefined,
  }
}

const mapProductListItemToFeatured = (product: ProductListItem): FeaturedProduct | null => {
  const images = extractImages(product?.images)
  if (!images) {
    return null
  }

  const normalizedPrice =
    parseNumber(product?.priceSell) ?? parseNumber(product?.price) ?? 0

  const normalizedStock = parseNumber(product?.stock) ?? null
  const categoryName =
    typeof product?.category?.name === "string" ? product.category.name : "Sin categoría"

  return {
    id: product.id,
    name: product.name,
    description: typeof product.description === "string" ? product.description : "",
    price: normalizedPrice,
    brand: mapBrand(product?.brand ?? null),
    category: categoryName,
    images,
    stock: normalizedStock,
    specification: mapSpecification(product?.specification),
  }
}

const calculateTotalStock = (stores: StoreStockRecord[]): number =>
  stores.reduce<number>((sum, store) => sum + (parseNumber(store?.stock) ?? 0), 0)

const isDefined = <T,>(value: T | null | undefined): value is T => value != null

const extractProductFromEntry = (entry: unknown): ProductListItem | null => {
  if (!entry || typeof entry !== "object") {
    return null
  }

  if ("product" in entry && entry.product) {
    return entry.product as ProductListItem
  }

  return entry as ProductListItem
}

const toRecentProduct = (product: FeaturedProduct): RecentProduct => ({
  id: product.id,
  name: product.name,
  description: product.description,
  price: product.price,
  brand: product.brand,
  category: product.category,
  images: product.images,
  stock: product.stock ?? 0,
})

const buildRecentProducts = (entries: unknown[]): RecentProduct[] =>
  entries
    .map(extractProductFromEntry)
    .filter(isDefined)
    .map(mapProductListItemToFeatured)
    .filter(isDefined)
    .map(toRecentProduct)

const ICON_MAP: Record<string, LucideIcon> = {
  Laptops: Laptop,
  Computadoras: Monitor,
  "Tarjetas Gráficas": Cpu,
  Almacenamiento: HardDrive,
  Gaming: Gamepad2,
  Accesorios: Headphones,
  Monitores: Monitor,
  Teclados: Keyboard,
  Mouses: Mouse,
  Tablets: Tablet,
  Impresoras: Printer,
  Smartphones: Smartphone,
  Servidores: Server,
}

const HOME_BENEFITS = [
  {
    icon: Truck,
    title: "Envíos a todo el Perú",
    description: "Entrega rápida y segura en 24-72 horas",
  },
  {
    icon: Shield,
    title: "Garantía asegurada",
    description: "Hasta 3 años de garantía extendida en todos nuestros productos",
  },
  {
    icon: Headset,
    title: "Soporte técnico",
    description: "Atención especializada 24/7 para resolver tus dudas",
  },
  {
    icon: CreditCard,
    title: "Pagos seguros",
    description: "Múltiples métodos de pago con máxima seguridad",
  },
]

const HOME_TESTIMONIALS = [
  {
    name: "Carlos Mendoza",
    rating: 5,
    comment:
      "Excelente servicio y productos de calidad. Mi laptop gaming llegó perfecta y funciona increíble.",
    location: "Lima, Perú",
  },
  {
    name: "María González",
    rating: 5,
    comment:
      "Compré una PC para mi oficina y el soporte técnico fue excepcional. Muy recomendado.",
    location: "Arequipa, Perú",
  },
  {
    name: "Diego Ramírez",
    rating: 5,
    comment:
      "Los mejores precios del mercado y entrega súper rápida. Ya es mi tienda de confianza.",
    location: "Trujillo, Perú",
  },
]

export default function Homepage() {
  const sectionsRef = useRef<HTMLDivElement>(null)
  const authStateRef = useRef<boolean | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([])
  const [heroProducts, setHeroProducts] = useState<FeaturedProduct[]>([])
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([])
  const [recentIndex, setRecentIndex] = useState(0)
  const [recentDirection, setRecentDirection] = useState(0)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [productToEdit, setProductToEdit] = useState<ProductDetail | null>(null)
  const [isLoadingProductToEdit, setIsLoadingProductToEdit] = useState(false)
  const [productCategories, setProductCategories] = useState<CategoryRecord[]>([])
  const [isLoadingProductCategories, setIsLoadingProductCategories] = useState(false)

  const resolveAuthState = useCallback(async () => {
    if (authStateRef.current !== null) {
      return authStateRef.current
    }
    const token = await getAuthToken()
    const hasAuth = Boolean(token)
    authStateRef.current = hasAuth
    setIsAuthenticated(hasAuth)
    return hasAuth
  }, [])

  const fetchProductsData = useCallback(async () => {
    try {
      const hasAuth = await resolveAuthState()
      const productsResponse = hasAuth
        ? await getProducts()
        : await getPublicProducts()
      const normalizedProducts = Array.isArray(productsResponse) ? productsResponse : []
      const featured = normalizedProducts
        .map(mapProductListItemToFeatured)
        .filter(isDefined)

      const topForStock = featured.slice(0, 10)
      const withStockTop = await Promise.all(
        topForStock.map(async (product) => {
          try {
            const stores = hasAuth
              ? await getStoresWithProduct(product.id)
              : await getPublicStoresWithProduct(product.id)
            const totalStock = Array.isArray(stores) ? calculateTotalStock(stores) : 0
            return { ...product, stock: totalStock }
          } catch {
            return product
          }
        }),
      )

      setHeroProducts(withStockTop.slice(0, 6))
      setFeaturedProducts(withStockTop)
    } catch (error) {
      console.error("Error fetching featured products:", error)
    }
  }, [resolveAuthState])

  useEffect(() => {
    void fetchProductsData()
  }, [fetchProductsData])

  const handleEditProduct = useCallback(async (productId: number) => {
    setProductToEdit(null)
    setIsEditDialogOpen(true)
    setIsLoadingProductToEdit(true)
    try {
      const productData = await getProduct(String(productId))
      setProductToEdit(productData)
    } catch (error) {
      console.error("Error fetching product for edit:", error)
      toast.error("No se pudo cargar el producto para editar")
      setProductToEdit(null)
    } finally {
      setIsLoadingProductToEdit(false)
    }
  }, [resolveAuthState])

  useEffect(() => {
    if (!isEditDialogOpen) {
      setIsLoadingProductCategories(false)
      setProductToEdit(null)
      setIsLoadingProductToEdit(false)
      return
    }

    let isMounted = true
    setIsLoadingProductCategories(true)
    if (isAuthenticated === false) {
      setProductCategories([])
      setIsLoadingProductCategories(false)
      return
    }

    getCategories()
      .then((data) => {
        if (!isMounted) {
          return
        }
        setProductCategories(Array.isArray(data) ? data : [])
      })
      .catch((error) => {
        if (!isMounted) {
          return
        }
        console.error("Error fetching product categories:", error)
        setProductCategories([])
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingProductCategories(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [isEditDialogOpen, isAuthenticated])

  const handleProductUpdateSuccess = useCallback(
    async () => {
      setIsEditDialogOpen(false)
      setProductToEdit(null)
      try {
        await fetchProductsData()
      } catch (error) {
        console.error("Error refreshing products after update:", error)
      }
      if (isAuthenticated) {
        try {
          const recent = await getRecentEntries(5)
          const normalized = Array.isArray(recent) ? buildRecentProducts(recent) : []
          setRecentProducts(normalized)
        } catch (error) {
          console.error("Error refreshing recent entries after update:", error)
        }
      } else {
        setRecentProducts([])
      }
    },
    [fetchProductsData, isAuthenticated],
  )

  const fetchRecentProducts = useCallback(async () => {
    try {
      const hasAuth = await resolveAuthState()
      if (!hasAuth) {
        setRecentProducts([])
        return
      }
      const data = await getRecentEntries(5)
      const normalized = Array.isArray(data) ? buildRecentProducts(data) : []
      setRecentProducts(normalized)
    } catch (error) {
      console.error("Error fetching recent entries:", error)
    }
  }, [resolveAuthState])

  useEffect(() => {
    void fetchRecentProducts()
  }, [fetchRecentProducts])

  const [categories, setCategories] = useState<HomeCategory[]>([])
  const [categoryIndex, setCategoryIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  useEffect(() => {
    async function fetchCategoriesData() {
      try {
        const hasAuth = await resolveAuthState()
        const data = hasAuth
          ? await getCategoriesWithCount()
          : await getPublicCategoriesWithCount()
        const mapped = (Array.isArray(data) ? data : []).map((cat: CategoryCountRecord) => ({
          name: cat.name,
          icon: ICON_MAP[cat.name] || HardDrive,
          count: typeof cat.productCount === 'number' ? cat.productCount : 0,
        }))
        setCategories(mapped)
      } catch (error) {
        console.error("Error fetching categories:", error)
      }
    }
    void fetchCategoriesData()
  }, [])

  useEffect(() => {
    let ctx: GsapContext | undefined
    async function loadGsap() {
      try {
        const gsapModule = await import("gsap")
        const ScrollTrigger = await import("gsap/ScrollTrigger")
        const gsapInstance = gsapModule.default
        gsapInstance.registerPlugin(ScrollTrigger.default)
        ctx = gsapInstance.context(() => {
          const sections = gsapInstance.utils.toArray<HTMLElement>(".gsap-section")
          // Only clear any leftover inline styles; rely on ScrollUpSection for reveals
          gsapInstance.set(sections, { clearProps: "all" })
        }, sectionsRef)

        // Ensure triggers recalc after layout/route transitions
        requestAnimationFrame(() => ScrollTrigger.default.refresh())
      } catch (err) {
        console.error("GSAP animations failed to load", err)
      }
    }
    loadGsap()
    // Revert to original styles and kill ScrollTriggers on unmount
    return () => ctx?.revert()
  }, [])

  const nextCategories = () => {
    setDirection(1)
    setCategoryIndex((i) =>
      categories.length > 0 ? (i + 6) % categories.length : i,
    )
  }
  const prevCategories = () => {
    setDirection(-1)
    setCategoryIndex((i) =>
      categories.length > 0 ? (i - 6 + categories.length) % categories.length : i,
    )
  }

  const visibleCategories =
    categories.length <= 6
      ? categories
      : [
          ...categories.slice(categoryIndex, categoryIndex + 6),
          ...
            (categoryIndex + 6 > categories.length
              ? categories.slice(0, (categoryIndex + 6) % categories.length)
              : []),
        ]

  const nextRecent = () => {
    setRecentDirection(1)
    setRecentIndex((i) =>
      recentProducts.length > 0 ? (i + 1) % recentProducts.length : i,
    )
  }

  const prevRecent = () => {
    setRecentDirection(-1)
    setRecentIndex((i) =>
      recentProducts.length > 0
        ? (i - 1 + recentProducts.length) % recentProducts.length
        : i,
    )
  }

  const visibleRecent =
    recentProducts.length <= 5
      ? recentProducts
      : [
          ...recentProducts.slice(recentIndex, recentIndex + 5),
          ...(recentIndex + 5 > recentProducts.length
            ? recentProducts.slice(0, (recentIndex + 5) % recentProducts.length)
            : []),
        ]


  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-gray-950 dark:to-black">
      <Navbar />
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
            <DialogDescription>
              Actualiza las características y detalles del producto sin salir de esta página.
            </DialogDescription>
          </DialogHeader>
          {isLoadingProductToEdit || (isLoadingProductCategories && productCategories.length === 0) ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : productToEdit ? (
            <div className="pb-4">
              <ProductForm
                key={productToEdit.id}
                product={productToEdit}
                categories={productCategories}
                onSuccess={handleProductUpdateSuccess}
                onCancel={() => setIsEditDialogOpen(false)}
              />
            </div>
          ) : (
            <div className="py-10">
              <Skeleton className="h-6 w-40 mx-auto" />
            </div>
          )}
        </DialogContent>
      </Dialog>
      <div ref={sectionsRef}>
        <section className="gsap-section" data-navcolor="#ffffff">
          {heroProducts.length === 0 ? (
            <div className="container mx-auto px-4 py-12">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <Skeleton className="h-10 w-3/4" />
                  <Skeleton className="h-5 w-2/3" />
                  <div className="flex gap-4">
                    <Skeleton className="h-10 w-40" />
                    <Skeleton className="h-10 w-40" />
                  </div>
                </div>
                <Skeleton className="w-full aspect-[6/5] rounded-2xl" />
              </div>
            </div>
          ) : (
            <HeroSection heroProducts={heroProducts} onEditProduct={handleEditProduct} />
          )}
        </section>
        <section className="gsap-section" data-navcolor="#f1f5f9">
          {recentProducts.length === 0 ? (
            <div className="container mx-auto px-4 py-12">
              <div className="text-center mb-8">
                <Skeleton className="h-8 w-64 mx-auto mb-2" />
                <Skeleton className="h-4 w-96 mx-auto" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-xl border bg-card">
                    <Skeleton className="h-56 w-full rounded-t-xl" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <UltimosIngresosSection
              visibleRecent={visibleRecent}
              recentIndex={recentIndex}
              recentDirection={recentDirection}
              nextRecent={nextRecent}
              prevRecent={prevRecent}
              recentProductsLength={recentProducts.length}
              onEditProduct={handleEditProduct}
            />
          )}
        </section>
        <section className="gsap-section" data-navcolor="#e0f2fe">
          {featuredProducts.length === 0 ? (
            <div className="container mx-auto px-4 py-12">
              <div className="text-center mb-8">
                <Skeleton className="h-8 w-72 mx-auto mb-2" />
                <Skeleton className="h-4 w-96 mx-auto" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="rounded-xl border bg-card">
                    <Skeleton className="h-56 w-full rounded-t-xl" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-6 w-28" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <FeaturedProductsSection
              featuredProducts={featuredProducts}
              onEditProduct={handleEditProduct}
            />
          )}
        </section>
        <section className="gsap-section" data-navcolor="#e0e7ff">
          {categories.length === 0 ? (
            <div className="container mx-auto px-4 py-12">
              <div className="text-center mb-8">
                <Skeleton className="h-8 w-60 mx-auto mb-2" />
                <Skeleton className="h-4 w-96 mx-auto" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl border bg-card p-6">
                    <Skeleton className="h-10 w-10 rounded-full mb-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <CategoriesSection
              categories={categories}
              visibleCategories={visibleCategories}
              categoryIndex={categoryIndex}
              direction={direction}
              nextCategories={nextCategories}
              prevCategories={prevCategories}
              categoriesLength={categories.length}
            />
          )}
        </section>
        <section className="gsap-section" data-navcolor="#fef3c7">
          <BenefitsSection benefits={HOME_BENEFITS} />
        </section>
        <section className="gsap-section" data-navcolor="#fce7f3">
          <TestimonialsSection testimonials={HOME_TESTIMONIALS} />
        </section>
        <section className="gsap-section" data-navcolor="#ecfccb">
          <NewsletterSection />
        </section>
      </div>
    </div>
  )
}



