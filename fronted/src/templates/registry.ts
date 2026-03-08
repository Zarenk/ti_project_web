import dynamic from "next/dynamic"
import type { TemplateComponents, TemplateId } from "./types"

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ────────────────────────────────────────────
 * Classic Template (current design, extracted)
 *
 * NOTE: Classic components re-export existing components whose prop types
 * predate the unified template interface. The `as any` casts are intentional
 * and temporary — they will be removed once the existing pages are refactored
 * to pass standardized template props (Phase 5).
 * ──────────────────────────────────────────── */
const classicComponents: TemplateComponents = {
  Navbar: dynamic(() => import("./classic/ClassicNavbar")) as any,
  Footer: dynamic(() => import("./classic/ClassicFooter")) as any,
  HeroSection: dynamic(() => import("./classic/ClassicHeroSection")) as any,
  FeaturedProducts: dynamic(() => import("./classic/ClassicFeaturedProducts")) as any,
  RecentProducts: dynamic(() => import("./classic/ClassicRecentProducts")) as any,
  CategoriesSection: dynamic(() => import("./classic/ClassicCategoriesSection")) as any,
  BenefitsSection: dynamic(() => import("./classic/ClassicBenefitsSection")) as any,
  TestimonialsSection: dynamic(() => import("./classic/ClassicTestimonialsSection")) as any,
  NewsletterSection: dynamic(() => import("./classic/ClassicNewsletterSection")) as any,
  ProductCard: dynamic(() => import("./classic/ClassicProductCard")) as any,
  StoreLayout: dynamic(() => import("./classic/ClassicStoreLayout")),
  ProductDetail: dynamic(() => import("./classic/ClassicProductDetail")),
  CartLayout: dynamic(() => import("./classic/ClassicCartLayout")),
  PaymentLayout: dynamic(() => import("./classic/ClassicPaymentLayout")),
  FaqLayout: dynamic(() => import("./classic/ClassicFaqLayout")),
  ContactLayout: dynamic(() => import("./classic/ClassicContactLayout")),
  TrackOrderLayout: dynamic(() => import("./classic/ClassicTrackOrderLayout")),
}

/* eslint-enable @typescript-eslint/no-explicit-any */

/* ────────────────────────────────────────────
 * Elegance Template
 * ──────────────────────────────────────────── */
const eleganceComponents: TemplateComponents = {
  Navbar: dynamic(() => import("./elegance/EleganceNavbar")),
  Footer: dynamic(() => import("./elegance/EleganceFooter")),
  HeroSection: dynamic(() => import("./elegance/EleganceHeroSection")),
  FeaturedProducts: dynamic(() => import("./elegance/EleganceFeaturedProducts")),
  RecentProducts: dynamic(() => import("./elegance/EleganceRecentProducts")),
  CategoriesSection: dynamic(() => import("./elegance/EleganceCategoriesSection")),
  BenefitsSection: dynamic(() => import("./elegance/EleganceBenefitsSection")),
  TestimonialsSection: dynamic(() => import("./elegance/EleganceTestimonialsSection")),
  NewsletterSection: dynamic(() => import("./elegance/EleganceNewsletterSection")),
  ProductCard: dynamic(() => import("./elegance/EleganceProductCard")),
  StoreLayout: dynamic(() => import("./elegance/EleganceStoreLayout")),
  ProductDetail: dynamic(() => import("./elegance/EleganceProductDetail")),
  CartLayout: dynamic(() => import("./elegance/EleganceCartLayout")),
  PaymentLayout: dynamic(() => import("./elegance/ElegancePaymentLayout")),
  FaqLayout: dynamic(() => import("./elegance/EleganceFaqLayout")),
  ContactLayout: dynamic(() => import("./elegance/EleganceContactLayout")),
  TrackOrderLayout: dynamic(() => import("./elegance/EleganceTrackOrderLayout")),
}

/* ────────────────────────────────────────────
 * Bold Template
 * ──────────────────────────────────────────── */
const boldComponents: TemplateComponents = {
  Navbar: dynamic(() => import("./bold/BoldNavbar")),
  Footer: dynamic(() => import("./bold/BoldFooter")),
  HeroSection: dynamic(() => import("./bold/BoldHeroSection")),
  FeaturedProducts: dynamic(() => import("./bold/BoldFeaturedProducts")),
  RecentProducts: dynamic(() => import("./bold/BoldRecentProducts")),
  CategoriesSection: dynamic(() => import("./bold/BoldCategoriesSection")),
  BenefitsSection: dynamic(() => import("./bold/BoldBenefitsSection")),
  TestimonialsSection: dynamic(() => import("./bold/BoldTestimonialsSection")),
  NewsletterSection: dynamic(() => import("./bold/BoldNewsletterSection")),
  ProductCard: dynamic(() => import("./bold/BoldProductCard")),
  StoreLayout: dynamic(() => import("./bold/BoldStoreLayout")),
  ProductDetail: dynamic(() => import("./bold/BoldProductDetail")),
  CartLayout: dynamic(() => import("./bold/BoldCartLayout")),
  PaymentLayout: dynamic(() => import("./bold/BoldPaymentLayout")),
  FaqLayout: dynamic(() => import("./bold/BoldFaqLayout")),
  ContactLayout: dynamic(() => import("./bold/BoldContactLayout")),
  TrackOrderLayout: dynamic(() => import("./bold/BoldTrackOrderLayout")),
}

/* ────────────────────────────────────────────
 * Registry
 * ──────────────────────────────────────────── */
const registry: Record<TemplateId, TemplateComponents> = {
  classic: classicComponents,
  elegance: eleganceComponents,
  bold: boldComponents,
}

/**
 * Get the component set for a given template.
 * Falls back to classic if the ID is somehow invalid.
 */
export function getTemplateComponents(id: TemplateId): TemplateComponents {
  return registry[id] ?? registry.classic
}
