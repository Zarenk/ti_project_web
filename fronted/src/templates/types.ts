import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

/* ────────────────────────────────────────────
 * Template ID
 * ──────────────────────────────────────────── */

export type TemplateId = "classic" | "elegance" | "bold"

/* ────────────────────────────────────────────
 * Shared Domain Types
 * ──────────────────────────────────────────── */

export interface Brand {
  name: string
  logoSvg?: string
  logoPng?: string
}

export interface ProductSpecification {
  processor?: string
  ram?: string
  storage?: string
  graphics?: string
  screen?: string
  resolution?: string
  refreshRate?: string
  connectivity?: string
}

export interface Product {
  id: number
  name: string
  description: string
  price: number
  brand: Brand | null
  category: string
  images: string[]
  stock: number | null
  specification?: ProductSpecification
}

export interface CartItem {
  id: number
  name: string
  price: number
  image?: string
  quantity: number
}

export interface HomeCategory {
  name: string
  icon: LucideIcon
  count: number
}

export interface Testimonial {
  name: string
  rating: number
  comment: string
  location: string
}

export interface Benefit {
  icon: ReactNode
  title: string
  description: string
}

/* ────────────────────────────────────────────
 * Component Props Interfaces
 * ──────────────────────────────────────────── */

/** Navbar — renders from context internally (settings, cart, auth) */
export interface NavbarProps {
  className?: string
}

/** Footer — renders from context internally */
export interface FooterProps {
  className?: string
}

/** Hero section on homepage */
export interface HeroSectionProps {
  heroProducts: Product[]
  onEditProduct?: (productId: number) => void
}

/** Featured products grid on homepage */
export interface FeaturedProductsProps {
  products: Product[]
  onEditProduct?: (productId: number) => void
}

/** Recent products carousel on homepage */
export interface RecentProductsProps {
  products: Product[]
  /** Current visible products (already sliced) */
  visibleProducts: Product[]
  currentIndex: number
  direction: number
  onNext: () => void
  onPrev: () => void
  totalLength: number
}

/** Categories section on homepage */
export interface CategoriesSectionProps {
  categories: HomeCategory[]
  visibleCategories: HomeCategory[]
  currentIndex: number
  direction: number
  onNext: () => void
  onPrev: () => void
  totalLength: number
}

/** Benefits section on homepage */
export interface BenefitsSectionProps {
  benefits: Benefit[]
}

/** Testimonials section on homepage */
export interface TestimonialsSectionProps {
  testimonials: Testimonial[]
}

/** Newsletter section on homepage */
export interface NewsletterSectionProps {
  className?: string
}

/** Single product card */
export interface ProductCardProps {
  product: Product
  withActions?: boolean
  priority?: boolean
  highlightPrice?: boolean
  onEditProduct?: (productId: number) => void
}

/** Store listing page layout */
export interface StoreLayoutProps {
  products: Product[]
  /** Filter/search state is managed internally by the template */
  children?: ReactNode
}

/** Product detail page */
export interface ProductDetailProps {
  product: Product
  /** Stock info per store */
  storeStock: Array<{ storeName: string; stock: number }>
}

/** Cart page layout */
export interface CartLayoutProps {
  className?: string
}

/** Payment/checkout page layout */
export interface PaymentLayoutProps {
  className?: string
}

/** FAQ page layout */
export interface FaqLayoutProps {
  className?: string
}

/** Contact page layout */
export interface ContactLayoutProps {
  className?: string
}

/** Track order page layout */
export interface TrackOrderLayoutProps {
  className?: string
}

/* ────────────────────────────────────────────
 * Template Components Contract
 * ──────────────────────────────────────────── */

export interface TemplateComponents {
  Navbar: React.ComponentType<NavbarProps>
  Footer: React.ComponentType<FooterProps>
  HeroSection: React.ComponentType<HeroSectionProps>
  FeaturedProducts: React.ComponentType<FeaturedProductsProps>
  RecentProducts: React.ComponentType<RecentProductsProps>
  CategoriesSection: React.ComponentType<CategoriesSectionProps>
  BenefitsSection: React.ComponentType<BenefitsSectionProps>
  TestimonialsSection: React.ComponentType<TestimonialsSectionProps>
  NewsletterSection: React.ComponentType<NewsletterSectionProps>
  ProductCard: React.ComponentType<ProductCardProps>
  StoreLayout: React.ComponentType<StoreLayoutProps>
  ProductDetail: React.ComponentType<ProductDetailProps>
  CartLayout: React.ComponentType<CartLayoutProps>
  PaymentLayout: React.ComponentType<PaymentLayoutProps>
  FaqLayout: React.ComponentType<FaqLayoutProps>
  ContactLayout: React.ComponentType<ContactLayoutProps>
  TrackOrderLayout: React.ComponentType<TrackOrderLayoutProps>
}
