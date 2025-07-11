"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/progress"
import Navbar from "@/components/navbar"
import { getProduct } from "../../dashboard/products/products.api"

import { toast } from "sonner"
import { getStoresWithProduct } from "../../dashboard/inventory/inventory.api"
import { useCart } from "@/context/cart-context"

interface Props {
  params: { id: string }
}

export default function ProductPage({ params }: Props) {

  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isInWishlist, setIsInWishlist] = useState(false)
  const [product, setProduct] = useState<any>(null)
  const [stock, setStock] = useState<number | null>(null)
  const { addItem } = useCart()

  useEffect(() => {
    async function fetchProduct() {
      try {
        const data = await getProduct(params.id)
        setProduct(data)
      } catch (error) {
        console.error("Error fetching product:", error)
      }
    }
    fetchProduct()
  }, [params.id])

  useEffect(() => {
    async function fetchStock() {
      try {
        const stores = await getStoresWithProduct(Number(params.id))
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
  }, [product, params.id])

  const images: string[] =
    product?.images && product.images.length > 0
      ? product.images
      : product?.image
        ? [product.image]
        : ["/placeholder.svg?height=600&width=600"]

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
    },
  }

  const discountPercentage =
    currentConfig.originalPrice > currentConfig.price
      ? Math.round(
          ((currentConfig.originalPrice - currentConfig.price) /
            currentConfig.originalPrice) *
            100,
        )
      : 0

  const reviews = [
    { name: "Carlos M.", rating: 5, comment: "Excelente laptop para trabajo y gaming. La batería dura todo el día." },
    { name: "Ana L.", rating: 5, comment: "Muy rápida y silenciosa. Perfecta para diseño gráfico." },
    { name: "Miguel R.", rating: 4, comment: "Gran calidad de construcción. La pantalla es increíble." },
  ]

  if (!product) {
    return <div className="p-6">Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
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
              <div className="aspect-square rounded-2xl overflow-hidden bg-white dark:bg-gray-900 shadow-lg group cursor-zoom-in">
                <Image
                  src={images[selectedImage] || "/placeholder.svg"}
                  alt={product?.name || "Producto"}
                  width={600}
                  height={600}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </div>
            </div>

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
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">(4.9) • 2,847 reseñas</span>
                </div>
              </div>
            </div>

            {/* Información del Modelo */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border">
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-blue-500 hover:bg-blue-600">{product?.brand}</Badge>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{product?.name}</h2>
                </div>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {product?.description}
                </p>
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
              </div>
            </div>

            {/* Precio y Cantidad */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border">
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
                  <Button variant="ghost" size="sm" onClick={() => setQuantity(quantity + 1)}>
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
                            ? product.images[0]
                            : product.image,
                      })
                      toast.success("Producto agregado al carrito")
                    }
                  }}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Agregar al Carrito
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setIsInWishlist(!isInWishlist)}
                  className={isInWishlist ? "text-red-500 border-red-500" : ""}
                >
                  <Heart className={`w-5 h-5 ${isInWishlist ? "fill-current" : ""}`} />
                </Button>
              </div>

              <Button size="lg" className="w-full bg-green-600 hover:bg-green-700">
                Comprar Ahora - Envío Gratis
              </Button>
            </div>

            {/* Beneficios */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                <Truck className="w-6 h-6 text-green-500" />
                <div>
                  <p className="font-medium text-sm">Envío Gratis</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Entrega en 24-48h</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                <Shield className="w-6 h-6 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">Garantía 1 año</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Soporte técnico</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                <Award className="w-6 h-6 text-purple-500" />
                <div>
                  <p className="font-medium text-sm">Calidad Premium</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Certificado ISO</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
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
                        <span className="font-medium">15.6" 4K OLED</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Resolución:</span>   
                        <span className="font-medium">3840 x 2160</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tasa de refresco:</span>
                        <span className="font-medium">120Hz</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Conectividad:</span>
                        <span className="font-medium">WiFi 6E, Bluetooth 5.3</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="features" className="mt-8">
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    icon: Battery,
                    title: "Batería de larga duración",
                    description: "Hasta 12 horas de uso continuo con carga rápida en 30 minutos",
                  },
                  {
                    icon: Wifi,
                    title: "Conectividad avanzada",
                    description: "WiFi 6E y Bluetooth 5.3 para conexiones ultra rápidas",
                  },
                  {
                    icon: Shield,
                    title: "Seguridad biométrica",
                    description: "Lector de huellas y reconocimiento facial Windows Hello",
                  },
                  {
                    icon: HardDrive,
                    title: "Almacenamiento expandible",
                    description: "Slot M.2 adicional para expandir hasta 4TB de almacenamiento",
                  },
                  {
                    icon: MemoryStick,
                    title: "Memoria de alta velocidad",
                    description: "DDR5 a 5600MHz para máximo rendimiento multitarea",
                  },
                  {
                    icon: Monitor,
                    title: "Pantalla profesional",
                    description: "100% sRGB, certificada Pantone para diseño profesional",
                  },
                ].map((feature, index) => (
                  <Card key={index}>
                    <CardContent className="p-6 text-center">
                      <feature.icon className="w-12 h-12 mx-auto mb-4 text-blue-500" />
                      <h3 className="font-bold mb-2">{feature.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-8">
              <div className="space-y-6">
                <div className="flex items-center gap-8 mb-8">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600">4.9</div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">2,847 reseñas</div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((stars) => (
                      <div key={stars} className="flex items-center gap-3">
                        <span className="text-sm w-8">{stars}★</span>
                        <Progress value={stars === 5 ? 85 : stars === 4 ? 12 : 2} className="flex-1" />
                        <span className="text-sm text-gray-600 dark:text-gray-400 w-12">
                          {stars === 5 ? "85%" : stars === 4 ? "12%" : "2%"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-6">
                  {reviews.map((review, index) => (
                    <Card key={index}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{review.name}</h4>
                            <div className="flex items-center gap-1 mt-1">
                              {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              ))}
                            </div>
                          </div>
                          <Badge variant="secondary">Compra verificada</Badge>
                        </div>
                         <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
                      </CardContent>
                    </Card>
                  ))}
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
        </div>
      </div>
    </div>
  )
}