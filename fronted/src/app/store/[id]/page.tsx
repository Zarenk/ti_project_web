"use client"

import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Heart,
  Star,
  ShoppingCart,
  Truck,
  Shield,
  Award,
  Zap,
  Monitor,
  Cpu,
  HardDrive,
  MemoryStick,
  Battery,
  Wifi,
  Check,
  Plus,
  Minus,
  Package,
  PackageOpen,
  Maximize2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/progress"
import Navbar from "@/components/navbar"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { getProduct, getProducts } from "../../dashboard/products/products.api"
import { getReviews, submitReview } from "./reviews.api"
import { toast } from "sonner"
import { getStoresWithProduct } from "../../dashboard/inventory/inventory.api"
import { useCart } from "@/context/cart-context"
import { useRouter } from "next/navigation"
import ProductBreadcrumb from "@/components/product-breadcrumb"
import { icons } from "@/lib/icons"
import { getUserDataFromToken } from "@/lib/auth"
import { resolveImageUrl } from "@/lib/images"
import { BrandLogo } from "@/components/BrandLogo"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { getFavorites, toggleFavorite } from "@/app/favorites/favorite.api"
import { Skeleton } from "@/components/ui/skeleton"

interface Props {
  params: Promise<{ id: string }>
}

interface Brand {
  name: string
  logoSvg?: string
  logoPng?: string
}

interface RelatedProduct {
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

export default function ProductPage({ params }: Props) {

  const { id } = React.use(params)

  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [product, setProduct] = useState<any>(null)
  const [stock, setStock] = useState<number | null>(null)
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([])
  const [zoomActive, setZoomActive] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false)
  const { addItem } = useCart()
  const router = useRouter()
  const [reviews, setReviews] = useState<any[]>([])
  const [myReview, setMyReview] = useState<any | null>(null)
  const [ratingValue, setRatingValue] = useState(5)
  const [comment, setComment] = useState('')
  const commentRef = useRef<HTMLTextAreaElement | null>(null)
  const [userData, setUserData] = useState<{ id: number; name: string } | null>(null)

  useEffect(() => {
    async function fetchProduct() {
      try {
        const data = await getProduct(id)
        setProduct(data)
      } catch (error) {
        console.error("Error fetching product:", error)
      }
    }
    fetchProduct()
  }, [id])

  useEffect(() => {
    async function fetchStock() {
      try {
        const stores = await getStoresWithProduct(Number(id))
        const total = stores.reduce(
          (sum: number, item: any) => sum + (item.stock ?? 0),
          0
        )
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
        const all = await getProducts()
        const filtered = all.filter(
          (p: any) =>
            p.id !== product.id &&
            (p.category?.name === product.category?.name ||
              p.brand?.name === product.brand?.name)
        )
        const mapped = await Promise.all(
          filtered.slice(0, 4).map(async (p: any) => {
            let rpStock: number | null = null
            try {
              const stores = await getStoresWithProduct(p.id)
              rpStock = stores.reduce(
                (sum: number, item: any) => sum + (item.stock ?? 0),
                0
              )
            } catch (err) {
              console.error('Error fetching stock:', err)
            }
            return {
              id: p.id,
              name: p.name,
              description: p.description || '',
              price: p.priceSell ?? p.price,
              brand: p.brand
                ? {
                    name: p.brand.name,
                    logoSvg: p.brand.logoSvg,
                    logoPng: p.brand.logoPng,
                  }
                : null,
              category: p.category?.name || 'Sin categoría',
              images: p.images || [],
              stock: rpStock,
              specification: p.specification ?? undefined,
            } as RelatedProduct
          })
        )
        setRelatedProducts(mapped)
      } catch (err) {
        console.error('Error fetching related products:', err)
      }
    }
    if (product) {
      fetchRelated()
    }
  }, [product])

  useEffect(() => {
    getUserDataFromToken().then(setUserData)
  }, [])

  useEffect(() => {
    async function checkFav() {
      if (!product || !userData) return
      try {
        const favs = await getFavorites()
        setIsInWishlist(favs.some((f: any) => f.productId === product.id))
      } catch (err) {
        console.error('Error checking favorites:', err)
      }
    }
    checkFav()
  }, [product, userData])

  useEffect(() => {
    async function loadReviews() {
      try {
        const res = await getReviews(Number(id))
        setReviews(res)
        const u = await getUserDataFromToken()
        if (u) {
          const mine = res.find((r: any) => r.userId === u.id)
          if (mine) {
            setMyReview(mine)
            setRatingValue(mine.rating)
            setComment(mine.comment || '')
          }
        }
      } catch (err) {
        console.error('Error fetching reviews:', err)
      }
    }
    loadReviews()
  }, [id])

  const baseImages: string[] =
    product?.images && product.images.length > 0
      ? product.images
      : product?.image
        ? [product.image]
        : ["/placeholder.svg?height=600&width=600"]
  
  const images = baseImages.map((image) => {
    const resolved = resolveImageUrl(image)
    return resolved && resolved.trim() !== ""
      ? resolved
      : "/placeholder.svg?height=600&width=600"
  })

  const salePrice = product?.priceSell ?? product?.price ?? 0
  const originalPrice = +(salePrice * 1.20).toFixed(2)

  const currentConfig = {
    price: salePrice,
    originalPrice,
    specs: {
      processor: product?.specification?.processor ?? "",
      ram: product?.specification?.ram ?? "",
      storage: product?.specification?.storage ?? "",
      graphics: product?.specification?.graphics ?? "",
      screen: product?.specification?.screen ?? "",
      resolution: product?.specification?.resolution ?? "",
      refreshRate: product?.specification?.refreshRate ?? "",
      connectivity: product?.specification?.connectivity ?? "",
    },
  }

  const hasSpecs = Object.values(currentConfig.specs).some(
    (v) => v && v.toString().trim() !== ""
  )

  const discountPercentage =
    currentConfig.originalPrice > currentConfig.price
      ? Math.round(
          ((currentConfig.originalPrice - currentConfig.price) /
            currentConfig.originalPrice) *
            100,
        )
      : 0

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
      : 0
  const roundedRating = Math.round(averageRating)

  async function handleReviewSubmit() {
    if (!userData) return
    const text = commentRef.current?.value || ''
    try {
      await submitReview(Number(id), ratingValue, text)
      const updated = await getReviews(Number(id))
      setReviews(updated)
      const mine = updated.find((r: any) => r.userId === userData.id)
      setMyReview(mine)
      setComment(text)
      toast.success('Reseña guardada')
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar la reseña')
    }
  }

  async function handleToggleFavorite() {
    if (!product) return
    try {
      await toggleFavorite(product.id)
      setIsInWishlist((prev) => !prev)
    } catch (err) {
      console.error('Error toggling favorite:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {product === null ? (
          <>
            <div className="mb-6">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-60" />
            </div>
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="space-y-4">
                <div className="relative">
                  <Skeleton className="aspect-square w-full rounded-2xl" />
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-20 rounded-lg flex-shrink-0" />
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <Skeleton className="h-8 w-3/4 mb-3" />
                  <div className="flex items-center gap-4 mb-4">
                    <Skeleton className="h-5 w-40" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-card p-6 rounded-xl shadow-sm border space-y-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-6 w-28" />
                      <Skeleton className="h-7 w-48" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
                <div className="bg-card p-6 rounded-xl shadow-sm border space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-9 w-10" />
                    <Skeleton className="h-9 w-16" />
                    <Skeleton className="h-9 w-10" />
                  </div>
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-40" />
                    <Skeleton className="h-10 w-40" />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-16">
              <Skeleton className="h-7 w-64 mb-6" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border bg-card">
                    <Skeleton className="h-48 w-full rounded-t-xl" />
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
          </>
        ) : (
          <>
        <ProductBreadcrumb
            category={product?.category?.name || null}
            brand={product?.brand?.name || null}
            productName={product?.name || ''}
        />
        <div className="grid lg:grid-cols-2 gap-12">         
          {/* Galería de Imágenes */}
          <div className="space-y-4">
            <div className="relative">
              {discountPercentage > 0 && (
                <Badge className="absolute top-4 left-4 z-10 bg-red-500 hover:bg-red-600">
                  -{discountPercentage}% OFF
                </Badge>
              )}
              <Badge className="absolute top-4 right-4 z-10 bg-green-500 hover:bg-green-600">Envío Gratis</Badge>
              <div
                className="aspect-square rounded-2xl overflow-hidden bg-card shadow-lg relative"
                onMouseEnter={() => setZoomActive(true)}
                onMouseLeave={() => setZoomActive(false)}
                onMouseMove={(e) => {
                  const { left, top, width, height } = e.currentTarget.getBoundingClientRect()
                  const x = ((e.clientX - left) / width) * 100
                  const y = ((e.clientY - top) / height) * 100
                  if (imgRef.current) {
                    imgRef.current.style.transformOrigin = `${x}% ${y}%`
                  }
                }}
              >
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute bottom-4 right-4 z-20 bg-card/70 hover:bg-card rounded-full"
                  onClick={() => setIsImageDialogOpen(true)}
                >
                  <Maximize2 className="w-5 h-5" />
                  <span className="sr-only">Maximizar imagen</span>
                </Button>
                <Image
                  ref={imgRef}
                  src={images[selectedImage] || "/placeholder.svg"}
                  alt={product?.name || "Producto"}
                  width={600}
                  height={600}
                  priority
                  className={`w-full h-full object-cover transition-transform duration-200 ${zoomActive ? 'scale-150' : 'scale-100'}`}
                />
              </div>
            </div>

            <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
              <DialogContent
                aria-describedby={undefined}
                className="max-w-3xl p-0 bg-transparent border-none shadow-none"
              >
                <VisuallyHidden>
                  <DialogTitle>{product?.name || "Producto"}</DialogTitle>
                  <DialogDescription>Imagen ampliada</DialogDescription>
                </VisuallyHidden>
                <Image
                  src={images[selectedImage] || "/placeholder.svg"}
                  alt={product?.name || "Producto"}
                  width={900}
                  height={900}
                  className="w-full h-full object-contain"
                />
              </DialogContent>
            </Dialog>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((image: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === index ? "border-blue-500 shadow-md" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <Image
                    src={image || "/placeholder.svg"}
                    alt={`Vista ${index + 1}`}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Información del Producto */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Nuevo Modelo 2025</Badge>
                <Badge className="bg-blue-500 hover:bg-blue-600">Bestseller</Badge>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{product?.name || ""}</h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < roundedRating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                    ({averageRating.toFixed(1)}) • {reviews.length} reseñas
                  </span>
                </div>
              </div>
            </div>

            {/* Información del Modelo */}
            <div className="space-y-4">
              <div className="bg-card p-6 rounded-xl shadow-sm border">
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-blue-500 hover:bg-blue-600 flex items-center gap-1">
                    {product?.brand?.logoSvg && (
                      <BrandLogo
                        src={resolveImageUrl(product.brand.logoSvg)}
                        alt={product.brand.name}
                        className="h-4 w-auto"
                      />
                    )}
                    {product?.brand?.name}
                  </Badge>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{product?.name}</h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {product?.description}
                </p>
                {hasSpecs ? (
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-medium">{currentConfig.specs.processor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MemoryStick className="w-5 h-5 text-green-500" />
                      <span className="text-sm font-medium">{currentConfig.specs.ram}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-5 h-5 text-purple-500" />
                      <span className="text-sm font-medium">{currentConfig.specs.storage}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-orange-500" />
                      <span className="text-sm font-medium">{currentConfig.specs.graphics}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                    Especificaciones no disponibles
                  </p>
                )}
              </div>
            </div>

            {/* Precio y Cantidad */}
            <div className="bg-card p-6 rounded-xl shadow-sm border">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-green-600">S/.{currentConfig.price.toFixed(2)}</span>
                    <span className="text-xl text-gray-500 dark:text-gray-400 line-through">S/.{currentConfig.originalPrice.toFixed(2)}</span>
                    {currentConfig.originalPrice > currentConfig.price && (
                      <Badge className="bg-red-500 hover:bg-red-600">
                        Ahorra S/.{(currentConfig.originalPrice - currentConfig.price).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Precio incluye IVA • 12 cuotas sin interés</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-medium">Cantidad:</span>
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="px-4 py-2 font-medium">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={stock !== null && (stock <= 0 || quantity >= stock)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {stock !== null ? (
                  stock > 0 ? (
                    <span className="text-sm text-green-600">Solo quedan {stock} en stock</span>
                  ) : (
                    <span className="text-sm text-red-600">Sin stock disponible</span>
                  )
                ) : (
                  <span className="text-sm text-gray-600">Cargando stock...</span>
                )}
              </div>

              <div className="flex gap-3 mb-4">
                {stock !== null && stock > 0 && (
                  <Button
                    size="lg"
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      if (product) {
                        addItem({
                          id: product.id,
                          name: product.name,
                          price: product.priceSell ?? product.price,
                          image:
                            product.images && product.images.length > 0
                              ? resolveImageUrl(product.images[0])
                              : resolveImageUrl(product.image),
                          quantity,
                        })
                        toast.success("Producto agregado al carrito")
                      }
                    }}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Agregar al Carrito
                  </Button>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleToggleFavorite}
                      className={isInWishlist ? "text-red-500 border-red-500" : ""}
                    >
                      <Heart className={`w-5 h-5 ${isInWishlist ? "fill-current" : ""}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Agregar a favoritos</TooltipContent>
                </Tooltip>
              </div>

              {stock !== null && stock > 0 && (
                <Button
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    if (product) {
                      addItem({
                        id: product.id,
                        name: product.name,
                        price: product.priceSell ?? product.price,
                        image:
                          product.images && product.images.length > 0
                            ? resolveImageUrl(product.images[0])
                            : resolveImageUrl(product.image),
                        quantity,
                      })
                      router.push("/cart")
                    }
                  }}
                >
                  Comprar Ahora - Envío Gratis
                </Button>               
              )}
            </div>

            {/* Beneficios */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-card rounded-lg shadow-sm">
                <Truck className="w-6 h-6 text-green-500" />
                <div>
                  <p className="font-medium text-sm">Envío Gratis</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Entrega en 24-48h</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-card rounded-lg shadow-sm">
                <Shield className="w-6 h-6 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">Garantía 1 año</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Soporte técnico</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-card rounded-lg shadow-sm">
                <Award className="w-6 h-6 text-purple-500" />
                <div>
                  <p className="font-medium text-sm">Calidad Premium</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Certificado ISO</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-card rounded-lg shadow-sm">
                <Zap className="w-6 h-6 text-yellow-500" />
                <div>
                  <p className="font-medium text-sm">Setup Gratis</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Configuración incluida</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs de Información Detallada */}
        <div className="mt-16">
          <Tabs defaultValue="specs" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="specs">Especificaciones</TabsTrigger>
              <TabsTrigger value="features">Características</TabsTrigger>
              <TabsTrigger value="reviews">Reseñas</TabsTrigger>
              <TabsTrigger value="support">Soporte</TabsTrigger>
            </TabsList>

            <TabsContent value="specs" className="mt-8">
              {hasSpecs ? (
                <div className="grid md:grid-cols-2 gap-8">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Cpu className="w-6 h-6 text-blue-500" />
                        Rendimiento
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Procesador:</span>
                          <span className="font-medium">{currentConfig.specs.processor}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Memoria RAM:</span>
                          <span className="font-medium">{currentConfig.specs.ram}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Almacenamiento:</span>
                          <span className="font-medium">{currentConfig.specs.storage}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Gráficos:</span>
                          <span className="font-medium">{currentConfig.specs.graphics}</span>
                        </div>
                      </div>
                  </CardContent>
                </Card>
              
                <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Monitor className="w-6 h-6 text-green-500" />
                        Display & Conectividad
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Pantalla:</span>
                          <span className="font-medium">{currentConfig.specs.screen}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Resolución:</span>
                          <span className="font-medium">{currentConfig.specs.resolution}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Tasa de refresco:</span>
                          <span className="font-medium">{currentConfig.specs.refreshRate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Conectividad:</span>
                          <span className="font-medium">{currentConfig.specs.connectivity}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              
              ) : (

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-4">Especificaciones</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Especificaciones no disponibles
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="features" className="mt-8">
              {product?.features && product.features.length > 0 ? (
                <div className="grid md:grid-cols-3 gap-6">
                  {product.features.map((feature: any) => {
                    const IconComponent = icons[feature.icon as keyof typeof icons] || Battery
                    return (
                      <Card key={feature.id}>
                        <CardContent className="p-6 text-center">
                          <IconComponent className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                          <h3 className="font-bold mb-2">{feature.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Características no disponibles
                </p>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="mt-8">
              <div className="space-y-6">
                {userData ? (
                  <Card className="bg-card/70 border border-blue-100">
                    
                    <CardContent className="p-6 space-y-4">
                      <h3 className="text-2xl font-bold text-yellow-500">Reseñas</h3>
                      <h4 className="font-semibold text-blue-700">Si te gustó el producto, bríndanos tu reseña</h4>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            onClick={() => setRatingValue(i + 1)}
                            className={`w-6 h-6 cursor-pointer transition-colors ${i < ratingValue ? 'text-blue-500 fill-blue-500' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    <Textarea
                        defaultValue={comment}
                        onBlur={(e) => setComment(e.target.value)}
                        ref={commentRef}
                        placeholder="Escribe tu opinión"
                        className="bg-card/60"
                      />
                      <Button className="bg-blue-500 hover:bg-blue-600 text-white" onClick={handleReviewSubmit}>
                        Guardar reseña
                      </Button>
                    </CardContent>
                  </Card>
                  ) : (
                  <Card className="bg-card/70 border border-blue-100">
                    <CardContent className="p-6 space-y-4 text-center">
                      <h4 className="font-semibold text-blue-700">Si te gustó el producto, bríndanos tu reseña</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Para dejar una reseña necesitas iniciar sesión o registrarte.</p>
                      <div className="flex justify-center gap-4">
                        <Button asChild className="bg-blue-500 hover:bg-blue-600 text-white">
                          <Link href="/login">Iniciar Sesión</Link>
                        </Button>
                        <Button asChild variant="outline">
                          <Link href="/register">Registrarse</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-6">
                  {reviews.map((review) => (
                    <Card
                      key={review.id}
                      className={`${
                        review.userId === userData?.id ? 'border-l-4 border-blue-500 bg-blue-50/30' : 'bg-card/60'
                      }`}
                    >
                      <CardContent className="p-6 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-blue-800">{review.user?.username}</h4>
                            <div className="flex items-center gap-1 mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                          <Badge variant="secondary">Compra verificada</Badge>
                        </div>
                        {review.comment && (
                          <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {reviews.length === 0 && <p className="text-sm text-gray-500">Aún no hay reseñas</p>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="support" className="mt-8">
              <div className="grid md:grid-cols-2 gap-8">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-4">Garantía y Soporte</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Garantía extendida de 1 año</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Cobertura completa de hardware y software</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Soporte técnico 24/7</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Chat, teléfono y soporte remoto</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Servicio a domicilio</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Reparación en tu hogar u oficina</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-4">Información de Envío</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Truck className="w-5 h-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Envío express gratuito</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Entrega en 24-48 horas hábiles</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Seguro de transporte</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Cobertura total durante el envío</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-purple-500 mt-0.5" />
                        <div>
                          <p className="font-medium">Devolución gratuita</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">30 días para cambios y devoluciones</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {relatedProducts.length > 0 && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold mb-6">Productos relacionados</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {relatedProducts.map((rp) => (
                  <Card
                    key={rp.id}
                    className="group relative overflow-hidden hover:shadow-lg transition-shadow duration-200 card-stripes border-transparent hover:border-border"
                  >
                    <Link href={`/store/${rp.id}`} className="block">
                      <CardHeader className="p-0">
                        <div className="relative overflow-hidden rounded-t-lg">
                          <Image
                            src={resolveImageUrl(rp.images[0]) || "/placeholder.svg"}
                            alt={rp.name}
                            width={300}
                            height={300}
                            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="mb-2">
                          <Badge variant="outline" className="text-xs">
                            {rp.category}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-base sm:text-lg mb-1 break-words whitespace-normal">
                          {rp.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {rp.description}
                        </p>
                        <span className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
                          {rp.brand?.logoSvg && (
                            <BrandLogo
                              src={resolveImageUrl(rp.brand.logoSvg)}
                              alt={rp.brand.name}
                              className="h-4 w-auto"
                            />
                          )}
                          {rp.brand?.name}
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-green-600">S/.{rp.price.toFixed(2)}</span>
                        </div>
                        <p
                          className={`text-xs mt-1 flex items-center gap-1 ${rp.stock !== null && rp.stock > 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {rp.stock !== null && rp.stock > 0 ? (
                            <PackageOpen className="w-4 h-4" />
                          ) : (
                            <Package className="w-4 h-4" />
                          )}
                          {rp.stock !== null && rp.stock > 0 ? `Stock: ${rp.stock}` : 'Sin stock'}
                        </p>
                        <div className="hidden group-hover:block mt-2 space-y-1 text-xs text-muted-foreground">
                          {rp.specification?.processor && <p>Procesador: {rp.specification.processor}</p>}
                          {rp.specification?.ram && <p>RAM: {rp.specification.ram}</p>}
                          {rp.specification?.storage && <p>Almacenamiento: {rp.specification.storage}</p>}
                          {rp.specification?.graphics && <p>Gráficos: {rp.specification.graphics}</p>}
                          {rp.specification?.screen && <p>Pantalla: {rp.specification.screen}</p>}
                          {rp.specification?.resolution && <p>Resolución: {rp.specification.resolution}</p>}
                          {rp.specification?.refreshRate && <p>Tasa de refresco: {rp.specification.refreshRate}</p>}
                          {rp.specification?.connectivity && <p>Conectividad: {rp.specification.connectivity}</p>}
                        </div>
                      </CardContent>
                    </Link>
                    {rp.stock !== null && rp.stock > 0 && (
                      <CardFooter
                        className="p-4 pt-0 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all"
                      >
                      <Button
                          className="w-full"
                          onClick={() => {
                            addItem({
                              id: rp.id,
                              name: rp.name,
                              price: rp.price,
                              image: rp.images[0],
                            })
                            toast.success('Producto agregado al carrito')
                          }}
                        >
                          Agregar al Carrito
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

        </div>
          </>
        )}
      </div>
    </div>
  )
}
