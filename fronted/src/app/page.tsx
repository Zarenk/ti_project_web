"use client"

import { useState, useEffect, useRef } from 'react';
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
import { toast } from "sonner"
import { getProducts } from "./dashboard/products/products.api"
import { getCategoriesWithCount } from "./dashboard/categories/categories.api"
import { getRecentEntries } from "./dashboard/entries/entries.api"
import UltimosIngresosSection from '@/components/home/UltimosIngresosSection';
import HeroSection from '@/components/home/HeroSection';
import FeaturedProductsSection from '@/components/home/FeaturedProductsSection';
import CategoriesSection from '@/components/home/CategoriesSection';
import BenefitsSection from '@/components/home/BenefitsSection';
import TestimonialsSection from '@/components/home/TestimonialSection';
import NewsletterSection from '@/components/home/NewsletterSection';

export default function Homepage() {
  const sectionsRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState("")

  const handleSubscribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Suscripción exitosa');
      setEmail('');
    } catch (err) {
      console.error(err);
      toast.error('Error al suscribirse');
    }
  };

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

  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>([])
  const [heroProducts, setHeroProducts] = useState<FeaturedProduct[]>([])
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([])
  const [recentIndex, setRecentIndex] = useState(0)
  const [recentDirection, setRecentDirection] = useState(0)

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
            brand: p.brand
              ? {
                  name: p.brand.name,
                  logoSvg: p.brand.logoSvg,
                  logoPng: p.brand.logoPng,
                }
              : null,
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

  useEffect(() => {
    async function fetchRecent() {
      try {
        const data = await getRecentEntries(5)
        setRecentProducts(data)
      } catch (error) {
        console.error('Error fetching recent entries:', error)
      }
    }
    fetchRecent()
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

  useEffect(() => {
    let ctx: any
    async function loadGsap() {
      try {
        const gsapModule = await import("gsap")
        const ScrollTrigger = await import("gsap/ScrollTrigger")
        gsapModule.default.registerPlugin(ScrollTrigger.default)
        ctx = gsapModule.default.context(() => {
          gsapModule.default
            .utils.toArray(".gsap-section")
            .forEach((section:any) => {
              gsapModule.default.from(section, {
                y: 100,
                opacity: 0,
                duration: 1,
                ease: "power2.out",
                scrollTrigger: {
                  trigger: section,
                  start: "top 80%",
                },
              })
            })
        }, sectionsRef)
      } catch (err) {
        console.error("GSAP animations failed to load", err)
      }
    }
    loadGsap()
    return () => ctx?.kill(false)
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
    recentProducts.length <= 4
      ? recentProducts
      : [
          ...recentProducts.slice(recentIndex, recentIndex + 4),
          ...(recentIndex + 4 > recentProducts.length
            ? recentProducts.slice(0, (recentIndex + 4) % recentProducts.length)
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
      <div ref={sectionsRef}>
        <section className="gsap-section">
          <HeroSection heroProducts={heroProducts} />
        </section>
        <section className="gsap-section">
          <UltimosIngresosSection
            visibleRecent={visibleRecent}
            recentIndex={recentIndex}
            recentDirection={recentDirection}
            nextRecent={nextRecent}
            prevRecent={prevRecent}
            recentProductsLength={recentProducts.length}
          />
        </section>
        <section className="gsap-section">
          <FeaturedProductsSection featuredProducts={featuredProducts} />
        </section>
        <section className="gsap-section">
          <CategoriesSection
            visibleCategories={visibleCategories}
            categoryIndex={categoryIndex}
            direction={direction}
            nextCategories={nextCategories}
            prevCategories={prevCategories}
            categoriesLength={categories.length}
          />
        </section>
        <section className="gsap-section">
          <BenefitsSection benefits={benefits} />
        </section>
        <section className="gsap-section">
          <TestimonialsSection testimonials={testimonials} />
        </section>
        <section className="gsap-section">
          <NewsletterSection
            email={email}
            setEmail={setEmail}
            handleSubscribe={handleSubscribe}
          />
        </section>
      </div>
    </div>
  )
}
