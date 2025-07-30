"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AnimatePresence, motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import MotionProductCard from "@/components/MotionProductCard"
import HeroSlideshow from "@/components/HeroSlideshow"
import {
  ShoppingCart,
  User,
  Menu,
  X,
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
  Star,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react"
import Navbar from "@/components/navbar"
import { useCart } from "@/context/cart-context"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import { getProducts } from "./dashboard/products/products.api"
import { getCategoriesWithCount } from "./dashboard/categories/categories.api"

export default function Homepage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [email, setEmail] = useState("")

  interface FeaturedProduct {
    id: number
    name: string
    description: string
    price: number
    brand: string
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

  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([])
  const [heroProducts, setHeroProducts] = useState<FeaturedProduct[]>([])

   useEffect(() => {
    async function fetchProductsData() {
      try {
        const products = await getProducts()
        const withImages = (products as any[])
          .filter((p) => p.images && p.images.length > 0)
          .slice(0, 6)
          .map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description || "",
            price: p.priceSell ?? p.price,           
            brand: p.brand || "Sin marca",
            category: p.category?.name || "Sin categoría",
            images: p.images || [],
            stock: p.stock ?? null,
            specification: p.specification ?? undefined,
          })) as FeaturedProduct[]
        setHeroProducts(withImages)
        setFeaturedProducts(withImages.slice(0, 6))
      } catch (error) {
        console.error("Error fetching featured products:", error)
      }
    }
    fetchProductsData()
  }, [])

  const [categories, setCategories] = useState<HomeCategory[]>([])
  const [categoryIndex, setCategoryIndex] = useState(0)
  const [direction, setDirection] = useState(0)

  const iconMap: Record<string, LucideIcon> = {
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

  useEffect(() => {
    async function fetchCategoriesData() {
      try {
        const data = await getCategoriesWithCount()
        const mapped = data.map((cat: any) => ({
          name: cat.name,
          icon: iconMap[cat.name] || HardDrive,
          count: cat.productCount,
        }))
        setCategories(mapped)
      } catch (error) {
        console.error("Error fetching categories:", error)
      }
    }
    fetchCategoriesData()
  }, [])

  const nextCategories = () =>
    setCategoryIndex((i) =>
      categories.length > 0 ? (i + 6) % categories.length : i,
    )
  const prevCategories = () =>
    setCategoryIndex((i) =>
      categories.length > 0 ? (i - 6 + categories.length) % categories.length : i,
    )

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

  const benefits = [
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

  const testimonials = [
    {
      name: "Carlos Mendoza",
      rating: 5,
      comment: "Excelente servicio y productos de calidad. Mi laptop gaming llegó perfecta y funciona increíble.",
      location: "Lima, Perú",
    },
    {
      name: "María González",
      rating: 5,
      comment: "Compré una PC para mi oficina y el soporte técnico fue excepcional. Muy recomendado.",
      location: "Arequipa, Perú",
    },
    {
      name: "Diego Ramírez",
      rating: 5,
      comment: "Los mejores precios del mercado y entrega súper rápida. Ya es mi tienda de confianza.",
      location: "Trujillo, Perú",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-gray-950 dark:to-black">
      <Navbar />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-sky-100 via-blue-50 to-sky-100 py-20 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 dark:text-gray-100 leading-tight">
                  Potencia tu productividad con nuestras <span className="text-sky-600">laptops y componentes</span>
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                  Equipos de alto rendimiento para trabajo, estudio y gaming. Encuentra la tecnología perfecta para tus
                  necesidades.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-sky-500 hover:bg-sky-600 text-white px-8 py-3 text-lg">
                  Ver productos
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-sky-300 text-sky-600 hover:bg-sky-50 px-8 py-3 text-lg bg-transparent"
                >
                  Ofertas especiales
                </Button>
              </div>
            </div>
            <HeroSlideshow products={heroProducts} />
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">Productos destacados</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Descubre nuestra selección de equipos más populares con las mejores ofertas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts.map((product) => (
              <MotionProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-gradient-to-b from-sky-50 to-white dark:from-gray-900 dark:to-black">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">Explora por categoría</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Encuentra exactamente lo que necesitas en nuestras categorías especializadas
            </p>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={categoryIndex}
                initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
                transition={{ type: "tween" }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6"
                >
                {visibleCategories.map((category, index) => (
                  <Link
                    key={index}
                    href={`/store?category=${encodeURIComponent(category.name)}`}
                  >
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-sky-100 hover:border-sky-200">
                        <CardContent className="p-6 text-center">
                          <div className="w-16 h-16 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                            <category.icon className="w-8 h-8 text-white" />
                          </div>
                          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2 group-hover:text-sky-600 transition-colors">
                            {category.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{category.count}+ productos</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Link>
                ))}
              </motion.div>
            </AnimatePresence>
            {categories.length > 6 && (
              <>
                <motion.button
                  aria-label="Anterior"
                  onClick={prevCategories}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[150%] bg-white/70 hover:bg-white text-gray-800 p-2 rounded-full"
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </motion.button>
                <motion.button
                  aria-label="Siguiente"
                  onClick={nextCategories}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[150%] bg-white/70 hover:bg-white text-gray-800 p-2 rounded-full"
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">¿Por qué comprar con nosotros?</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Ofrecemos la mejor experiencia de compra con servicios que marcan la diferencia
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <benefit.icon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">{benefit.title}</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-b from-sky-50 to-white dark:from-gray-900 dark:to-black">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">Lo que dicen nuestros clientes</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Miles de clientes satisfechos confían en nosotros para sus necesidades tecnológicas
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-sky-100 hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed italic">"{testimonial.comment}"</p>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{testimonial.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{testimonial.location}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter & Contact */}
      <section className="py-20 bg-gradient-to-r from-sky-500 to-blue-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Suscríbete y recibe ofertas exclusivas</h2>
              <p className="text-xl text-sky-100 mb-8">
                Mantente al día con las últimas novedades, ofertas especiales y lanzamientos de productos
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Input
                  type="email"
                  placeholder="Tu correo electrónico"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-white dark:bg-gray-800 dark:text-gray-100 text-gray-800 border-0"
                />
                <Button className="bg-white text-sky-600 hover:bg-sky-50 px-8">Suscribirme</Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
