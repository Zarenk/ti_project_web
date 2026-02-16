"use client"

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
import { cn } from "@/lib/utils"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { getAuthToken } from "@/utils/auth-token"
import { fetchCompanyVerticalInfo } from "../../tenancy/tenancy.api"

import { getStores } from "../../stores/stores.api"
import { getRegisteredClients } from "../../clients/clients.api"
import {
  createSale,
  getProductsByStore,
  fetchSeriesByProductAndStore,
  getPaymentMethods,
} from "../sales.api"

import { SaleContextBar } from "../components/quick-sale/sale-context-bar"
import {
  SaleProductCard,
  type SaleProductCardItem,
} from "../components/quick-sale/sale-product-card"
import {
  SaleCartSidebar,
  type SaleCartItem,
} from "../components/quick-sale/sale-cart-sidebar"
import { SaleSerialsDialog } from "../components/quick-sale/sale-serials-dialog"
import { SplitPaymentDialog } from "../components/quick-sale/sale-split-payment-dialog"
import { StoreChangeDialog } from "../components/StoreChangeDialog"

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

type QuickSaleViewProps = {
  categories: { id: number; name: string }[]
}

export function QuickSaleView({ categories }: QuickSaleViewProps) {
  const router = useRouter()
  const { version, selection } = useTenantSelection()
  const [serialsEnabled, setSerialsEnabled] = useState(false)

  // --- Data loading ---
  const [stores, setStores] = useState<{ id: number; name: string }[]>([])
  const [clients, setClients] = useState<
    { id: number; name: string; type: string; typeNumber: string }[]
  >([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>(
    DEFAULT_PAYMENT_METHODS,
  )
  const [dataLoading, setDataLoading] = useState(true)
  const [products, setProducts] = useState<SaleProductCardItem[]>([])
  const [productsLoading, setProductsLoading] = useState(false)

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

  // --- Cart ---
  const [cartMap, setCartMap] = useState<Map<number, SaleCartItem>>(new Map())
  const [isSubmitting, setIsSubmitting] = useState(false)

  // --- Stock tracking ---
  const [stockMap, setStockMap] = useState<Map<number, number>>(new Map())

  // --- Serials (auto-assigned) ---
  const [serialsMap, setSerialsMap] = useState<Map<number, string[]>>(
    new Map(),
  )
  const [availableSeriesMap, setAvailableSeriesMap] = useState<
    Map<number, string[]>
  >(new Map())

  // --- Payments ---
  const [selectedPayment, setSelectedPayment] = useState<{
    paymentMethodId: number
    amount: number
    currency: string
  } | null>(null)
  const [splitPayments, setSplitPayments] = useState<
    { paymentMethodId: number; amount: number; currency: string }[]
  >([])

  const [splitDialogOpen, setSplitDialogOpen] = useState(false)

  // --- Comprobante ---
  const [tipoComprobante, setTipoComprobante] = useState("SIN COMPROBANTE")

  // --- Store change ---
  const [pendingStoreId, setPendingStoreId] = useState<number | null>(null)
  const [storeChangeDialogOpen, setStoreChangeDialogOpen] = useState(false)

  // --- Mobile ---
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  // --- Serial dialog ---
  const [serialDialogOpen, setSerialDialogOpen] = useState(false)
  const [serialDialogProductId, setSerialDialogProductId] = useState<
    number | null
  >(null)
  const [serialDialogLoading, setSerialDialogLoading] = useState(false)

  // --- Idempotency ---
  const saleReferenceIdRef = useRef<string | null>(null)

  // ──────────────────────────────────────────────
  // Initial data load
  // ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    async function load() {
      setDataLoading(true)
      try {
        const [strs, clts, pmethods, verticalInfo] = await Promise.all([
          getStores(),
          getRegisteredClients(),
          getPaymentMethods().catch(() => []),
          selection.companyId
            ? fetchCompanyVerticalInfo(selection.companyId)
            : Promise.resolve(null),
        ])
        if (cancelled) return

        setSerialsEnabled(
          verticalInfo?.config?.features?.serialNumbers ?? false,
        )
        setStores(
          (strs as any[]).map((s: any) => ({ id: s.id, name: s.name })),
        )
        setClients(Array.isArray(clts) ? clts : [])

        const combined = [
          ...DEFAULT_PAYMENT_METHODS,
          ...((pmethods as any[]) ?? []),
        ]
        const unique = Array.from(
          new Map(combined.map((m) => [m.name, m])).values(),
        )
        setPaymentMethods(unique)
      } catch {
        toast.error("Error al cargar datos")
      } finally {
        if (!cancelled) setDataLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [version, selection.companyId])

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
  }, [storeId, version])

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
    setCartMap(new Map())
    setSerialsMap(new Map())
    setAvailableSeriesMap(new Map())
    setSelectedPayment(null)
    setSplitPayments([])
    setStoreId(pendingStoreId)
    setPendingStoreId(null)
    setStoreChangeDialogOpen(false)
  }, [pendingStoreId])

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
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category_name && p.category_name.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)),
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
  // Cart operations
  // ──────────────────────────────────────────────
  const cartItems = useMemo(() => Array.from(cartMap.values()), [cartMap])
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    [cartItems],
  )
  const cartCount = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.quantity, 0),
    [cartItems],
  )

  // Auto-assign series
  const autoAssignSeries = useCallback(
    async (productId: number, qty: number) => {
      if (!storeId || !serialsEnabled) return

      let available = availableSeriesMap.get(productId)
      if (!available) {
        try {
          available = await fetchSeriesByProductAndStore(storeId, productId)
          setAvailableSeriesMap((prev) => {
            const next = new Map(prev)
            next.set(productId, available!)
            return next
          })
        } catch {
          return
        }
      }

      if (!available || available.length === 0) return

      const usedByOthers = new Set<string>()
      serialsMap.forEach((serials, pid) => {
        if (pid !== productId) serials.forEach((s) => usedByOthers.add(s))
      })

      const assignable = available.filter((s) => !usedByOthers.has(s))
      const assigned = assignable.slice(0, qty)

      setSerialsMap((prev) => {
        const next = new Map(prev)
        if (assigned.length > 0) {
          next.set(productId, assigned)
        } else {
          next.delete(productId)
        }
        return next
      })
    },
    [storeId, serialsEnabled, availableSeriesMap, serialsMap],
  )

  const addToCart = useCallback(
    (product: SaleProductCardItem) => {
      const currentStock = stockMap.get(product.id) ?? 0
      const currentQty = cartMap.get(product.id)?.quantity ?? 0

      if (currentQty >= currentStock) {
        toast.error(
          `Stock insuficiente para ${product.name} (disponible: ${currentStock})`,
        )
        return
      }

      // Validate product has valid price before adding to cart
      if (!product.priceSell || product.priceSell <= 0 || !Number.isFinite(product.priceSell)) {
        toast.error(
          `El producto "${product.name}" no tiene un precio de venta valido. Por favor, actualiza el precio del producto antes de agregarlo al carrito.`,
        )
        return
      }

      const newQty = currentQty + 1

      setCartMap((prev) => {
        const next = new Map(prev)
        const existing = next.get(product.id)
        if (existing) {
          next.set(product.id, { ...existing, quantity: newQty })
        } else {
          next.set(product.id, {
            product,
            quantity: 1,
            unitPrice: product.priceSell,
          })
        }
        return next
      })

      // Auto-assign series
      void autoAssignSeries(product.id, newQty)

      // Auto-sync payment if quick pay is active
      syncQuickPayment(newQty, product)
    },
    [stockMap, cartMap, autoAssignSeries],
  )

  const decrementCart = useCallback(
    (productId: number) => {
      setCartMap((prev) => {
        const next = new Map(prev)
        const item = next.get(productId)
        if (!item) return prev
        if (item.quantity <= 1) {
          next.delete(productId)
          setSerialsMap((s) => {
            const ns = new Map(s)
            ns.delete(productId)
            return ns
          })
        } else {
          const newQty = item.quantity - 1
          next.set(productId, { ...item, quantity: newQty })
          void autoAssignSeries(productId, newQty)
        }
        return next
      })
    },
    [autoAssignSeries],
  )

  const updateCartQty = useCallback(
    (productId: number, qty: number) => {
      const maxStock = stockMap.get(productId) ?? 0
      const clampedQty = Math.min(Math.max(1, qty), maxStock)
      setCartMap((prev) => {
        const next = new Map(prev)
        const item = next.get(productId)
        if (item) {
          next.set(productId, { ...item, quantity: clampedQty })
        }
        return next
      })
      void autoAssignSeries(productId, clampedQty)
    },
    [stockMap, autoAssignSeries],
  )

  const updateCartPrice = useCallback((productId: number, price: number) => {
    setCartMap((prev) => {
      const next = new Map(prev)
      const item = next.get(productId)
      if (item) {
        next.set(productId, { ...item, unitPrice: price })
      }
      return next
    })
  }, [])

  const removeFromCart = useCallback((productId: number) => {
    setCartMap((prev) => {
      const next = new Map(prev)
      next.delete(productId)
      return next
    })
    setSerialsMap((prev) => {
      const next = new Map(prev)
      next.delete(productId)
      return next
    })
  }, [])

  // ──────────────────────────────────────────────
  // Serial dialog
  // ──────────────────────────────────────────────
  const handleSerialClick = useCallback(
    async (productId: number) => {
      setSerialDialogProductId(productId)
      setSerialDialogOpen(true)

      // Ensure available series are fetched for this product
      if (!availableSeriesMap.has(productId) && storeId) {
        setSerialDialogLoading(true)
        try {
          const available = await fetchSeriesByProductAndStore(
            storeId,
            productId,
          )
          setAvailableSeriesMap((prev) => {
            const next = new Map(prev)
            next.set(productId, available)
            return next
          })
        } catch {
          // Keep empty
        } finally {
          setSerialDialogLoading(false)
        }
      }
    },
    [storeId, availableSeriesMap],
  )

  const handleSerialSave = useCallback(
    (serials: string[]) => {
      if (serialDialogProductId === null) return
      setSerialsMap((prev) => {
        const next = new Map(prev)
        if (serials.length > 0) {
          next.set(serialDialogProductId, serials)
        } else {
          next.delete(serialDialogProductId)
        }
        return next
      })
    },
    [serialDialogProductId],
  )

  // Computed data for serials dialog
  const serialDialogProduct = serialDialogProductId !== null
    ? cartItems.find((i) => i.product.id === serialDialogProductId)
    : null
  const serialDialogAssigned =
    serialDialogProductId !== null
      ? serialsMap.get(serialDialogProductId) ?? []
      : []
  const serialDialogAvailable =
    serialDialogProductId !== null
      ? availableSeriesMap.get(serialDialogProductId) ?? []
      : []
  const serialDialogOtherSerials = useMemo(() => {
    const others: string[] = []
    serialsMap.forEach((serials, pid) => {
      if (pid !== serialDialogProductId) others.push(...serials)
    })
    return others
  }, [serialsMap, serialDialogProductId])

  // ──────────────────────────────────────────────
  // Payment
  // ──────────────────────────────────────────────

  // Sync quick payment amount when cart changes
  const syncQuickPayment = useCallback(
    (_newQty?: number, _product?: SaleProductCardItem) => {
      // Will be synced via effect
    },
    [],
  )

  // Auto-sync quick payment with cart total
  useEffect(() => {
    if (selectedPayment && splitPayments.length === 0) {
      const newTotal = Number(cartTotal.toFixed(2))
      if (
        newTotal > 0 &&
        Math.abs(selectedPayment.amount - newTotal) > 0.001
      ) {
        setSelectedPayment((prev) =>
          prev ? { ...prev, amount: newTotal } : null,
        )
      }
    }
  }, [cartTotal, selectedPayment, splitPayments.length])

  const handleQuickPay = useCallback(
    (methodId: number) => {
      const total = Number(cartTotal.toFixed(2))
      if (total <= 0) {
        toast.error("Agrega productos al carrito primero")
        return
      }
      setSelectedPayment({
        paymentMethodId: methodId,
        amount: total,
        currency: "PEN",
      })
      setSplitPayments([])
    },
    [cartTotal],
  )

  const handleSplitPayClick = useCallback(() => {
    const total = Number(cartTotal.toFixed(2))
    if (total <= 0) {
      toast.error("Agrega productos al carrito primero")
      return
    }
    setSplitDialogOpen(true)
  }, [cartTotal])

  const handleSplitPayConfirm = useCallback(
    (payments: { paymentMethodId: number; amount: number; currency: string }[]) => {
      setSplitPayments(payments)
      setSelectedPayment(null)
    },
    [],
  )

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

      await createSale({
        userId,
        storeId: storeId!,
        ...(clientId != null ? { clientId } : {}),
        total,
        details,
        tipoMoneda: "PEN",
        payments: paymentsPayload,
        source: "POS",
        referenceId: saleReferenceIdRef.current,
        ...(tipoComprobante !== "SIN COMPROBANTE"
          ? { tipoComprobante }
          : {}),
      })

      toast.success("Venta registrada exitosamente")
      saleReferenceIdRef.current = null
      router.push("/dashboard/sales")
      router.refresh()
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
                      className="w-[180px] cursor-pointer justify-between"
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
                  <PopoverContent className="w-[200px] p-0">
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
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
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
                          className="h-9 w-9"
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
                    Siguiente
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
            />
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-3 shadow-lg lg:hidden">
          <Button
            className="w-full cursor-pointer gap-2"
            onClick={() => setMobileCartOpen(true)}
          >
            <ShoppingCart className="h-4 w-4" />
            Ver carrito
            <Badge variant="secondary" className="ml-auto">
              {cartCount}
            </Badge>
            <span className="tabular-nums font-semibold">
              S/. {cartTotal.toFixed(2)}
            </span>
          </Button>
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
    </div>
  )
}
