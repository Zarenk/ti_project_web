"use client"

import React, { useState, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  Heart, Star, ShoppingCart, Truck, Shield, Award, Zap,
  Monitor, Cpu, HardDrive, MemoryStick, Battery,
  Plus, Minus, Package, PackageOpen, Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import TemplateNavbar from "@/templates/TemplateNavbar"
import { useActiveTemplate } from "@/templates/use-active-template"
import { useTemplateComponents } from "@/templates/use-store-template"
import ProductBreadcrumb from "@/components/product-breadcrumb"
import { icons } from "@/lib/icons"
import { resolveImageUrl, getBrandLogoSources } from "@/lib/images"
import { BrandLogo } from "@/components/BrandLogo"
import { AdminProductImageButton } from "@/components/admin/AdminProductImageButton"
import { AdminProductEditButton } from "@/components/admin/AdminProductEditButton"
import { useCart } from "@/context/cart-context"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getFavorites, toggleFavorite } from "@/app/favorites/favorite.api"

import { useProductData } from "./use-product-data"
import { useReviews } from "./use-reviews"
import { useProductEdit } from "./use-product-edit"
import {
  resolveProductImages,
  calculatePricing,
  hasAnySpecs,
  getProductCartItem,
} from "./store-product-utils"
import { ProductLoadingSkeleton } from "./ProductLoadingSkeleton"
import { ProductImageGallery } from "./ProductImageGallery"
import { ProductEditDialog } from "./ProductEditDialog"

interface Props {
  params: Promise<{ id: string }>
}

export default function ProductPage({ params }: Props) {
  const { id } = React.use(params)
  const templateId = useActiveTemplate()
  const { ProductDetail } = useTemplateComponents(templateId)
  const { addItem } = useCart()
  const router = useRouter()

  // Data hooks
  const {
    product, setProduct, stock, storeStock,
    relatedProducts, setRelatedProducts, fetchProduct,
  } = useProductData(id)
  const reviewState = useReviews(id)
  const editState = useProductEdit(product, fetchProduct, setRelatedProducts)

  // Local state
  const [quantity, setQuantity] = useState(1)
  const [isInWishlist, setIsInWishlist] = useState(false)

  // Wishlist check
  React.useEffect(() => {
    async function checkFav() {
      if (!product || !reviewState.userData) return
      try {
        const favs = await getFavorites()
        setIsInWishlist(favs.some((f: any) => f.productId === product.id))
      } catch (err) {
        console.error("Error checking favorites:", err)
      }
    }
    checkFav()
  }, [product, reviewState.userData])

  // Derived values
  const images = useMemo(() => resolveProductImages(product), [product])
  const pricing = useMemo(() => calculatePricing(product), [product])
  const specsAvailable = hasAnySpecs(pricing.specs)
  const [productBrandLogo, ...productBrandLogoFallbacks] = getBrandLogoSources(
    product?.brand ?? null,
  )

  async function handleToggleFavorite() {
    if (!product) return
    try {
      await toggleFavorite(product.id)
      setIsInWishlist((prev) => !prev)
    } catch (err) {
      console.error("Error toggling favorite:", err)
    }
  }

  function handleAddToCart() {
    if (!product) return
    addItem(getProductCartItem(product, quantity))
    toast.success("Producto agregado al carrito")
  }

  function handleBuyNow() {
    if (!product) return
    addItem(getProductCartItem(product, quantity))
    router.push("/cart")
  }

  if (templateId !== "classic" && product) {
    return (
      <>
        <TemplateNavbar />
        <ProductDetail
          product={{
            id: product.id,
            name: product.name,
            description: product.description || "",
            price: product.priceSell ?? product.price,
            brand: product.brand ? { name: product.brand.name } : null,
            category: product.category?.name ?? "",
            images: product.images || [],
            stock: stock ?? 0,
            specification: product.specification as any,
          }}
          storeStock={storeStock}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <TemplateNavbar />

      <ProductEditDialog
        isOpen={editState.isEditDialogOpen}
        onOpenChange={editState.setIsEditDialogOpen}
        productToEdit={editState.productToEdit}
        isLoadingProduct={editState.isLoadingProductToEdit}
        categories={editState.categories}
        isLoadingCategories={editState.isLoadingCategories}
        onSuccess={editState.handleProductUpdateSuccess}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {product === null ? (
          <ProductLoadingSkeleton />
        ) : (
          <>
            <ProductBreadcrumb
              category={product?.category?.name || null}
              brand={product?.brand?.name || null}
              productName={product?.name || ""}
            />

            <div className="grid lg:grid-cols-2 gap-12">
              {/* Image Gallery */}
              <ProductImageGallery
                images={images}
                productName={product?.name || "Producto"}
                productId={product.id}
                currentImages={
                  product.images ?? (product.image ? [product.image] : [])
                }
                discountPercentage={pricing.discountPercentage}
                onImageUpdated={(nextImages) => {
                  setProduct((prev: any) =>
                    prev ? { ...prev, images: nextImages } : prev,
                  )
                  editState.handleImageUpdated(nextImages)
                }}
                onEditClick={editState.handleEditButtonClick}
              />

              {/* Product Info */}
              <div className="space-y-6">
                {/* Badges + Title + Rating */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary">Nuevo Modelo 2025</Badge>
                    <Badge className="bg-blue-500 hover:bg-blue-600">
                      Bestseller
                    </Badge>
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {product?.name || ""}
                  </h1>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < reviewState.roundedRating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                      <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                        ({reviewState.averageRating.toFixed(1)}) •{" "}
                        {reviewState.reviews.length} reseñas
                      </span>
                    </div>
                  </div>
                </div>

                {/* Brand + Description + Specs Preview */}
                <div className="space-y-4">
                  <div className="bg-card p-6 rounded-xl shadow-sm border">
                    <div className="flex items-center gap-3 mb-3">
                      {product?.brand?.name ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link
                              href={`/store?brand=${encodeURIComponent(product.brand.name)}`}
                              className="group inline-flex"
                              aria-label={`Ver catálogo de ${product.brand.name}`}
                            >
                              <Badge className="flex items-center gap-2 bg-blue-500 transition-all duration-200 hover:bg-blue-600 hover:shadow-lg cursor-pointer group-hover:-translate-y-0.5">
                                {productBrandLogo && (
                                  <BrandLogo
                                    src={productBrandLogo}
                                    alt={product.brand.name}
                                    fallbackSrc={productBrandLogoFallbacks}
                                    className="h-4 w-auto transition-transform duration-200 group-hover:scale-110"
                                  />
                                )}
                                <span className="font-semibold tracking-wide">
                                  {product.brand.name}
                                </span>
                              </Badge>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent>
                            Ver catálogo de {product.brand.name}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Badge className="bg-blue-500 hover:bg-blue-600 flex items-center gap-1">
                          {productBrandLogo && (
                            <BrandLogo
                              src={productBrandLogo}
                              alt={product?.brand?.name}
                              fallbackSrc={productBrandLogoFallbacks}
                              className="h-4 w-auto"
                            />
                          )}
                          {product?.brand?.name}
                        </Badge>
                      )}
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {product?.name}
                      </h2>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {product?.description}
                    </p>
                    {specsAvailable ? (
                      <div className="flex flex-wrap items-center gap-3 mt-4">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-5 h-5 text-blue-500" />
                          <span className="text-sm font-medium">
                            {pricing.specs.processor}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MemoryStick className="w-5 h-5 text-green-500" />
                          <span className="text-sm font-medium">
                            {pricing.specs.ram}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-5 h-5 text-purple-500" />
                          <span className="text-sm font-medium">
                            {pricing.specs.storage}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Monitor className="w-5 h-5 text-orange-500" />
                          <span className="text-sm font-medium">
                            {pricing.specs.graphics}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                        Especificaciones no disponibles
                      </p>
                    )}
                  </div>
                </div>

                {/* Price + Quantity + Actions */}
                <div className="bg-card p-6 rounded-xl shadow-sm border">
                  <div className="flex flex-col gap-4 mb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-3xl font-bold text-green-600">
                          S/.{pricing.price.toFixed(2)}
                        </span>
                        <span className="text-xl text-gray-500 dark:text-gray-400 line-through">
                          S/.{pricing.originalPrice.toFixed(2)}
                        </span>
                        {pricing.originalPrice > pricing.price && (
                          <Badge className="bg-red-500 hover:bg-red-600">
                            Ahorra S/.
                            {(pricing.originalPrice - pricing.price).toFixed(2)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Precio incluye IVA • 12 cuotas sin interés
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:flex-wrap">
                    <div className="flex items-center justify-between gap-4 w-full sm:w-auto">
                      <span className="text-sm font-medium">Cantidad:</span>
                      <div className="flex items-center justify-between border rounded-lg w-full max-w-[220px] sm:w-auto sm:max-w-none">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                          className="transition-all duration-150 hover:bg-blue-50 hover:text-blue-600 cursor-pointer disabled:opacity-70 active:scale-95"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="px-4 py-2 font-medium">{quantity}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setQuantity(quantity + 1)}
                          disabled={
                            stock !== null && (stock <= 0 || quantity >= stock)
                          }
                          className="transition-all duration-150 hover:bg-blue-50 hover:text-blue-600 cursor-pointer disabled:opacity-70 active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="w-full text-sm sm:w-auto">
                      {stock !== null ? (
                        stock > 0 ? (
                          <span className="text-green-600">
                            Solo quedan {stock} en stock
                          </span>
                        ) : (
                          <span className="text-red-600">
                            Sin stock disponible
                          </span>
                        )
                      ) : (
                        <span className="text-gray-600">Cargando stock...</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mb-4 sm:flex-row">
                    {stock !== null && stock > 0 && (
                      <Button
                        size="lg"
                        className="w-full sm:flex-1 sm:w-auto bg-blue-600 hover:bg-blue-700 cursor-pointer transition-transform duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                        onClick={handleAddToCart}
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
                          className={`w-full sm:w-auto cursor-pointer transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                            isInWishlist ? "text-red-500 border-red-500" : ""
                          }`}
                        >
                          <Heart
                            className={`w-5 h-5 ${isInWishlist ? "fill-current" : ""}`}
                          />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Agregar a favoritos</TooltipContent>
                    </Tooltip>
                  </div>

                  {stock !== null && stock > 0 && (
                    <Button
                      size="lg"
                      className="w-full bg-green-600 hover:bg-green-700 cursor-pointer transition-transform duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                      onClick={handleBuyNow}
                    >
                      Comprar Ahora - Envío Gratis
                    </Button>
                  )}
                </div>

                {/* Benefits Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    { icon: Truck, color: "text-green-500", title: "Envío Gratis", desc: "Entrega en 24-48h" },
                    { icon: Shield, color: "text-blue-500", title: "Garantía 1 año", desc: "Soporte técnico" },
                    { icon: Award, color: "text-purple-500", title: "Calidad Premium", desc: "Certificado ISO" },
                    { icon: Zap, color: "text-yellow-500", title: "Setup Gratis", desc: "Configuración incluida" },
                  ].map(({ icon: Icon, color, title, desc }) => (
                    <div
                      key={title}
                      className="flex items-center gap-3 p-4 bg-card rounded-lg shadow-sm sm:p-3"
                    >
                      <Icon className={`w-6 h-6 ${color}`} />
                      <div>
                        <p className="font-medium text-sm">{title}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-16">
              <Tabs defaultValue="specs" className="w-full">
                <TabsList className="flex w-full gap-0 overflow-x-auto rounded-lg bg-muted/50 p-0 sm:grid sm:grid-cols-4 sm:overflow-visible">
                  {[
                    { value: "specs", label: "Especificaciones" },
                    { value: "features", label: "Características" },
                    { value: "reviews", label: "Reseñas" },
                    { value: "support", label: "Soporte" },
                  ].map(({ value, label }) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className="flex-1 whitespace-normal break-words px-3 py-2 text-xs transition-all duration-150 hover:bg-blue-50 hover:text-blue-600 cursor-pointer sm:text-sm sm:h-full sm:items-center sm:justify-center sm:text-center"
                    >
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* Specs Tab */}
                <TabsContent value="specs" className="mt-8">
                  {specsAvailable ? (
                    <div className="grid md:grid-cols-2 gap-8">
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Cpu className="w-6 h-6 text-blue-500" /> Rendimiento
                          </h3>
                          <div className="space-y-3">
                            {[
                              ["Procesador", pricing.specs.processor],
                              ["Memoria RAM", pricing.specs.ram],
                              ["Almacenamiento", pricing.specs.storage],
                              ["Gráficos", pricing.specs.graphics],
                            ].map(([label, value]) => (
                              <div key={label} className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {label}:
                                </span>
                                <span className="font-medium">{value}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Monitor className="w-6 h-6 text-green-500" />{" "}
                            Display & Conectividad
                          </h3>
                          <div className="space-y-3">
                            {[
                              ["Pantalla", pricing.specs.screen],
                              ["Resolución", pricing.specs.resolution],
                              ["Tasa de refresco", pricing.specs.refreshRate],
                              ["Conectividad", pricing.specs.connectivity],
                            ].map(([label, value]) => (
                              <div key={label} className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {label}:
                                </span>
                                <span className="font-medium">{value}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-xl font-bold mb-4">
                          Especificaciones
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Especificaciones no disponibles
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Features Tab */}
                <TabsContent value="features" className="mt-8">
                  {product?.features && product.features.length > 0 ? (
                    <div className="grid md:grid-cols-3 gap-6">
                      {product.features.map((feature: any) => {
                        const IconComponent =
                          icons[feature.icon as keyof typeof icons] || Battery
                        return (
                          <Card key={feature.id}>
                            <CardContent className="p-6 text-center">
                              <IconComponent className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                              <h3 className="font-bold mb-2">{feature.title}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {feature.description}
                              </p>
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

                {/* Reviews Tab */}
                <TabsContent value="reviews" className="mt-8">
                  <div className="space-y-6">
                    {reviewState.userData ? (
                      <Card className="bg-card/70 border border-blue-100">
                        <CardContent className="p-6 space-y-4">
                          <h3 className="text-2xl font-bold text-yellow-500">
                            Reseñas
                          </h3>
                          <h4 className="font-semibold text-blue-700">
                            Si te gustó el producto, bríndanos tu reseña
                          </h4>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                onClick={() =>
                                  reviewState.setRatingValue(i + 1)
                                }
                                className={`w-6 h-6 cursor-pointer transition-colors ${
                                  i < reviewState.ratingValue
                                    ? "text-blue-500 fill-blue-500"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <Textarea
                            defaultValue={reviewState.comment}
                            onBlur={(e) =>
                              reviewState.setComment(e.target.value)
                            }
                            ref={reviewState.commentRef}
                            placeholder="Escribe tu opinión"
                            className="bg-card/60"
                          />
                          <Button
                            className="bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
                            onClick={reviewState.handleReviewSubmit}
                          >
                            Guardar reseña
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="bg-card/70 border border-blue-100">
                        <CardContent className="p-6 space-y-4 text-center">
                          <h4 className="font-semibold text-blue-700">
                            Si te gustó el producto, bríndanos tu reseña
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Para dejar una reseña necesitas iniciar sesión o
                            registrarte.
                          </p>
                          <div className="flex justify-center gap-4">
                            <Button
                              asChild
                              className="bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
                            >
                              <Link href="/login">Iniciar Sesión</Link>
                            </Button>
                            <Button
                              asChild
                              variant="outline"
                              className="cursor-pointer"
                            >
                              <Link href="/register">Registrarse</Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid gap-6">
                      {reviewState.reviews.map((review: any) => (
                        <Card
                          key={review.id}
                          className={
                            review.userId === reviewState.userData?.id
                              ? "border-l-4 border-blue-500 bg-blue-50/30"
                              : "bg-card/60"
                          }
                        >
                          <CardContent className="p-6 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-blue-800">
                                  {review.user?.username}
                                </h4>
                                <div className="flex items-center gap-1 mt-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < review.rating
                                          ? "fill-yellow-400 text-yellow-400"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(
                                  review.createdAt,
                                ).toLocaleDateString()}
                              </span>
                              <Badge variant="secondary">
                                Compra verificada
                              </Badge>
                            </div>
                            {review.comment && (
                              <p className="text-gray-700 dark:text-gray-300">
                                {review.comment}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      {reviewState.reviews.length === 0 && (
                        <p className="text-sm text-gray-500">
                          Aún no hay reseñas
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Support Tab */}
                <TabsContent value="support" className="mt-8">
                  <div className="grid md:grid-cols-2 gap-8">
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-xl font-bold mb-4">
                          Garantía y Soporte
                        </h3>
                        <div className="space-y-4">
                          {[
                            {
                              title: "Garantía extendida de 1 año",
                              desc: "Cobertura completa de hardware y software",
                            },
                            {
                              title: "Soporte técnico 24/7",
                              desc: "Chat, teléfono y soporte remoto",
                            },
                            {
                              title: "Servicio a domicilio",
                              desc: "Reparación en tu hogar u oficina",
                            },
                          ].map(({ title, desc }) => (
                            <div key={title} className="flex items-start gap-3">
                              <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium">{title}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {desc}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-xl font-bold mb-4">
                          Información de Envío
                        </h3>
                        <div className="space-y-4">
                          {[
                            {
                              icon: Truck,
                              color: "text-blue-500",
                              title: "Envío express gratuito",
                              desc: "Entrega en 24-48 horas hábiles",
                            },
                            {
                              icon: Shield,
                              color: "text-green-500",
                              title: "Seguro de transporte",
                              desc: "Cobertura total durante el envío",
                            },
                            {
                              icon: Check,
                              color: "text-purple-500",
                              title: "Devolución gratuita",
                              desc: "30 días para cambios y devoluciones",
                            },
                          ].map(({ icon: Icon, color, title, desc }) => (
                            <div key={title} className="flex items-start gap-3">
                              <Icon
                                className={`w-5 h-5 ${color} mt-0.5 flex-shrink-0`}
                              />
                              <div>
                                <p className="font-medium">{title}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {desc}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Related Products */}
              {relatedProducts.length > 0 && (
                <div className="mt-16">
                  <h2 className="text-2xl font-bold mb-6">
                    Productos relacionados
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {relatedProducts.map((rp) => {
                      const [brandLogo, ...brandLogoFallbacks] =
                        getBrandLogoSources(rp.brand ?? null)
                      return (
                        <Card
                          key={rp.id}
                          className="group relative overflow-hidden hover:shadow-lg transition-shadow duration-200 card-stripes border-transparent hover:border-border"
                        >
                          <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
                            <AdminProductImageButton
                              productId={rp.id}
                              currentImages={rp.images}
                              onImageUpdated={(nextImages) =>
                                editState.handleRelatedImageUpdated(
                                  rp.id,
                                  nextImages,
                                )
                              }
                            />
                            <AdminProductEditButton
                              productId={rp.id}
                              onClick={() => {
                                void editState.handleRelatedProductEditClick(
                                  rp.id,
                                )
                              }}
                            />
                          </div>
                          <Link href={`/store/${rp.id}`} className="block">
                            <CardHeader className="p-0">
                              <div className="relative overflow-hidden rounded-t-lg">
                                <Image
                                  src={
                                    resolveImageUrl(rp.images[0]) ||
                                    "/placeholder.svg"
                                  }
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
                                {brandLogo && (
                                  <BrandLogo
                                    src={brandLogo}
                                    alt={rp.brand?.name}
                                    fallbackSrc={brandLogoFallbacks}
                                    className="h-4 w-auto"
                                  />
                                )}
                                {rp.brand?.name}
                              </span>
                              <div className="flex items-center justify-between">
                                <span className="text-2xl font-bold text-green-600">
                                  S/.{rp.price.toFixed(2)}
                                </span>
                              </div>
                              <p
                                className={`text-xs mt-1 flex items-center gap-1 ${
                                  rp.stock !== null && rp.stock > 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }`}
                              >
                                {rp.stock !== null && rp.stock > 0 ? (
                                  <PackageOpen className="w-4 h-4" />
                                ) : (
                                  <Package className="w-4 h-4" />
                                )}
                                {rp.stock !== null && rp.stock > 0
                                  ? `Stock: ${rp.stock}`
                                  : "Sin stock"}
                              </p>
                              <div className="hidden group-hover:block mt-2 space-y-1 text-xs text-muted-foreground">
                                {rp.specification?.processor && (
                                  <p>
                                    Procesador: {rp.specification.processor}
                                  </p>
                                )}
                                {rp.specification?.ram && (
                                  <p>RAM: {rp.specification.ram}</p>
                                )}
                                {rp.specification?.storage && (
                                  <p>
                                    Almacenamiento: {rp.specification.storage}
                                  </p>
                                )}
                                {rp.specification?.graphics && (
                                  <p>Gráficos: {rp.specification.graphics}</p>
                                )}
                              </div>
                            </CardContent>
                          </Link>
                          {rp.stock !== null && rp.stock > 0 && (
                            <CardFooter className="p-4 pt-0 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 transition-all">
                              <Button
                                className="w-full cursor-pointer"
                                onClick={() => {
                                  addItem({
                                    id: rp.id,
                                    name: rp.name,
                                    price: rp.price,
                                    image: rp.images[0],
                                  })
                                  toast.success("Producto agregado al carrito")
                                }}
                              >
                                Agregar al Carrito
                              </Button>
                            </CardFooter>
                          )}
                        </Card>
                      )
                    })}
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
