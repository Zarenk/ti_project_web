export type MenuItem = {
  id: number
  name: string
  description: string | null
  price: number
  image: string | null
  images: string[]
  available: boolean
  prepTime: number | null
  kitchenStation: string | null
  featured: boolean
}

export type MenuCategory = {
  categoryId: number
  categoryName: string
  items: MenuItem[]
}

export type MenuBranding = {
  restaurantName: string | null
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  showSearch: boolean
}

export type MenuStyle = "elegante" | "luxury" | "moderno" | "tropical"

export type MenuAppearance = {
  theme: "dark" | "light"
  primaryColor: string
  backgroundColor: string
  textColor: string
  menuStyle?: MenuStyle
}

export type MenuHours = {
  enabled: boolean
  schedule: Array<{ day: string; open: string; close: string; closed: boolean }>
}

export type MenuContact = {
  address: string
  phone: string
  email: string
  googleMapsUrl: string
}

export type MenuSocialLinks = {
  facebook: string
  instagram: string
  tiktok: string
  whatsapp: string
}

export type MenuResponse = {
  branding: MenuBranding | null
  appearance: MenuAppearance | null
  hours: MenuHours | null
  contact: MenuContact | null
  socialLinks: MenuSocialLinks | null
  categories: MenuCategory[]
  total: number
}

/** Palette derived from appearance config */
export type MenuPalette = {
  isDark: boolean
  bgColor: string
  textColor: string
  accentColor: string
  mutedText: string
  subtleText: string
  borderColor: string
  cardBg: string
  cardHoverBg: string
  surfaceBg: string
  pillActiveBg: string
  pillActiveText: string
  pillBg: string
  dotColor: string
}

export type MenuStyleProps = {
  categories: MenuCategory[]
  filteredMenu: MenuCategory[]
  featuredItems: MenuItem[]
  branding: MenuBranding | null
  appearance: MenuAppearance
  hours: MenuHours | null
  contact: MenuContact | null
  socialLinks: MenuSocialLinks | null
  palette: MenuPalette
  search: string
  setSearch: (s: string) => void
  activeCategory: string | null
  setActiveCategory: (s: string) => void
  restaurantName: string
  description: string
  logoUrl: string | null
  bannerUrl: string | null
  showSearch: boolean
}
