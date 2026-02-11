"use client"

import { resolveImageUrl } from "@/lib/images"
import { getProducts } from "@/app/dashboard/products/products.api"
import { getRegisteredClients } from "@/app/dashboard/clients/clients.api"
import { getCompanyDetail } from "@/app/dashboard/tenancy/tenancy.api"
import { getProductsByStore } from "@/app/dashboard/sales/sales.api"
import { getTenantSelection } from "@/utils/tenant-preferences"

export type QuoteCategoryKey = "pc" | "laptops" | "hardware"

export type QuoteOption = {
  id: string
  name: string
  price: number
  image: string
  specs: string[]
  compatibility?: string[]
  highlight?: boolean
  editablePrice?: boolean
  stock?: number | null
  componentType?: "cpu" | "motherboard" | "ram" | "storage" | "gpu" | "monitor" | "peripheral" | "case" | "psu" | "service" | "warranty" | "laptop" | "other"
}

export type QuoteSection = {
  id: string
  title: string
  description: string
  options: QuoteOption[]
}

export type QuoteCatalog = Record<QuoteCategoryKey, QuoteSection[]>

export type QuoteCompanyMeta = {
  name: string
  logoUrl: string
  address: string
  phone: string
  email: string
}

export type QuoteMeta = {
  company: QuoteCompanyMeta
  currencyOptions: string[]
  validityOptions: string[]
  defaultConditions: string
  taxRate: number
  marginRate: number
}

export type QuoteClient = {
  id: number
  name: string
  email?: string
  phone?: string
  document?: string
}

const DEFAULT_META: QuoteMeta = {
  company: {
    name: "Empresa",
    logoUrl: "/logo_ti.png",
    address: "Dirección no disponible",
    phone: "",
    email: "",
  },
  currencyOptions: ["PEN", "USD"],
  validityOptions: ["7 días", "15 días", "30 días"],
  defaultConditions: "Pago 50% adelantado, entrega en 3-5 días hábiles.",
  taxRate: 0.18,
  marginRate: 0.12,
}

const SERVICE_ITEMS: QuoteOption[] = [
  {
    id: "service-assembly-free",
    name: "Armado y configuración (Gratis)",
    price: 0,
    image: "/placeholder.svg?height=120&width=160",
    specs: ["Incluido en la cotización", "Cableado ordenado", "Pruebas básicas"],
    editablePrice: true,
    highlight: true,
    componentType: "service",
  },
  {
    id: "service-assembly",
    name: "Armado y configuración",
    price: 120,
    image: "/placeholder.svg?height=120&width=160",
    specs: ["Cableado ordenado", "Pruebas de estrés", "Instalación base"],
    editablePrice: true,
    componentType: "service",
  },
  {
    id: "service-delivery",
    name: "Delivery especializado",
    price: 60,
    image: "/placeholder.svg?height=120&width=160",
    specs: ["Entrega asegurada", "Rastreo", "Seguro básico"],
    editablePrice: true,
    componentType: "service",
  },
]

const WARRANTY_ITEMS: QuoteOption[] = [
  {
    id: "warranty-12-free",
    name: "Garantía 12 meses (Gratis)",
    price: 0,
    image: "/placeholder.svg?height=120&width=160",
    specs: ["Incluida", "Cobertura básica"],
    editablePrice: true,
    highlight: true,
    componentType: "warranty",
  },
  {
    id: "warranty-12",
    name: "Garantía extendida 12 meses",
    price: 180,
    image: "/placeholder.svg?height=120&width=160",
    specs: ["Cobertura total", "Soporte prioritario"],
    editablePrice: true,
    componentType: "warranty",
  },
  {
    id: "warranty-24",
    name: "Garantía extendida 24 meses",
    price: 320,
    image: "/placeholder.svg?height=120&width=160",
    specs: ["Cobertura total", "Reemplazo express"],
    editablePrice: true,
    componentType: "warranty",
  },
]

const CATEGORY_MAP: Array<{ key: string; section: string; label: string }> = [
  { key: "cpu", section: "core", label: "Procesadores" },
  { key: "procesador", section: "core", label: "Procesadores" },
  { key: "motherboard", section: "core", label: "Placas Madre" },
  { key: "placa", section: "core", label: "Placas Madre" },
  { key: "ram", section: "memory", label: "Memoria RAM" },
  { key: "memoria", section: "memory", label: "Memoria RAM" },
  { key: "ssd", section: "storage", label: "Almacenamiento" },
  { key: "hdd", section: "storage", label: "Almacenamiento" },
  { key: "nvme", section: "storage", label: "Almacenamiento" },
  { key: "gpu", section: "graphics", label: "Gráficos" },
  { key: "grafica", section: "graphics", label: "Gráficos" },
  { key: "monitor", section: "visual", label: "Monitores" },
  { key: "pantalla", section: "visual", label: "Monitores" },
  { key: "teclado", section: "peripherals", label: "Periféricos" },
  { key: "mouse", section: "peripherals", label: "Periféricos" },
  { key: "audifono", section: "peripherals", label: "Periféricos" },
  { key: "case", section: "peripherals", label: "Periféricos" },
  { key: "fuente", section: "peripherals", label: "Periféricos" },
]

function inferSection(name: string): { id: string; label: string } {
  const normalized = name.toLowerCase()
  const match = CATEGORY_MAP.find((entry) => normalized.includes(entry.key))
  if (match) {
    return { id: match.section, label: match.label }
  }
  return { id: "others", label: "Otros componentes" }
}

function getProductPrice(product: any): number {
  if (typeof product?.priceSell === "number") return product.priceSell
  if (typeof product?.price === "number") return product.price
  if (typeof product?.priceSell === "string") return Number(product.priceSell) || 0
  if (typeof product?.price === "string") return Number(product.price) || 0
  return 0
}

function getProductStock(product: any): number | null {
  const candidates = [
    product?.stock,
    product?.totalStock,
    product?.quantity,
    product?.availableQuantity,
  ]
  const value = candidates.find((v) => typeof v === "number")
  return typeof value === "number" ? value : null
}

function getProductImage(product: any): string {
  const image = Array.isArray(product?.images) ? product.images[0] : product?.image
  if (typeof image === "string" && image.length > 0) {
    return resolveImageUrl(image)
  }
  return "/placeholder.svg?height=120&width=160"
}

function normalizeCompanyLogo(url?: string | null): string {
  if (!url) return "/logo_ti.png"
  return resolveImageUrl(url)
}

function extractCompatibilityTags(product: any): string[] {
  const tags = new Set<string>()
  const extra = product?.extraAttributes as Record<string, any> | null
  const spec = product?.specification as Record<string, any> | null
  const name = `${product?.name ?? ""} ${product?.category?.name ?? ""}`.toUpperCase()

  const socket = extra?.socket ?? extra?.cpuSocket ?? extra?.socketType
  const chipset = extra?.chipset
  const ramType = extra?.ramType ?? extra?.memoryType
  const formFactor = extra?.formFactor
  const voltage = extra?.voltage ?? extra?.inputVoltage ?? extra?.voltageRange

  if (socket) tags.add(String(socket).toUpperCase())
  if (chipset) tags.add(String(chipset).toUpperCase())
  if (ramType) tags.add(String(ramType).toUpperCase())
  if (formFactor) tags.add(String(formFactor).toUpperCase())
  if (voltage) tags.add(String(voltage).toUpperCase())

  const specProcessor = spec?.processor ?? spec?.cpu ?? ""
  const specRam = spec?.ram ?? ""
  const specGraphics = spec?.graphics ?? ""

  const scan = `${specProcessor} ${specRam} ${specGraphics} ${name}`.toUpperCase()
  const ramMatch = scan.match(/DDR[3-5]/g)
  if (ramMatch) ramMatch.forEach((v) => tags.add(v))
  const socketMatch = scan.match(/AM4|AM5|LGA\s*1[0-9]{3}/g)
  if (socketMatch) socketMatch.forEach((v) => tags.add(v.replace(/\s+/g, "")))
  const chipsetMatch = scan.match(/(B|Z|H|X|A)\d{3,4}/g)
  if (chipsetMatch) chipsetMatch.forEach((v) => tags.add(v))
  const formFactorMatch = scan.match(/E?ATX|MICRO\s*ATX|M-?ATX|MINI\s*ITX/g)
  if (formFactorMatch) formFactorMatch.forEach((v) => tags.add(v.replace(/\s+/g, "")))
  const voltageMatch = scan.match(/\b\d{2,3}\s*-\s*\d{2,3}\s*V\b|\b\d{2,3}\s*V\b/g)
  if (voltageMatch) voltageMatch.forEach((v) => tags.add(v.replace(/\s+/g, "")))

  return Array.from(tags).slice(0, 6)
}

function mapProductToOption(product: any): QuoteOption {
  const compatibility = extractCompatibilityTags(product)
  const lowered = `${product?.name ?? ""} ${product?.category?.name ?? ""}`.toLowerCase()
  let componentType: QuoteOption["componentType"] = "other"
  if (lowered.includes("laptop") || lowered.includes("notebook")) componentType = "laptop"
  else if (lowered.includes("procesador") || lowered.includes("cpu")) componentType = "cpu"
  else if (lowered.includes("placa") || lowered.includes("motherboard")) componentType = "motherboard"
  else if (lowered.includes("ram") || lowered.includes("memoria")) componentType = "ram"
  else if (lowered.includes("ssd") || lowered.includes("hdd") || lowered.includes("nvme")) componentType = "storage"
  else if (lowered.includes("gpu") || lowered.includes("grafica") || lowered.includes("tarjeta")) componentType = "gpu"
  else if (lowered.includes("monitor") || lowered.includes("pantalla")) componentType = "monitor"
  else if (lowered.includes("case") || lowered.includes("gabinete") || lowered.includes("chasis")) componentType = "case"
  else if (lowered.includes("fuente") || lowered.includes("power supply") || lowered.includes("psu")) componentType = "psu"
  else if (lowered.includes("teclado") || lowered.includes("mouse") || lowered.includes("audifono")) componentType = "peripheral"
  return {
    id: `product-${product.id}`,
    name: String(product.name ?? "Producto"),
    price: getProductPrice(product),
    image: getProductImage(product),
    specs: [
      product?.brand?.name ? `Marca: ${product.brand.name}` : "Marca no registrada",
      product?.model ? `Modelo: ${product.model}` : "Modelo no registrado",
      product?.specification?.processor
        ? `CPU: ${product.specification.processor}`
        : product?.specification?.ram
          ? `RAM: ${product.specification.ram}`
          : "Especificación no registrada",
      product?.category?.name ? `Categoría: ${product.category.name}` : "Categoría general",
    ],
    compatibility: compatibility.length ? compatibility : undefined,
    stock: getProductStock(product),
    componentType,
  }
}

function splitByCategory(products: any[]) {
  const pcSections: Record<string, QuoteSection> = {}
  const hardwareSections: Record<string, QuoteSection> = {}
  const laptopItems: QuoteOption[] = []

  products.forEach((product) => {
    const name = String(product?.name ?? "")
    const categoryName = String(product?.category?.name ?? "")
    const combined = `${name} ${categoryName}`.toLowerCase()
    const isLaptop = combined.includes("laptop") || combined.includes("notebook") || combined.includes("portatil")
    const isPeripheral =
      combined.includes("teclado") ||
      combined.includes("mouse") ||
      combined.includes("audifono") ||
      combined.includes("headset") ||
      combined.includes("monitor") ||
      combined.includes("mousepad")

    const option = mapProductToOption(product)

    if (isLaptop) {
      laptopItems.push(option)
      return
    }

    const targetSections = isPeripheral ? hardwareSections : pcSections
    const { id, label } = inferSection(combined)

    if (!targetSections[id]) {
      targetSections[id] = {
        id,
        title: label,
        description: "Selecciona opciones disponibles del inventario.",
        options: [],
      }
    }
    targetSections[id].options.push(option)
  })

  const pc = Object.values(pcSections)
  const hardware = Object.values(hardwareSections)
  const laptops: QuoteSection[] = [
    {
      id: "laptops",
      title: "Laptops disponibles",
      description: "Catálogo de laptops registradas para venta.",
      options: laptopItems,
    },
  ]

  return { pc, laptops, hardware }
}

export async function getQuoteCatalog(storeId?: number | null): Promise<QuoteCatalog> {
  const products = storeId ? await getProductsByStore(storeId) : await getProducts({ includeInactive: false })
  const { pc, laptops, hardware } = splitByCategory(Array.isArray(products) ? products : [])

  const servicesSection: QuoteSection = {
    id: "services",
    title: "Servicios",
    description: "Servicios con precio ajustable según la necesidad.",
    options: SERVICE_ITEMS,
  }
  const warrantiesSection: QuoteSection = {
    id: "warranties",
    title: "Garantías",
    description: "Extiende la cobertura con precios flexibles.",
    options: WARRANTY_ITEMS,
  }

  return {
    pc: [...pc, servicesSection, warrantiesSection],
    laptops: [...laptops, servicesSection, warrantiesSection],
    hardware: [...hardware, servicesSection, warrantiesSection],
  }
}

export async function getQuoteMeta(companyId?: number | null): Promise<QuoteMeta> {
  if (!companyId) return DEFAULT_META
  const detail = await getCompanyDetail(companyId)
  if (!detail) return DEFAULT_META
  return {
    company: {
      name: detail.name,
      logoUrl: normalizeCompanyLogo(detail.logoUrl),
      address: detail.sunatAddress || "Dirección no registrada",
      phone: detail.sunatPhone || "",
      email: detail.sunatBusinessName || detail.sunatRuc || "",
    },
    currencyOptions: DEFAULT_META.currencyOptions,
    validityOptions: DEFAULT_META.validityOptions,
    defaultConditions: DEFAULT_META.defaultConditions,
    taxRate: DEFAULT_META.taxRate,
    marginRate:
      typeof detail.defaultQuoteMargin === "number"
        ? detail.defaultQuoteMargin
        : DEFAULT_META.marginRate,
  }
}

export async function getQuoteClients(): Promise<QuoteClient[]> {
  const clients = await getRegisteredClients()
  if (!Array.isArray(clients)) return []
  return clients.map((client: any) => ({
    id: Number(client.id),
    name: String(client.name ?? client.nombre ?? "Cliente"),
    email: client.email ?? undefined,
    phone: client.phone ?? undefined,
    document: client.typeNumber ?? undefined,
  }))
}

export async function sendQuoteWhatsApp(params: {
  phone: string
  filename: string
  file: Blob
}): Promise<void> {
  const formData = new FormData()
  formData.append("phone", params.phone)
  formData.append("filename", params.filename)
  formData.append("file", params.file)

  const res = await fetch(`/api/quotes/whatsapp`, {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const message =
      (typeof data === "object" && data && "message" in data ? (data as any).message : null) ||
      "No se pudo enviar la cotización por WhatsApp."
    throw new Error(message)
  }
}

export async function getDefaultQuoteStoreId(): Promise<number | null> {
  const selection = await getTenantSelection()
  return selection?.companyId ?? null
}







