"use client"

import { resolveImageUrl } from "@/lib/images"
import { getProducts } from "@/app/dashboard/products/products.api"
import { getRegisteredClients } from "@/app/dashboard/clients/clients.api"
import { getCompanyDetail } from "@/app/dashboard/tenancy/tenancy.api"
import { getProductsByStore } from "@/app/dashboard/sales/sales.api"
import { getTenantSelection } from "@/utils/tenant-preferences"
import { authFetch } from "@/utils/auth-fetch"

export type QuoteCategoryKey = "pc" | "laptops" | "hardware"

export type QuoteOption = {
  id: string
  name: string
  categoryName?: string
  price: number
  costPrice?: number
  image: string
  specs: string[]
  description?: string
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
  documentType?: string
  documentNumber?: string
}

export type QuoteItemPayload = {
  productId?: number | null
  name: string
  description?: string | null
  specs?: string[] | null
  unitPrice: number
  costPrice?: number | null
  quantity: number
  type?: "PRODUCT" | "SERVICE" | "WARRANTY"
  category?: "PC" | "LAPTOP" | "HARDWARE" | "SERVICE" | "WARRANTY"
}

export type QuoteDraftPayload = {
  clientId?: number | null
  clientNameSnapshot?: string | null
  contactSnapshot?: string | null
  currency: string
  validity: string
  conditions?: string | null
  taxRate?: number | null
  subtotal?: number | null
  taxAmount?: number | null
  marginAmount?: number | null
  total?: number | null
  items: QuoteItemPayload[]
}

export type QuoteDetail = {
  id: number
  quoteNumber: string | null
  status: "DRAFT" | "ISSUED" | "CANCELLED"
  createdAt: string
  issuedAt: string | null
  currency: string
  validity: string
  conditions: string | null
  taxRate: number
  subtotal: number
  taxAmount: number
  marginAmount: number
  total: number
  clientNameSnapshot: string | null
  contactSnapshot: string | null
  items: Array<{
    id: number
    productId: number | null
    name: string
    description: string | null
    specs: any
    unitPrice: number
    costPrice: number | null
    quantity: number
    lineTotal: number
    type: "PRODUCT" | "SERVICE" | "WARRANTY"
    category: "PC" | "LAPTOP" | "HARDWARE" | "SERVICE" | "WARRANTY"
  }>
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

function getProductCost(product: any): number {
  if (typeof product?.price === "number") return product.price
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

function formatSpecLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function shouldIgnoreSpecKey(key: string): boolean {
  const normalized = key.replace(/_/g, "").toLowerCase()
  return [
    "id",
    "productid",
    "createdat",
    "updatedat",
    "deletedat",
  ].includes(normalized)
}

function formatSpecValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length ? trimmed : null
  }
  if (typeof value === "number") return String(value)
  if (typeof value === "boolean") return value ? "Sí" : "No"
  if (Array.isArray(value)) {
    const items = value
      .map((item) => formatSpecValue(item))
      .filter(Boolean)
    return items.length ? items.join(", ") : null
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => {
        const formatted = formatSpecValue(v)
        return formatted ? `${formatSpecLabel(k)}: ${formatted}` : null
      })
      .filter(Boolean)
    return entries.length ? entries.join(", ") : null
  }
  return null
}

function buildProductSpecs(product: any): { description?: string; details: string[] } {
  const specs: string[] = []
  let description: string | undefined
  if (product?.brand?.name) specs.push(`Marca: ${product.brand.name}`)
  if (product?.model) specs.push(`Modelo: ${product.model}`)
  if (product?.category?.name) specs.push(`Categoría: ${product.category.name}`)
  if (product?.description) description = String(product.description)

  const specification = product?.specification
  if (specification && typeof specification === "object") {
    Object.entries(specification as Record<string, unknown>).forEach(([key, value]) => {
      if (shouldIgnoreSpecKey(key)) return
      const formatted = formatSpecValue(value)
      if (!formatted) return
      const label = formatSpecLabel(key)
      const entry = `${label}: ${formatted}`
      specs.push(entry)
    })
  }

  const extra = product?.extraAttributes
  if (extra && typeof extra === "object") {
    Object.entries(extra as Record<string, unknown>).forEach(([key, value]) => {
      if (shouldIgnoreSpecKey(key)) return
      const formatted = formatSpecValue(value)
      if (!formatted) return
      const label = formatSpecLabel(key)
      const entry = `${label}: ${formatted}`
      specs.push(entry)
    })
  }

  const unique = Array.from(new Set(specs.map((item) => item.trim()).filter(Boolean)))
  return {
    description,
    details: unique.length ? unique : ["Especificación no registrada"],
  }
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
  const specData = buildProductSpecs(product)
  return {
    id: `product-${product.id}`,
    name: String(product.name ?? "Producto"),
    categoryName: product?.category?.name ? String(product.category.name) : undefined,
    price: getProductPrice(product),
    costPrice: getProductCost(product),
    image: getProductImage(product),
    specs: specData.details,
    description: specData.description,
    compatibility: compatibility.length ? compatibility : undefined,
    stock: getProductStock(product),
    componentType,
  }
}

function splitByCategory(products: any[]) {
  const pcSections: Record<string, QuoteSection> = {}
  const hardwareSections: Record<string, QuoteSection> = {}
  const laptopItems: QuoteOption[] = []

  const toSectionId = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")

  const ensureSection = (
    target: Record<string, QuoteSection>,
    sectionId: string,
    sectionTitle: string,
  ) => {
    if (!target[sectionId]) {
      target[sectionId] = {
        id: sectionId,
        title: sectionTitle,
        description: "Selecciona opciones disponibles del inventario.",
        options: [],
      }
    }
    return target[sectionId]
  }

  products.forEach((product) => {
    const name = String(product?.name ?? "")
    const categoryName = String(product?.category?.name ?? "")
    const combined = `${name} ${categoryName}`.toLowerCase()
    const isLaptop = combined.includes("laptop") || combined.includes("notebook") || combined.includes("portatil")
    const option = mapProductToOption(product)

    if (isLaptop) {
      laptopItems.push(option)
      return
    }

    const { id: pcId, label: pcLabel } = inferSection(combined)
    ensureSection(pcSections, pcId, pcLabel).options.push(option)

    const hardwareLabel = categoryName.trim() || "Otros componentes"
    const hardwareId = `hw-${toSectionId(hardwareLabel) || "otros"}`
    ensureSection(hardwareSections, hardwareId, hardwareLabel).options.push(option)
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
    documentType: client.type ?? undefined,
    documentNumber: client.typeNumber ?? undefined,
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

export async function createQuoteDraft(payload: QuoteDraftPayload) {
  const res = await authFetch(`/quotes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    const message = typeof data?.message === "string" ? data.message : "No se pudo guardar la cotización."
    throw new Error(message)
  }
  return (await res.json()) as QuoteDetail
}

export async function updateQuoteDraft(id: number, payload: Partial<QuoteDraftPayload>) {
  const res = await authFetch(`/quotes/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    const message = typeof data?.message === "string" ? data.message : "No se pudo actualizar la cotización."
    throw new Error(message)
  }
  return (await res.json()) as QuoteDetail
}

export async function issueQuote(
  id: number,
  options?: {
    stockValidationMode?: "STORE" | "GLOBAL" | "NONE"
    storeId?: number | null
  },
) {
  const res = await authFetch(`/quotes/${id}/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      stockValidationMode: options?.stockValidationMode ?? "NONE",
      storeId: typeof options?.storeId === "number" ? options.storeId : null,
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    const message = typeof data?.message === "string" ? data.message : "No se pudo emitir la cotización."
    throw new Error(message)
  }
  return (await res.json()) as QuoteDetail
}

export async function cancelQuote(id: number) {
  const res = await authFetch(`/quotes/${id}/cancel`, {
    method: "POST",
  })
  if (!res.ok) {
    throw new Error("No se pudo cancelar la cotización.")
  }
  return (await res.json()) as QuoteDetail
}

export async function getQuoteById(id: number) {
  const res = await authFetch(`/quotes/${id}`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error("No se pudo cargar la cotización.")
  }
  return (await res.json()) as QuoteDetail
}

export async function getDefaultQuoteStoreId(): Promise<number | null> {
  const selection = await getTenantSelection()
  return selection?.companyId ?? null
}

export type BankAccount = {
  bankName: string
  accountHolderName: string
  accountNumber: string
  cci?: string
}

export async function getBankAccounts(companyId: number): Promise<BankAccount[]> {
  const res = await authFetch(`/companies/${companyId}/bank-accounts`, { cache: "no-store" })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data?.bankAccounts) ? data.bankAccounts : []
}

export async function saveBankAccounts(companyId: number, bankAccounts: BankAccount[]): Promise<BankAccount[]> {
  const res = await authFetch(`/companies/${companyId}/bank-accounts`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bankAccounts }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(typeof data?.message === "string" ? data.message : "No se pudieron guardar las cuentas bancarias.")
  }
  const data = await res.json()
  return Array.isArray(data?.bankAccounts) ? data.bankAccounts : bankAccounts
}









