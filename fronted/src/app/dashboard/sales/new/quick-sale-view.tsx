"use client"

// Stable empty array to prevent unstable references in useMemo dependencies.
const STABLE_EMPTY: any[] = []

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Search,
  ShoppingCart,
  Loader2,
  ChevronsUpDown,
  Check,
  Store,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { jwtDecode } from "jwt-decode"

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn, normalizeSearch } from "@/lib/utils"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { getAuthToken } from "@/utils/auth-token"
import { fetchCompanyVerticalInfo } from "../../tenancy/tenancy.api"

import { getStores } from "../../stores/stores.api"
import { getRegisteredClients } from "../../clients/clients.api"
import {
  createSale,
  getProductsByStore,
  getPaymentMethods,
  sendInvoiceToSunat,
} from "../sales.api"
import { isSubscriptionBlockedError } from "@/lib/subscription-error"
import { SubscriptionBlockedDialog } from "@/components/subscription-blocked-dialog"

import { SaleContextBar } from "../components/quick-sale/sale-context-bar"
import {
  SaleProductCard,
  type SaleProductCardItem,
} from "../components/quick-sale/sale-product-card"
import { SaleCartSidebar } from "../components/quick-sale/sale-cart-sidebar"
import { SaleSerialsDialog } from "../components/quick-sale/sale-serials-dialog"
import { SplitPaymentDialog } from "../components/quick-sale/sale-split-payment-dialog"
import { StoreChangeDialog } from "../components/StoreChangeDialog"
import { InvoiceDocument } from "../components/pdf/InvoiceDocument"
import { TicketInvoiceDocument } from "../components/pdf/TicketInvoiceDocument"
import { useSiteSettings } from "@/context/site-settings-context"
import { numeroALetrasCustom } from "../components/utils/numeros-a-letras"
import { uploadPdfToServer } from "@/lib/utils"
import { getCompanyDetail, type CompanyDetail } from "../../tenancy/tenancy.api"
import { pdf } from "@react-pdf/renderer"
import QRCode from "qrcode"
import { isDraftExpired } from "@/lib/draft-utils"
import { useSaleCart } from "./use-sale-cart"
import { useSalePayment } from "./use-sale-payment"

async function getUserIdFromToken(): Promise<number | null> {
  const token = await getAuthToken()
  if (!token) return null
  try {
    const decoded: { sub: number } = jwtDecode(token)
    return decoded.sub
  } catch {
    return null
  }
}

type PaymentMethodOption = { id: number; name: string }

const DEFAULT_PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: -1, name: "EN EFECTIVO" },
  { id: -2, name: "TRANSFERENCIA" },
  { id: -3, name: "PAGO CON VISA" },
  { id: -4, name: "YAPE" },
  { id: -5, name: "PLIN" },
  { id: -6, name: "OTRO MEDIO DE PAGO" },
]

type QuickSaleDraftCartItem = {
  productId: number
  quantity: number
  unitPrice: number
  product: SaleProductCardItem
}

type QuickSaleDraft = {
  version: 1
  savedAt: number
  storeId: number | null
  clientId: number | null | undefined
  saleDateISO: string
  tipoComprobante: string
  cartItems: QuickSaleDraftCartItem[]
  serials: { productId: number; serialNumbers: string[] }[]
  selectedPayment: { paymentMethodId: number; amount: number; currency: string } | null
  splitPayments: { paymentMethodId: number; amount: number; currency: string }[]
}

type QuickSaleViewProps = {
  categories: { id: number; name: string }[]
}

export function QuickSaleView({ categories }: QuickSaleViewProps) {
  const router = useRouter()
  const { selection } = useTenantSelection()
  const queryClient = useQueryClient()
  const invalidateSales = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.sales.root(selection.orgId, selection.companyId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.root(selection.orgId, selection.companyId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.products.root(selection.orgId, selection.companyId) })
  }
  const { settings } = useSiteSettings()
  const receiptFormat = settings.company.receiptFormat ?? "a4"
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false)

  // --- Data loading via useQuery ---
  const { data: storesRaw = STABLE_EMPTY, isLoading: storesLoading } = useQuery({
    queryKey: queryKeys.stores.list(selection.orgId, selection.companyId),
    queryFn: () => getStores(),
    enabled: selection.orgId !== null,
  })
  const stores = useMemo(
    () => (storesRaw as any[]).map((s: any) => ({ id: s.id, name: s.name })),
    [storesRaw],
  )

  const { data: clientsRaw = STABLE_EMPTY, isLoading: clientsLoading } = useQuery({
    queryKey: queryKeys.clients.list(selection.orgId, selection.companyId),
    queryFn: () => getRegisteredClients(),
    enabled: selection.orgId !== null,
  })
  const clients = useMemo(
    () => (Array.isArray(clientsRaw) ? clientsRaw : []) as { id: number; name: string; type: string; typeNumber: string }[],
    [clientsRaw],
  )

  const { data: paymentMethodsRaw = STABLE_EMPTY } = useQuery({
    queryKey: [...queryKeys.sales.root(selection.orgId, selection.companyId), "paymentMethods"],
    queryFn: () => getPaymentMethods().catch(() => []),
    enabled: selection.orgId !== null,
  })
  const paymentMethods = useMemo(() => {
    const combined = [
      ...DEFAULT_PAYMENT_METHODS,
      ...((paymentMethodsRaw as any[]) ?? []),
    ]
    return Array.from(
      new Map(combined.map((m) => [m.name, m])).values(),
    ) as PaymentMethodOption[]
  }, [paymentMethodsRaw])

  const { data: verticalInfo } = useQuery({
    queryKey: queryKeys.vertical.config(selection.orgId, selection.companyId),
    queryFn: () => fetchCompanyVerticalInfo(selection.companyId!),
    enabled: selection.companyId !== null,
  })
  const serialsEnabled = verticalInfo?.config?.features?.serialNumbers ?? false

  const { data: activeCompany = null } = useQuery({
    queryKey: [...queryKeys.stores.root(selection.orgId, selection.companyId), "companyDetail"],
    queryFn: () => getCompanyDetail(selection.companyId!).catch(() => null),
    enabled: selection.companyId !== null,
  })

  const dataLoading = storesLoading || clientsLoading
  const [productsLoading, setProductsLoading] = useState(false)
  const [products, setProducts] = useState<SaleProductCardItem[]>([])

  // --- Filters ---
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false)
  const [showAllCategories, setShowAllCategories] = useState(false)

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12) // Fixed for quick sale

  // --- Context ---
  const [storeId, setStoreId] = useState<number | null>(null)
  // undefined = not yet selected, null = "Publico General", number = specific client
  const [clientId, setClientId] = useState<number | null | undefined>(undefined)
  const [saleDate, setSaleDate] = useState<Date>(new Date())

  // --- Cart + Serials (hook) ---
  const {
    cartMap, cartItems, cartTotal, cartCount,
    stockMap, setStockMap,
    serialsMap,
    addToCart, decrementCart, updateCartQty, updateCartPrice, removeFromCart,
    serialDialogOpen, setSerialDialogOpen,
    serialDialogProductId, serialDialogLoading,
    handleSerialClick, handleSerialSave,
    serialDialogProduct, serialDialogAssigned,
    serialDialogAvailable, serialDialogOtherSerials,
    hydrateCart, resetCart,
  } = useSaleCart(storeId, serialsEnabled)

  // --- Payment (hook) ---
  const {
    selectedPayment, splitPayments,
    splitDialogOpen, setSplitDialogOpen,
    handleQuickPay, handleSplitPayClick, handleSplitPayConfirm,
    hydratePayment, resetPayment,
  } = useSalePayment(cartTotal)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // ──────────────────────────────────────────────
  // Draft persistence
  // ──────────────────────────────────────────────
  const [userId, setUserId] = useState<number | null>(null)
  useEffect(() => {
    getUserIdFromToken().then((id) => setUserId(id))
  }, [])

  const quickDraftKey = useMemo(() => {
    if (!userId || !selection.orgId) return null
    const companyKey = selection.companyId ?? 0
    return `sales-quick-draft:v1:${userId}:${selection.orgId}:${companyKey}`
  }, [userId, selection.orgId, selection.companyId])

  const [draftPromptOpen, setDraftPromptOpen] = useState(false)
  const [pendingDraft, setPendingDraft] = useState<QuickSaleDraft | null>(null)
  const draftSaveTimerRef = useRef<number | null>(null)
  const draftAppliedRef = useRef(false)

  // --- Comprobante ---
  const [tipoComprobante, setTipoComprobante] = useState("SIN COMPROBANTE")

  // Derive client document type from selected client
  const clientDocType: "RUC" | "DNI" | null = (() => {
    if (clientId == null) return null // null = Publico General, undefined = not selected
    const client = clients.find((c) => c.id === clientId)
    if (!client?.type) return null
    return client.type.toUpperCase() === "RUC" ? "RUC" : "DNI"
  })()

  // Auto-set comprobante when client changes
  useEffect(() => {
    if (clientId === undefined) return // not yet selected
    if (clientId === null) {
      // Publico General: default SIN COMPROBANTE, user can switch to BOLETA manually
      setTipoComprobante("SIN COMPROBANTE")
    } else if (clientDocType === "RUC") {
      setTipoComprobante("FACTURA")
    } else {
      setTipoComprobante("BOLETA")
    }
  }, [clientId, clientDocType])

  // ──────────────────────────────────────────────
  // Draft: build snapshot
  // ──────────────────────────────────────────────
  const buildDraftSnapshot = useCallback((): QuickSaleDraft | null => {
    if (!quickDraftKey || typeof window === "undefined") return null
    const items: QuickSaleDraftCartItem[] = []
    cartMap.forEach((item, productId) => {
      items.push({
        productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        product: item.product,
      })
    })
    const serials: { productId: number; serialNumbers: string[] }[] = []
    serialsMap.forEach((nums, productId) => {
      if (nums.length > 0) serials.push({ productId, serialNumbers: nums })
    })
    const draft: QuickSaleDraft = {
      version: 1,
      savedAt: Date.now(),
      storeId,
      clientId,
      saleDateISO: saleDate.toISOString(),
      tipoComprobante,
      cartItems: items,
      serials,
      selectedPayment,
      splitPayments,
    }
    // Only save meaningful drafts (has cart items OR payment OR client)
    if (items.length === 0 && !selectedPayment && splitPayments.length === 0 && clientId === undefined) {
      return null
    }
    return draft
  }, [quickDraftKey, cartMap, serialsMap, storeId, clientId, saleDate, tipoComprobante, selectedPayment, splitPayments])

  const persistDraft = useCallback(
    (draft: QuickSaleDraft | null) => {
      if (!quickDraftKey || typeof window === "undefined") return
      try {
        if (!draft) {
          window.localStorage.removeItem(quickDraftKey)
          return
        }
        window.localStorage.setItem(quickDraftKey, JSON.stringify(draft))
      } catch {
        // silently ignore — localStorage may be full or blocked
      }
    },
    [quickDraftKey],
  )

  const scheduleDraftSave = useCallback(() => {
    if (!quickDraftKey || typeof window === "undefined") return
    if (draftSaveTimerRef.current) {
      window.clearTimeout(draftSaveTimerRef.current)
    }
    draftSaveTimerRef.current = window.setTimeout(() => {
      persistDraft(buildDraftSnapshot())
    }, 400)
  }, [quickDraftKey, buildDraftSnapshot, persistDraft])

  // ── Draft: auto-save on state changes ─────────────
  useEffect(() => {
    if (!quickDraftKey) return
    scheduleDraftSave()
  }, [
    quickDraftKey,
    cartMap, serialsMap,
    storeId, clientId, saleDate,
    tipoComprobante,
    selectedPayment, splitPayments,
    scheduleDraftSave,
  ])

  // ── Draft: save on page unload ────────────────────
  useEffect(() => {
    if (!quickDraftKey || typeof window === "undefined") return
    const handleBeforeUnload = () => {
      persistDraft(buildDraftSnapshot())
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [quickDraftKey, buildDraftSnapshot, persistDraft])

  // ── Draft: restore on mount ───────────────────────
  useEffect(() => {
    if (!quickDraftKey || typeof window === "undefined") return
    if (draftAppliedRef.current) return
    try {
      const raw = window.localStorage.getItem(quickDraftKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as QuickSaleDraft
      if (!parsed || parsed.version !== 1 || isDraftExpired(parsed.savedAt)) {
        window.localStorage.removeItem(quickDraftKey)
        return
      }
      // Check if draft has meaningful data
      if (parsed.cartItems.length === 0 && !parsed.selectedPayment && parsed.splitPayments.length === 0 && parsed.clientId === undefined) {
        window.localStorage.removeItem(quickDraftKey)
        return
      }
      setPendingDraft(parsed)
      setDraftPromptOpen(true)
    } catch {
      // silently ignore corrupt data
    }
  }, [quickDraftKey])

  // ── Draft: apply function ─────────────────────────
  const applyDraft = useCallback(
    (draft: QuickSaleDraft) => {
      draftAppliedRef.current = true
      // Restore context
      if (draft.storeId !== null) setStoreId(draft.storeId)
      if (draft.clientId !== undefined) setClientId(draft.clientId)
      try {
        setSaleDate(new Date(draft.saleDateISO))
      } catch {
        setSaleDate(new Date())
      }
      // Restore cart + serials
      hydrateCart(draft.cartItems, draft.serials)
      // Restore payment
      hydratePayment(draft.selectedPayment, draft.splitPayments)
      // Restore comprobante AFTER a micro-tick so the auto-set useEffect
      // (triggered by clientId change) fires first, then we override it
      setTimeout(() => {
        setTipoComprobante(draft.tipoComprobante)
      }, 0)
      setDraftPromptOpen(false)
      setPendingDraft(null)
    },
    [hydrateCart, hydratePayment],
  )

  const discardDraft = useCallback(() => {
    if (draftSaveTimerRef.current) {
      window.clearTimeout(draftSaveTimerRef.current)
      draftSaveTimerRef.current = null
    }
    if (quickDraftKey && typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(quickDraftKey)
      } catch {
        // ignore
      }
    }
    draftAppliedRef.current = true
    setPendingDraft(null)
    setDraftPromptOpen(false)
  }, [quickDraftKey])

  // --- Store change ---
  const [pendingStoreId, setPendingStoreId] = useState<number | null>(null)
  const [storeChangeDialogOpen, setStoreChangeDialogOpen] = useState(false)

  // --- Mobile ---
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  // --- Idempotency ---
  const saleReferenceIdRef = useRef<string | null>(null)

  // Data is loaded via useQuery hooks above

  // ──────────────────────────────────────────────
  // Products load when storeId changes
  // ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    if (!storeId) {
      setProducts([])
      setStockMap(new Map())
      return
    }
    async function fetchProducts() {
      setProductsLoading(true)
      try {
        const raw = await getProductsByStore(storeId!)
        if (cancelled) return
        const items: SaleProductCardItem[] = []
        const newStockMap = new Map<number, number>()
        for (const item of raw as any[]) {
          const product = item?.inventory?.product
          if (!product) continue
          const stock = item?.stock ?? product.stock ?? 0
          const id = product.id
          newStockMap.set(id, stock)
          items.push({
            id,
            name: product.name,
            description: product.description || "",
            price: product.price ?? 0,
            priceSell: product.priceSell ?? 0,
            categoryId: product.categoryId ?? product.category?.id ?? null,
            category_name: product.category?.name || null,
            images: product.images,
            specification: product.specification,
            brand: product.brand,
            features: product.features ?? [],
            extraAttributes: product.extraAttributes ?? {},
            stock,
          })
        }
        setProducts(items)
        setStockMap(newStockMap)
      } catch {
        if (!cancelled) {
          setProducts([])
          setStockMap(new Map())
        }
      } finally {
        if (!cancelled) setProductsLoading(false)
      }
    }
    fetchProducts()
    return () => {
      cancelled = true
    }
  }, [storeId])

  // ──────────────────────────────────────────────
  // Store change handler
  // ──────────────────────────────────────────────
  const handleStoreChange = useCallback(
    (newStoreId: number) => {
      if (cartMap.size > 0 && storeId !== null && newStoreId !== storeId) {
        setPendingStoreId(newStoreId)
        setStoreChangeDialogOpen(true)
      } else {
        setStoreId(newStoreId)
      }
    },
    [cartMap.size, storeId],
  )

  const confirmStoreChange = useCallback(() => {
    resetCart()
    resetPayment()
    setStoreId(pendingStoreId)
    setPendingStoreId(null)
    setStoreChangeDialogOpen(false)
  }, [pendingStoreId, resetCart, resetPayment])

  // ──────────────────────────────────────────────
  // Filter products
  // ──────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    let result = products
    if (selectedCategory !== null) {
      result = result.filter(
        (p) => Number(p.categoryId) === selectedCategory,
      )
    }
    if (searchQuery.trim()) {
      const q = normalizeSearch(searchQuery)
      result = result.filter(
        (p) =>
          normalizeSearch(p.name).includes(q) ||
          (p.category_name && normalizeSearch(p.category_name).includes(q)) ||
          (p.description && normalizeSearch(p.description).includes(q)),
      )
    }
    return result
  }, [products, selectedCategory, searchQuery])

  // --- Category list from loaded products (sorted by product count) ---
  const usedCategories = useMemo(() => {
    const countMap = new Map<number, { name: string; count: number }>()
    for (const p of products) {
      const catId = Number(p.categoryId)
      if (catId && p.category_name) {
        const existing = countMap.get(catId)
        if (existing) {
          existing.count++
        } else {
          countMap.set(catId, { name: p.category_name, count: 1 })
        }
      }
    }
    return Array.from(countMap.entries())
      .map(([id, { name, count }]) => ({ id, name, count }))
      .sort((a, b) => b.count - a.count) // Most used first
  }, [products])

  // --- Pagination for products ---
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage)
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredProducts.slice(startIndex, endIndex)
  }, [filteredProducts, currentPage, itemsPerPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedCategory])

  // --- Visible categories (limit to 10 most used) ---
  const visibleCategories = useMemo(() => {
    if (showAllCategories) return usedCategories
    return usedCategories.slice(0, 10)
  }, [usedCategories, showAllCategories])

  // ──────────────────────────────────────────────
  // Context hint
  // ──────────────────────────────────────────────
  const contextHint = useMemo(() => {
    const missing: string[] = []
    if (!storeId) missing.push("tienda")
    if (clientId === undefined) missing.push("cliente")
    const hasPayment = selectedPayment !== null || splitPayments.length > 0
    if (cartItems.length > 0 && !hasPayment) missing.push("metodo de pago")
    if (missing.length === 0) return undefined
    return `Selecciona ${missing.join(" y ")} para continuar`
  }, [storeId, clientId, cartItems.length, selectedPayment, splitPayments.length])

  // ──────────────────────────────────────────────
  // Submit
  // ──────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!storeId) {
      toast.error("Selecciona una tienda")
      return
    }
    if (clientId === undefined) {
      toast.error("Selecciona un cliente")
      return
    }
    if (cartItems.length === 0) {
      toast.error("Agrega al menos un producto")
      return
    }

    // Validate all products have valid prices
    const invalidPriceProducts = cartItems.filter(
      (item) => !item.unitPrice || item.unitPrice <= 0 || !Number.isFinite(item.unitPrice)
    )
    if (invalidPriceProducts.length > 0) {
      const productNames = invalidPriceProducts
        .map((item) => item.product.name)
        .join(", ")
      toast.error(
        `Los siguientes productos tienen precio invalido: ${productNames}. Actualiza los precios antes de continuar.`
      )
      return
    }

    // Build payments array
    let paymentsPayload: {
      paymentMethodId: number
      amount: number
      currency: string
    }[]
    if (splitPayments.length > 0) {
      paymentsPayload = splitPayments
    } else if (selectedPayment) {
      paymentsPayload = [selectedPayment]
    } else {
      toast.error("Selecciona un metodo de pago")
      return
    }

    // Validate payment total
    const paymentTotal = paymentsPayload.reduce((sum, p) => sum + p.amount, 0)
    if (Math.abs(paymentTotal - cartTotal) > 0.01) {
      toast.error(
        `Los pagos (S/. ${paymentTotal.toFixed(2)}) no coinciden con el total (S/. ${cartTotal.toFixed(2)})`,
      )
      return
    }

    const userId = await getUserIdFromToken()
    if (!userId) {
      toast.error(
        "No se pudo obtener el usuario. Inicia sesion nuevamente.",
      )
      return
    }

    // Generate idempotency key
    if (!saleReferenceIdRef.current) {
      saleReferenceIdRef.current =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    }

    setIsSubmitting(true)
    try {
      const details = cartItems.map((item) => {
        const serials = serialsMap.get(item.product.id)
        return {
          productId: item.product.id,
          quantity: item.quantity,
          price: item.unitPrice,
          ...(serials && serials.length > 0 ? { series: serials } : {}),
        }
      })

      const total = Number(cartTotal.toFixed(2))

      const createdSale = await createSale({
        userId,
        storeId: storeId!,
        ...(clientId != null ? { clientId } : {}),
        total,
        details,
        tipoMoneda: "PEN",
        payments: paymentsPayload,
        source: "POS",
        referenceId: saleReferenceIdRef.current,
        fechaEmision: saleDate.toISOString(),
        ...(tipoComprobante !== "SIN COMPROBANTE"
          ? { tipoComprobante }
          : {}),
      })

      toast.success("Venta registrada exitosamente")
      saleReferenceIdRef.current = null

      // Clear draft on successful sale
      if (draftSaveTimerRef.current) {
        window.clearTimeout(draftSaveTimerRef.current)
        draftSaveTimerRef.current = null
      }
      if (quickDraftKey && typeof window !== "undefined") {
        try { window.localStorage.removeItem(quickDraftKey) } catch { /* ignore */ }
      }
      draftAppliedRef.current = true

      // Generate comprobante PDF if applicable
      if (tipoComprobante !== "SIN COMPROBANTE" && createdSale?.id) {
        const serieInvoice = createdSale.invoice?.serie ?? null
        const correlativoInvoice = createdSale.invoice?.nroCorrelativo ?? null

        const selectedClient = clientId != null
          ? clients.find((c) => c.id === clientId)
          : null

        const tipoDocumentoFormatted =
          selectedClient?.type?.toUpperCase() === "RUC" ? "6" : "1"

        // Map to SUNAT document type: FACTURA→invoice, BOLETA→boleta
        const sunatDocType =
          tipoComprobante === "FACTURA" ? "invoice" : "boleta"

        const emitterBusinessName =
          activeCompany?.sunatBusinessName?.trim() ||
          activeCompany?.legalName?.trim() ||
          activeCompany?.name?.trim() ||
          stores.find((s) => s.id === storeId)?.name || ""

        const emitterAddress = activeCompany?.sunatAddress?.trim() || ""
        const emitterPhone = activeCompany?.sunatPhone?.trim() || null
        const emitterRuc =
          activeCompany?.sunatRuc?.trim() ||
          activeCompany?.taxId?.trim() || ""

        const logoUrl = activeCompany?.logoUrl?.trim() || null

        const invoicePayload = {
          saleId: createdSale.id,
          companyId: activeCompany?.id ?? selection?.companyId ?? null,
          serie: serieInvoice,
          correlativo: correlativoInvoice,
          documentType: sunatDocType,
          tipoMoneda: "PEN",
          total,
          fechaEmision: saleDate.toISOString(),
          logoUrl,
          primaryColor: activeCompany?.primaryColor ?? null,
          secondaryColor: activeCompany?.secondaryColor ?? null,
          cliente: {
            razonSocial: selectedClient?.name || "PUBLICO GENERAL",
            ruc: selectedClient?.typeNumber || "",
            dni: selectedClient?.typeNumber || "",
            nombre: selectedClient?.name || "PUBLICO GENERAL",
            tipoDocumento: tipoDocumentoFormatted,
          },
          emisor: {
            razonSocial: emitterBusinessName,
            address: emitterAddress,
            adress: emitterAddress,
            phone: emitterPhone,
            ruc: emitterRuc,
            logoUrl,
            primaryColor: activeCompany?.primaryColor ?? null,
            secondaryColor: activeCompany?.secondaryColor ?? null,
          },
          items: cartItems.map((item) => {
            const lineTotal = Math.round(item.unitPrice * item.quantity * 100) / 100
            const lineSubtotal = Math.round((lineTotal / 1.18) * 100) / 100
            const lineIgv = Math.round((lineTotal - lineSubtotal) * 100) / 100
            return {
              cantidad: item.quantity,
              descripcion: item.product.name,
              series: serialsMap.get(item.product.id) || [],
              precioUnitario: item.unitPrice,
              subtotal: lineSubtotal,
              subTotal: lineSubtotal,
              igv: lineIgv,
              total: lineTotal,
            }
          }),
          pagos: paymentsPayload.map((p) => {
            const method = paymentMethods.find((m) => m.id === p.paymentMethodId)
              ?? DEFAULT_PAYMENT_METHODS.find((m) => m.id === p.paymentMethodId)
            return {
              metodo: method?.name || "OTRO",
              monto: p.amount,
              moneda: p.currency || "PEN",
            }
          }),
        }

        // 1) Send to SUNAT (non-blocking — PDF opens regardless)
        sendInvoiceToSunat(invoicePayload)
          .then((sunatResponse) => {
            if (sunatResponse.message?.toLowerCase().includes("exitosamente")) {
              toast.success("Comprobante enviado a SUNAT correctamente.")
            } else if (sunatResponse.message) {
              toast.error(`Error SUNAT: ${sunatResponse.message}`)
            }
          })
          .catch((sunatErr) => {
            console.error("Error al enviar a SUNAT:", sunatErr)
            const errMsg = sunatErr instanceof Error ? sunatErr.message : String(sunatErr)
            if (isSubscriptionBlockedError(errMsg)) {
              setSubscriptionBlocked(true)
              return
            }
            toast.error("No se pudo enviar el comprobante a SUNAT")
          })

        // 2) Generate PDF and open in new window (always runs)
        try {
          const totalTexto = numeroALetrasCustom(total, "PEN")
          const verificationCode = createdSale.invoice?.verificationCode
          const baseUrl =
            typeof window !== "undefined" ? window.location.origin : ""
          const qrData = verificationCode
            ? `${baseUrl}/verify/${verificationCode}`
            : `Representación impresa de la ${tipoComprobante} ELECTRÓNICA\nN° ${serieInvoice}-${correlativoInvoice}`
          const qrCode = await QRCode.toDataURL(qrData)

          const invoiceProps = {
            data: {
              ...invoicePayload,
              serie: serieInvoice,
              correlativo: correlativoInvoice,
            },
            qrCode,
            importeEnLetras: totalTexto,
          }
          const invoiceDoc = receiptFormat === "ticket"
            ? <TicketInvoiceDocument {...invoiceProps} />
            : <InvoiceDocument {...invoiceProps} />
          const blob = await pdf(invoiceDoc).toBlob()
          const blobUrl = URL.createObjectURL(blob)
          window.open(blobUrl)

          // Upload PDF to server
          const uploadBlob = await pdf(invoiceDoc).toBlob()
          await uploadPdfToServer({
            blob: uploadBlob,
            ruc: emitterRuc || "00000000000",
            tipoComprobante: sunatDocType,
            serie: serieInvoice!,
            correlativo: correlativoInvoice!,
          })
        } catch (pdfErr) {
          console.error("Error al generar comprobante PDF:", pdfErr)
          toast.error("Venta registrada pero hubo un error al generar el comprobante")
        }
      }

      invalidateSales()
      router.push("/dashboard/sales")
    } catch (err: any) {
      const message = err?.message || "Error al registrar la venta"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ──────────────────────────────────────────────
  // Loading state
  // ──────────────────────────────────────────────
  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Context bar */}
      <SaleContextBar
        stores={stores}
        clients={clients}
        storeId={storeId}
        clientId={clientId}
        saleDate={saleDate}
        onStoreChange={handleStoreChange}
        onClientChange={setClientId}
        onDateChange={setSaleDate}
        onClientCreated={() => {
          queryClient.invalidateQueries({ queryKey: queryKeys.clients.root(selection.orgId, selection.companyId) })
        }}
        onDocumentTypeDetected={(type) => {
          setTipoComprobante(type === "RUC" ? "FACTURA" : "BOLETA")
        }}
        loading={dataLoading}
      />

      {/* Main split layout */}
      <div className="flex gap-4">
        {/* Left panel - Product grid */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Search + category filter */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {usedCategories.length > 1 && (
                <Popover
                  open={categoryFilterOpen}
                  onOpenChange={setCategoryFilterOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full max-w-[180px] cursor-pointer justify-between sm:w-[180px]"
                    >
                      <span className="truncate">
                        {selectedCategory
                          ? usedCategories.find(
                              (c) => c.id === selectedCategory,
                            )?.name ?? "Categoria"
                          : "Todas las categorias"}
                      </span>
                      <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[180px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar..." />
                      <CommandList>
                        <CommandEmpty>Sin resultados</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__all__"
                            className="cursor-pointer"
                            onSelect={() => {
                              setSelectedCategory(null)
                              setCategoryFilterOpen(false)
                            }}
                          >
                            Todas
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedCategory === null
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                          </CommandItem>
                          {usedCategories.map((cat) => (
                            <CommandItem
                              key={cat.id}
                              value={cat.name}
                              className="cursor-pointer"
                              onSelect={() => {
                                setSelectedCategory(
                                  selectedCategory === cat.id
                                    ? null
                                    : cat.id,
                                )
                                setCategoryFilterOpen(false)
                              }}
                            >
                              {cat.name}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  selectedCategory === cat.id
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Category pills (quick access) - show top 10 most used */}
            {usedCategories.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant={selectedCategory === null ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => setSelectedCategory(null)}
                >
                  Todas
                </Badge>
                {visibleCategories.map((cat) => (
                  <Badge
                    key={cat.id}
                    variant={
                      selectedCategory === cat.id ? "default" : "outline"
                    }
                    className="cursor-pointer transition-colors"
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === cat.id ? null : cat.id,
                      )
                    }
                  >
                    {cat.name}
                  </Badge>
                ))}
                {usedCategories.length > 10 && (
                  <Badge
                    variant="secondary"
                    className="cursor-pointer transition-colors hover:bg-secondary/80"
                    onClick={() => setShowAllCategories(!showAllCategories)}
                  >
                    {showAllCategories ? "Ver menos..." : `Ver más... (+${usedCategories.length - 10})`}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* No store selected */}
          {!storeId && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <Store className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">
                Selecciona una tienda para ver los productos disponibles
              </p>
            </div>
          )}

          {/* Products loading */}
          {storeId && productsLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty products */}
          {storeId && !productsLoading && filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedCategory !== null
                  ? "No se encontraron productos con ese filtro."
                  : "No hay productos disponibles en esta tienda."}
              </p>
            </div>
          )}

          {/* Products count and pagination info */}
          {storeId && !productsLoading && filteredProducts.length > 0 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <p>
                Mostrando {paginatedProducts.length} de {filteredProducts.length} productos
              </p>
              {totalPages > 1 && (
                <p>
                  Página {currentPage} de {totalPages}
                </p>
              )}
            </div>
          )}

          {/* Product grid */}
          {storeId && !productsLoading && filteredProducts.length > 0 && (
            <>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {paginatedProducts.map((product) => (
                  <SaleProductCard
                    key={product.id}
                    product={product}
                    cartQuantity={cartMap.get(product.id)?.quantity ?? 0}
                    maxStock={stockMap.get(product.id) ?? 0}
                    onAdd={() => addToCart(product)}
                    onIncrement={() => addToCart(product)}
                    onDecrement={() => decrementCart(product.id)}
                  />
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Anterior</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className="h-8 w-8 sm:h-9 sm:w-9"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <span className="hidden sm:inline">Siguiente</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right panel - Cart sidebar (desktop only) */}
        <div className="hidden lg:block w-[380px] shrink-0">
          <div className="sticky top-20">
            <SaleCartSidebar
              items={cartItems}
              stockMap={stockMap}
              onUpdateQty={updateCartQty}
              onUpdatePrice={updateCartPrice}
              onRemove={removeFromCart}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              contextHint={contextHint}
              serialsEnabled={serialsEnabled}
              serialsMap={serialsMap}
              onSerialClick={handleSerialClick}
              selectedPayment={selectedPayment}
              splitPayments={splitPayments}
              onQuickPay={handleQuickPay}
              onSplitPayClick={handleSplitPayClick}
              tipoComprobante={tipoComprobante}
              onTipoComprobanteChange={setTipoComprobante}
              clientDocType={clientDocType}
            />
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 lg:hidden">
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-background/80 px-4 py-3.5 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all duration-200 active:scale-[0.98] dark:border-white/[0.06] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
            onClick={() => setMobileCartOpen(true)}
          >
            <div className="relative">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            </div>
            <span className="text-sm font-medium">Ver carrito</span>
            <span className="ml-auto rounded-xl bg-primary px-3 py-1.5 text-sm font-bold tabular-nums text-primary-foreground">
              S/. {cartTotal.toFixed(2)}
            </span>
          </button>
        </div>
      )}

      {/* Mobile cart sheet */}
      <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Carrito de venta</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <SaleCartSidebar
              items={cartItems}
              stockMap={stockMap}
              onUpdateQty={updateCartQty}
              onUpdatePrice={updateCartPrice}
              onRemove={removeFromCart}
              onSubmit={() => {
                setMobileCartOpen(false)
                handleSubmit()
              }}
              isSubmitting={isSubmitting}
              contextHint={contextHint}
              serialsEnabled={serialsEnabled}
              serialsMap={serialsMap}
              onSerialClick={handleSerialClick}
              selectedPayment={selectedPayment}
              splitPayments={splitPayments}
              onQuickPay={handleQuickPay}
              onSplitPayClick={handleSplitPayClick}
              tipoComprobante={tipoComprobante}
              onTipoComprobanteChange={setTipoComprobante}
              clientDocType={clientDocType}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Split payment dialog */}
      <SplitPaymentDialog
        open={splitDialogOpen}
        onOpenChange={setSplitDialogOpen}
        total={Number(cartTotal.toFixed(2))}
        initialPayments={splitPayments}
        onConfirm={handleSplitPayConfirm}
      />

      {/* Serials dialog */}
      <SaleSerialsDialog
        open={serialDialogOpen}
        onOpenChange={setSerialDialogOpen}
        productName={serialDialogProduct?.product.name ?? ""}
        quantity={serialDialogProduct?.quantity ?? 0}
        assignedSerials={serialDialogAssigned}
        availableSerials={serialDialogAvailable}
        otherProductSerials={serialDialogOtherSerials}
        loading={serialDialogLoading}
        onSave={handleSerialSave}
      />

      {/* Store change dialog */}
      <StoreChangeDialog
        isOpen={storeChangeDialogOpen}
        onClose={() => {
          setStoreChangeDialogOpen(false)
          setPendingStoreId(null)
        }}
        onConfirm={confirmStoreChange}
      />

      {/* Draft restoration dialog */}
      <AlertDialog open={draftPromptOpen} onOpenChange={setDraftPromptOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Venta en progreso</AlertDialogTitle>
            <AlertDialogDescription>
              Se encontro un borrador de venta guardado automaticamente.
              {pendingDraft && pendingDraft.cartItems.length > 0 && (
                <span className="mt-2 block text-sm text-muted-foreground">
                  {pendingDraft.cartItems.length} producto{pendingDraft.cartItems.length !== 1 ? "s" : ""} en el carrito
                  {" — "}
                  S/. {pendingDraft.cartItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0).toFixed(2)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              onClick={discardDraft}
            >
              Descartar
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              onClick={() => {
                if (pendingDraft) applyDraft(pendingDraft)
              }}
            >
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SubscriptionBlockedDialog
        open={subscriptionBlocked}
        onOpenChange={setSubscriptionBlocked}
        feature="transmisión SUNAT"
      />
    </div>
  )
}
