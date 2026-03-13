"use client"

// Stable empty array to prevent unstable references in useMemo dependencies.
const STABLE_EMPTY: any[] = []

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Search, ShoppingCart, Loader2, ChevronsUpDown, Check, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react"
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
import { cn, normalizeSearch } from "@/lib/utils"
import { useHelpAssistant } from "@/context/help-assistant-context"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { getAuthToken } from "@/utils/auth-token"
import { fetchCompanyVerticalInfo } from "../../tenancy/tenancy.api"

import { getProducts } from "../../products/products.api"
import { getProviders, createProvider } from "../../providers/providers.api"
import { getStores, createStore } from "../../stores/stores.api"
import { createEntry } from "../entries.api"

import { ContextBar } from "../components/quick-entry/context-bar"
import { ProductCard, type ProductCardItem } from "../components/quick-entry/product-card"
import { CartSidebar } from "../components/quick-entry/cart-sidebar"
import { ProductSerialsDialog } from "../components/quick-entry/serials-dialog"
import { useEntryCart } from "./use-entry-cart"

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

type QuickEntryViewProps = {
  categories: { id: number; name: string }[]
}

export function QuickEntryView({ categories }: QuickEntryViewProps) {
  const router = useRouter()
  const { selection } = useTenantSelection()
  const queryClient = useQueryClient()
  const invalidateEntries = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.entries.root(selection.orgId, selection.companyId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.inventory.root(selection.orgId, selection.companyId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.products.root(selection.orgId, selection.companyId) })
  }

  // --- Data loading via useQuery ---
  const { data: productsRaw = STABLE_EMPTY, isLoading: productsLoading } = useQuery({
    queryKey: queryKeys.products.list(selection.orgId, selection.companyId),
    queryFn: () => getProducts(),
    enabled: selection.orgId !== null,
  })
  const products: ProductCardItem[] = useMemo(
    () =>
      (productsRaw as any[]).map((p: any) => ({
        id: typeof p.id === "string" ? parseInt(p.id, 10) : p.id,
        name: p.name,
        description: p.description || "",
        price: p.price ?? 0,
        priceSell: p.priceSell ?? 0,
        categoryId: p.categoryId ?? p.category?.id ?? null,
        category_name: p.category_name || p.category?.name || null,
        images: p.images,
        specification: p.specification,
        brand: p.brand,
        features: p.features ?? [],
        extraAttributes: p.extraAttributes ?? {},
      })),
    [productsRaw],
  )

  const { data: providersRaw = STABLE_EMPTY, isLoading: providersLoading } = useQuery({
    queryKey: queryKeys.providers.list(selection.orgId, selection.companyId),
    queryFn: () => getProviders(),
    enabled: selection.orgId !== null,
  })
  const providers = useMemo(
    () => (providersRaw as any[]).map((p: any) => ({ id: p.id, name: p.name })),
    [providersRaw],
  )

  const { data: storesRaw = STABLE_EMPTY, isLoading: storesLoading } = useQuery({
    queryKey: queryKeys.stores.list(selection.orgId, selection.companyId),
    queryFn: () => getStores(),
    enabled: selection.orgId !== null,
  })
  const stores = useMemo(
    () => (storesRaw as any[]).map((s: any) => ({ id: s.id, name: s.name })),
    [storesRaw],
  )

  const { data: verticalInfo } = useQuery({
    queryKey: queryKeys.vertical.config(selection.orgId, selection.companyId),
    queryFn: () => fetchCompanyVerticalInfo(selection.companyId!),
    enabled: selection.companyId !== null,
  })
  const serialsEnabled = verticalInfo?.config?.features?.serialNumbers ?? false

  const dataLoading = productsLoading || providersLoading || storesLoading

  // --- Filters ---
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false)
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [hideCategoryPills, setHideCategoryPills] = useState(false)

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12) // Fixed for quick entry

  // --- Context ---
  const [providerId, setProviderId] = useState<number | null>(null)
  const [storeId, setStoreId] = useState<number | null>(null)
  const [entryDate, setEntryDate] = useState<Date>(new Date())

  // --- Cart (extracted hook) ---
  const {
    cartMap,
    cartItems,
    cartTotal,
    cartCount,
    addToCart,
    removeFromCart,
    updateCartQty,
    updateCartPrice,
    decrementCart,
    removeFromCartWithSerials,
    serialsMap,
    serialDialogProductId,
    handleSerialClick,
    handleSerialSave,
    getOtherSerials,
    closeSerialDialog,
  } = useEntryCart()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // --- Mobile sheet ---
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [mobileCartBarHidden, setMobileCartBarHidden] = useState(false)
  const [cartBarDragX, setCartBarDragX] = useState(0)
  const cartBarTouchStartRef = useRef<{ x: number; y: number; locked: boolean } | null>(null)
  const cartBarRef = useRef<HTMLButtonElement | null>(null)
  const { isMascotMinimized } = useHelpAssistant()

  // Data is loaded via useQuery hooks above

  // --- Filter products ---
  const filteredProducts = useMemo(() => {
    let result = products
    if (selectedCategory !== null) {
      result = result.filter(
        (p) => Number(p.categoryId) === selectedCategory,
      )
    }
    if (searchQuery.trim()) {
      const q = normalizeSearch(searchQuery.trim())
      result = result.filter(
        (p) =>
          normalizeSearch(p.name).includes(q) ||
          normalizeSearch(p.category_name || "").includes(q) ||
          (typeof p.brand === "string" && normalizeSearch(p.brand).includes(q)),
      )
    }
    return result
  }, [products, searchQuery, selectedCategory])

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

  const selectedCategoryName = usedCategories.find(
    (c) => c.id === selectedCategory,
  )?.name

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

  // --- Submit ---
  const handleSubmit = async () => {
    if (!providerId) {
      toast.error("Selecciona un proveedor")
      return
    }
    if (!storeId) {
      toast.error("Selecciona un almacen")
      return
    }
    if (cartItems.length === 0) {
      toast.error("Agrega al menos un producto")
      return
    }

    const userId = await getUserIdFromToken()
    if (!userId) {
      toast.error("No se pudo obtener el usuario. Inicia sesion nuevamente.")
      return
    }

    setIsSubmitting(true)
    try {
      const details = cartItems.map((item) => {
        const serials = serialsMap.get(item.product.id)
        return {
          productId: item.product.id,
          quantity: item.quantity,
          price: item.unitPrice,
          priceInSoles: item.unitPrice,
          ...(serials && serials.length > 0 ? { series: serials } : {}),
        }
      })

      await createEntry({
        storeId: storeId!,
        userId,
        providerId: providerId!,
        date: entryDate,
        details,
      })

      toast.success("Ingreso creado exitosamente")
      invalidateEntries()
      router.push("/dashboard/entries")
    } catch (err: any) {
      const message = err?.message || "Error al crear el ingreso"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Inline create provider/store ---
  const handleCreateProvider = useCallback(
    async (data: { name: string; document: string; documentNumber: string }) => {
      const result = await createProvider(data)
      const newOption = { id: result.id, name: result.name }
      setProviderId(newOption.id)
      toast.success(`Proveedor "${newOption.name}" creado`)
      queryClient.invalidateQueries({ queryKey: queryKeys.providers.root(selection.orgId, selection.companyId) })
      return newOption
    },
    [queryClient, selection.orgId, selection.companyId],
  )

  const handleCreateStore = useCallback(
    async (data: { name: string; ruc: string }) => {
      const result = await createStore(data)
      const newOption = { id: result.id, name: result.name }
      setStoreId(newOption.id)
      toast.success(`Almacen "${newOption.name}" creado`)
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.root(selection.orgId, selection.companyId) })
      return newOption
    },
    [queryClient, selection.orgId, selection.companyId],
  )

  const contextHint = useMemo(() => {
    const missing: string[] = []
    if (!providerId) missing.push("proveedor")
    if (!storeId) missing.push("almacen")
    if (missing.length === 0) return undefined
    return `Selecciona ${missing.join(" y ")} para continuar`
  }, [providerId, storeId])

  // --- Loading state ---
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
      <ContextBar
        providers={providers}
        stores={stores}
        providerId={providerId}
        storeId={storeId}
        entryDate={entryDate}
        onProviderChange={setProviderId}
        onStoreChange={setStoreId}
        onDateChange={setEntryDate}
        onCreateProvider={handleCreateProvider}
        onCreateStore={handleCreateStore}
      />

      {/* Main split layout */}
      <div className="flex gap-4">
        {/* Left panel - Product grid */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Search + category filters */}
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Category combobox filter */}
              {usedCategories.length > 1 && (
                <Popover
                  open={categoryFilterOpen}
                  onOpenChange={setCategoryFilterOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full cursor-pointer justify-between sm:w-[200px]"
                    >
                      <span className="truncate">
                        {selectedCategoryName || "Todas las categorias"}
                      </span>
                      <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0"
                    style={{ width: "var(--radix-popover-trigger-width)", minWidth: "180px" }}
                  >
                    <Command>
                      <CommandInput placeholder="Buscar categoria..." />
                      <CommandList>
                        <CommandEmpty>Sin categorias.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__todas__"
                            className="cursor-pointer"
                            onSelect={() => {
                              setSelectedCategory(null)
                              setCategoryFilterOpen(false)
                            }}
                          >
                            Todas las categorias
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
                                  selectedCategory === cat.id ? null : cat.id,
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
              <div className="space-y-1.5">
                {/* Mobile toggle */}
                {hideCategoryPills && (
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:hidden cursor-pointer"
                    onClick={() => setHideCategoryPills(false)}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                    Mostrar categorías
                  </button>
                )}
                {!hideCategoryPills && (
                  <div className="flex flex-wrap items-center gap-1.5">
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
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground sm:hidden cursor-pointer"
                      onClick={() => setHideCategoryPills(true)}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                      Ocultar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Products count and pagination info */}
          {filteredProducts.length > 0 && (
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
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <p className="text-sm text-muted-foreground">
                {searchQuery || selectedCategory !== null
                  ? "No se encontraron productos con ese filtro."
                  : "No hay productos disponibles."}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {paginatedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    cartQuantity={cartMap.get(product.id)?.quantity ?? 0}
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
            <CartSidebar
              items={cartItems}
              onUpdateQty={updateCartQty}
              onUpdatePrice={updateCartPrice}
              onRemove={removeFromCartWithSerials}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              contextHint={contextHint}
              serialsEnabled={serialsEnabled}
              serialsMap={serialsMap}
              onSerialClick={handleSerialClick}
            />
          </div>
        </div>
      </div>

      {/* Mobile bottom bar — swipeable to hide */}
      {cartCount > 0 && !mobileCartBarHidden && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 lg:hidden animate-in slide-in-from-bottom-4 fade-in duration-300"
        >
          <button
            ref={cartBarRef}
            type="button"
            className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-background/80 px-4 py-3.5 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/[0.06] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
            style={{
              transform: cartBarDragX !== 0
                ? `translateX(${cartBarDragX}px) rotate(${cartBarDragX * 0.05}deg)`
                : undefined,
              opacity: cartBarDragX !== 0
                ? Math.max(0.3, 1 - Math.abs(cartBarDragX) / 250)
                : undefined,
              transition: cartBarDragX !== 0 ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease-out',
            }}
            onClick={() => {
              if (Math.abs(cartBarDragX) < 5) setMobileCartOpen(true)
            }}
            onTouchStart={(e) => {
              const touch = e.touches[0]
              cartBarTouchStartRef.current = { x: touch.clientX, y: touch.clientY, locked: false }
            }}
            onTouchMove={(e) => {
              if (!cartBarTouchStartRef.current) return
              const touch = e.touches[0]
              const dx = touch.clientX - cartBarTouchStartRef.current.x
              const dy = Math.abs(touch.clientY - cartBarTouchStartRef.current.y)
              // Lock direction after 10px movement
              if (!cartBarTouchStartRef.current.locked && (Math.abs(dx) > 10 || dy > 10)) {
                cartBarTouchStartRef.current.locked = true
                if (dy > Math.abs(dx)) {
                  // Vertical scroll — abort drag
                  cartBarTouchStartRef.current = null
                  setCartBarDragX(0)
                  return
                }
              }
              if (cartBarTouchStartRef.current?.locked) {
                setCartBarDragX(dx)
              }
            }}
            onTouchEnd={(e) => {
              if (!cartBarTouchStartRef.current) {
                setCartBarDragX(0)
                return
              }
              const wasDragging = cartBarTouchStartRef.current.locked
              cartBarTouchStartRef.current = null
              if (Math.abs(cartBarDragX) > 80) {
                // Swipe confirmed — animate out
                setCartBarDragX(cartBarDragX > 0 ? 400 : -400)
                setTimeout(() => {
                  setMobileCartBarHidden(true)
                  setCartBarDragX(0)
                }, 200)
              } else {
                // Snap back
                setCartBarDragX(0)
              }
              if (wasDragging) e.preventDefault()
            }}
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

      {/* Mobile FAB — appears when cart bar is swiped away */}
      {cartCount > 0 && mobileCartBarHidden && (
        <button
          type="button"
          className="fixed bottom-6 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-white/10 transition-all duration-300 ease-out hover:scale-[1.08] active:scale-90 lg:hidden animate-in zoom-in-50 fade-in spin-in-12"
          style={{ right: isMascotMinimized ? 36 : 96 }}
          onClick={() => {
            setMobileCartBarHidden(false)
          }}
          aria-label={`Mostrar carrito (${cartCount} items)`}
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
            {cartCount}
          </span>
          {/* Pulse ring — plays 3 times */}
          <span className="absolute inset-0 rounded-full bg-primary/25" style={{ animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) 3' }} />
        </button>
      )}

      {/* Mobile cart sheet */}
      <Sheet open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Carrito de ingreso</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <CartSidebar
              items={cartItems}
              onUpdateQty={updateCartQty}
              onUpdatePrice={updateCartPrice}
              onRemove={removeFromCartWithSerials}
              onSubmit={() => {
                setMobileCartOpen(false)
                handleSubmit()
              }}
              isSubmitting={isSubmitting}
              contextHint={contextHint}
              serialsEnabled={serialsEnabled}
              serialsMap={serialsMap}
              onSerialClick={handleSerialClick}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Per-product serial dialog */}
      {serialsEnabled && serialDialogProductId !== null && (() => {
        const item = cartMap.get(serialDialogProductId)
        if (!item) return null
        return (
          <ProductSerialsDialog
            open
            onOpenChange={(open) => {
              if (!open) closeSerialDialog()
            }}
            productName={item.product.name}
            quantity={item.quantity}
            existingSerials={serialsMap.get(serialDialogProductId) ?? []}
            allOtherSerials={getOtherSerials(serialDialogProductId)}
            onSave={(serials) => {
              handleSerialSave(serialDialogProductId, serials)
              closeSerialDialog()
            }}
          />
        )
      })()}
    </div>
  )
}
