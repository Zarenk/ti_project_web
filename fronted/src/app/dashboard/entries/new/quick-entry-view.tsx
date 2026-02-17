"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Search, ShoppingCart, Loader2, ChevronsUpDown, Check, ChevronLeft, ChevronRight } from "lucide-react"
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

import { getProducts } from "../../products/products.api"
import { getProviders, createProvider } from "../../providers/providers.api"
import { getStores, createStore } from "../../stores/stores.api"
import { createEntry } from "../entries.api"

import { ContextBar } from "../components/quick-entry/context-bar"
import { ProductCard, type ProductCardItem } from "../components/quick-entry/product-card"
import { CartSidebar, type CartItem } from "../components/quick-entry/cart-sidebar"
import { ProductSerialsDialog } from "../components/quick-entry/serials-dialog"

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
  const { version, selection } = useTenantSelection()
  const [serialsEnabled, setSerialsEnabled] = useState(false)

  // --- Data loading ---
  const [products, setProducts] = useState<ProductCardItem[]>([])
  const [providers, setProviders] = useState<{ id: number; name: string }[]>([])
  const [stores, setStores] = useState<{ id: number; name: string }[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // --- Filters ---
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false)
  const [showAllCategories, setShowAllCategories] = useState(false)

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(12) // Fixed for quick entry

  // --- Context ---
  const [providerId, setProviderId] = useState<number | null>(null)
  const [storeId, setStoreId] = useState<number | null>(null)
  const [entryDate, setEntryDate] = useState<Date>(new Date())

  // --- Cart ---
  const [cartMap, setCartMap] = useState<
    Map<number, CartItem>
  >(new Map())
  const [isSubmitting, setIsSubmitting] = useState(false)

  // --- Mobile sheet ---
  const [mobileCartOpen, setMobileCartOpen] = useState(false)

  // --- Serials (optional, per-product) ---
  const [serialsMap, setSerialsMap] = useState<Map<number, string[]>>(new Map())
  const [serialDialogProductId, setSerialDialogProductId] = useState<number | null>(null)

  // Load data
  useEffect(() => {
    let cancelled = false
    async function load() {
      setDataLoading(true)
      try {
        const fetches: [Promise<any>, Promise<any>, Promise<any>, Promise<any>] = [
          getProducts(),
          getProviders(),
          getStores(),
          selection.companyId
            ? fetchCompanyVerticalInfo(selection.companyId)
            : Promise.resolve(null),
        ]
        const [prods, provs, strs, verticalInfo] = await Promise.all(fetches)
        if (cancelled) return

        // Vertical config — serial numbers
        setSerialsEnabled(
          verticalInfo?.config?.features?.serialNumbers ?? false,
        )

        setProducts(
          (prods as any[]).map((p: any) => ({
            id: typeof p.id === "string" ? parseInt(p.id, 10) : p.id,
            name: p.name,
            description: p.description || "",
            price: p.price ?? 0,
            priceSell: p.priceSell ?? 0,
            categoryId: p.categoryId ?? p.category?.id ?? null,
            category_name:
              p.category_name || p.category?.name || null,
            images: p.images,
            specification: p.specification,
            brand: p.brand,
            features: p.features ?? [],
            extraAttributes: p.extraAttributes ?? {},
          })),
        )
        setProviders(
          (provs as any[]).map((p: any) => ({ id: p.id, name: p.name })),
        )
        setStores(
          (strs as any[]).map((s: any) => ({ id: s.id, name: s.name })),
        )
      } catch (err) {
        console.error("Error loading quick entry data:", err)
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

  // --- Filter products ---
  const filteredProducts = useMemo(() => {
    let result = products
    if (selectedCategory !== null) {
      result = result.filter(
        (p) => Number(p.categoryId) === selectedCategory,
      )
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category_name || "").toLowerCase().includes(q) ||
          (typeof p.brand === "string" && p.brand.toLowerCase().includes(q)),
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

  // --- Cart operations ---
  const addToCart = useCallback((product: ProductCardItem) => {
    setCartMap((prev) => {
      const next = new Map(prev)
      const existing = next.get(product.id)
      if (existing) {
        next.set(product.id, {
          ...existing,
          quantity: existing.quantity + 1,
        })
      } else {
        next.set(product.id, {
          product,
          quantity: 1,
          unitPrice: product.price,
        })
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
  }, [])

  const updateCartQty = useCallback((productId: number, qty: number) => {
    setCartMap((prev) => {
      const next = new Map(prev)
      const item = next.get(productId)
      if (item) {
        next.set(productId, { ...item, quantity: qty })
      }
      return next
    })
  }, [])

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

  const decrementCart = useCallback((productId: number) => {
    setCartMap((prev) => {
      const next = new Map(prev)
      const item = next.get(productId)
      if (!item) return prev
      if (item.quantity <= 1) {
        next.delete(productId)
      } else {
        next.set(productId, { ...item, quantity: item.quantity - 1 })
      }
      return next
    })
  }, [])

  const cartItems = useMemo(() => Array.from(cartMap.values()), [cartMap])
  const cartTotal = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0),
    [cartItems],
  )
  const cartCount = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.quantity, 0),
    [cartItems],
  )

  // --- Serial dialog helpers ---
  const handleSerialClick = useCallback((productId: number) => {
    setSerialDialogProductId(productId)
  }, [])

  const handleSerialSave = useCallback((productId: number, serials: string[]) => {
    setSerialsMap((prev) => {
      const next = new Map(prev)
      if (serials.length > 0) {
        next.set(productId, serials)
      } else {
        next.delete(productId)
      }
      return next
    })
  }, [])

  // Get all serials from OTHER products (for cross-product duplicate check)
  const getOtherSerials = useCallback(
    (excludeProductId: number): string[] => {
      const result: string[] = []
      serialsMap.forEach((serials, pid) => {
        if (pid !== excludeProductId) result.push(...serials)
      })
      return result
    },
    [serialsMap],
  )

  // Clean up serials when product is removed from cart
  const removeFromCartWithSerials = useCallback((productId: number) => {
    removeFromCart(productId)
    setSerialsMap((prev) => {
      const next = new Map(prev)
      next.delete(productId)
      return next
    })
  }, [removeFromCart])

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
      router.push("/dashboard/entries")
      router.refresh()
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
      setProviders((prev) => [...prev, newOption])
      setProviderId(newOption.id)
      toast.success(`Proveedor "${newOption.name}" creado`)
      return newOption
    },
    [],
  )

  const handleCreateStore = useCallback(
    async (data: { name: string; ruc: string }) => {
      const result = await createStore(data)
      const newOption = { id: result.id, name: result.name }
      setStores((prev) => [...prev, newOption])
      setStoreId(newOption.id)
      toast.success(`Almacen "${newOption.name}" creado`)
      return newOption
    },
    [],
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

      {/* Mobile bottom bar */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-3 shadow-lg lg:hidden">
          <Button
            className="w-full cursor-pointer gap-2"
            onClick={() => setMobileCartOpen(true)}
          >
            <ShoppingCart className="h-4 w-4" />
            Ver carrito
            <Badge variant="secondary" className="ml-1">
              {cartCount}
            </Badge>
            <span className="ml-auto font-semibold tabular-nums">
              S/. {cartTotal.toFixed(2)}
            </span>
          </Button>
        </div>
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
              if (!open) setSerialDialogProductId(null)
            }}
            productName={item.product.name}
            quantity={item.quantity}
            existingSerials={serialsMap.get(serialDialogProductId) ?? []}
            allOtherSerials={getOtherSerials(serialDialogProductId)}
            onSave={(serials) => {
              handleSerialSave(serialDialogProductId, serials)
              setSerialDialogProductId(null)
            }}
          />
        )
      })()}
    </div>
  )
}
