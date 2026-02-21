"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { UtensilsCrossed, ShoppingBag, Truck, Plus, Minus, Search, ImageOff, AlertCircle } from "lucide-react";
import { resolveImageUrl } from "@/lib/images";
import { useVerticalConfig } from "@/hooks/use-vertical-config";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { getStores } from "@/app/dashboard/stores/stores.api";
import { getClients } from "@/app/dashboard/clients/clients.api";
import { getCategories } from "@/app/dashboard/categories/categories.api";
import { getStockByProductAndStore } from "@/app/dashboard/sales/sales.api";
import { getAllProductsByStore } from "@/app/dashboard/inventory/inventory.api";
import { getProducts } from "@/app/dashboard/products/products.api";
import { createRestaurantOrder } from "@/app/dashboard/orders/orders.api";
import { getRestaurantTables, type RestaurantTable } from "@/app/dashboard/tables/tables.api";
import ClientCombobox from "@/app/dashboard/orders/new/ClientCombobox";
import { useKitchenSocket } from "@/hooks/use-kitchen-socket";
import { DEFAULT_STORE_ID } from "@/lib/config";
import { PageGuideButton } from "@/components/page-guide-dialog";
import { RESTAURANT_ORDER_FORM_GUIDE_STEPS } from "./restaurant-order-form-guide-steps";

 type ProductOption = {
  id: number;
  name: string;
  price: number;
  stock?: number | null;
  categoryId?: number | null;
  categoryName?: string | null;
  searchKey?: string;
  image?: string | null;
  isDish?: boolean;
};

 type OrderItem = {
  productId: number;
  name: string;
  quantity: number;
  price: number;
};

export default function NewRestaurantOrderPage() {
  const router = useRouter();
  const { version } = useTenantSelection();
  const { info: verticalInfo } = useVerticalConfig();
  const isRestaurant = verticalInfo?.businessVertical === "RESTAURANTS";

  const [storeId, setStoreId] = useState<number>(DEFAULT_STORE_ID);
  const [stores, setStores] = useState<{ id: number; name: string }[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>(0);

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY" | "DELIVERY">("DINE_IN");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);

  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedClientLabel, setSelectedClientLabel] = useState<string>("Público en general");

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedStock, setSelectedStock] = useState<number | null>(null);
  const [orderNotes, setOrderNotes] = useState("");
  const [menuSearch, setMenuSearch] = useState("");

  const handleClientPick = useCallback((client: any | null) => {
    if (!client) {
      setSelectedClientId(null);
      setSelectedClientLabel("Público en general");
      return;
    }
    setSelectedClientId(client.id);
    setSelectedClientLabel(client.name ?? "");
  }, []);

  const clientsWithKey = useMemo(() => {
    return (clients || []).map((c: any) => {
      const key = `${c?.name ?? ""} ${c?.typeNumber ?? ""} ${c?.dni ?? ""} ${c?.ruc ?? ""} ${c?.email ?? ""} ${c?.phone ?? ""}`
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");
      return { ...c, searchKey: c.searchKey ?? key };
    });
  }, [clients]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory > 0) {
      list = list.filter((p) => p.categoryId === selectedCategory);
    }
    if (menuSearch.trim()) {
      const q = menuSearch.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
      list = list.filter((p) => (p.searchKey ?? p.name.toLowerCase()).includes(q));
    }
    return list;
  }, [products, selectedCategory, menuSearch]);

  const selectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return products.find((p) => p.id === selectedProductId) ?? null;
  }, [products, selectedProductId]);

  const remainingStock = useMemo(() => {
    if (!selectedProduct) return null;
    if (selectedProduct.isDish) return null;
    if (selectedStock == null) return null;
    return Math.max(selectedStock - quantity, 0);
  }, [selectedProduct, selectedStock, quantity]);

  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => acc + item.quantity * item.price, 0);
  }, [items]);
  const total = subtotal;

  useEffect(() => {
    let active = true;
    const loadStores = async () => {
      try {
        const data = await getStores();
        const list = Array.isArray(data) ? data.map((s: any) => ({ id: s.id, name: s.name })) : [];
        if (!active) return;
        setStores(list);
        if (!list.find((s) => s.id === storeId) && list.length > 0) {
          setStoreId(list[0].id);
        }
      } catch (err) {
        console.error("Error loading stores", err);
      } finally {
        if (active) setStoresLoading(false);
      }
    };
    loadStores();
    return () => {
      active = false;
    };
  }, [version]);

  const loadTables = useCallback(async () => {
    if (!isRestaurant) {
      setTables([]);
      setTablesLoading(false);
      return;
    }
    setTablesLoading(true);
    try {
      const data = await getRestaurantTables();
      const list = Array.isArray(data) ? data : [];
      setTables(list);
      // Auto-select first available table (skip occupied)
      if (orderType === "DINE_IN" && list.length > 0) {
        setSelectedTableId((prev) => {
          if (prev !== null) {
            // If current selection became occupied, clear it
            const current = list.find((t) => t.id === prev);
            if (current && (current.status === "OCCUPIED" || current.currentOrderId)) {
              const firstAvailable = list.find((t) => t.status === "AVAILABLE");
              return firstAvailable?.id ?? null;
            }
            return prev;
          }
          const firstAvailable = list.find((t) => t.status === "AVAILABLE");
          return firstAvailable?.id ?? null;
        });
      }
    } catch (err) {
      console.error("Error loading tables", err);
      setTables([]);
    } finally {
      setTablesLoading(false);
    }
  }, [isRestaurant, orderType]);

  useEffect(() => {
    loadTables();
  }, [loadTables, version]);

  // Real-time table updates via WebSocket
  useKitchenSocket({
    enabled: isRestaurant,
    onTableUpdate: useCallback(() => {
      void loadTables();
    }, [loadTables]),
    onOrderUpdate: useCallback(() => {
      void loadTables();
    }, [loadTables]),
  });

  useEffect(() => {
    let active = true;
    const loadClients = async () => {
      try {
        const data = await getClients();
        if (!active) return;
        setClients(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading clients", err);
      } finally {
        if (active) setClientsLoading(false);
      }
    };
    loadClients();
    return () => {
      active = false;
    };
  }, [version]);

  useEffect(() => {
    let active = true;
    const loadCategories = async () => {
      try {
        const data = await getCategories();
        if (!active) return;
        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading categories", err);
      }
    };
    loadCategories();
    return () => {
      active = false;
    };
  }, [version]);

  useEffect(() => {
    let active = true;
    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        // Fetch all products (no inventory filter) + inventory data for stock
        const [allProducts, inventoryData] = await Promise.all([
          getProducts(),
          getAllProductsByStore(Number(storeId)).catch(() => []),
        ]);
        if (!active) return;

        // Build stock map from inventory data: productId → stock
        const stockMap = new Map<number, number>();
        const invRaw = Array.isArray(inventoryData) ? inventoryData : [];
        for (const item of invRaw) {
          const pid = item?.inventory?.product?.id;
          if (pid && typeof item?.stock === "number") {
            stockMap.set(pid, item.stock);
          }
        }

        const raw = Array.isArray(allProducts) ? allProducts : [];
        const list: ProductOption[] = raw
          .map((product: any) => {
            if (!product?.id || !product?.name) return null;
            const extra = product.extraAttributes as Record<string, any> | null | undefined;
            const hasIngredients = Array.isArray(extra?.ingredients) && extra.ingredients.length > 0;
            const stockVal = stockMap.get(product.id);
            return {
              id: product.id,
              name: product.name,
              price: Number(product.priceSell ?? product.price ?? 0),
              stock: typeof stockVal === "number" ? stockVal : null,
              categoryId: product.categoryId ?? product.category?.id ?? null,
              categoryName: product.category?.name ?? null,
              image: product.image ?? (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null),
              isDish: hasIngredients,
              searchKey: `${product.name ?? ""} ${product.category?.name ?? ""}`
                .toLowerCase()
                .normalize("NFD")
                .replace(/\p{Diacritic}/gu, ""),
            };
          })
          .filter(Boolean) as ProductOption[];
        setProducts(list);
      } catch (err) {
        console.error("Error loading products", err);
        if (active) setProducts([]);
      } finally {
        if (active) setProductsLoading(false);
      }
    };
    if (storeId) loadProducts();
    return () => {
      active = false;
    };
  }, [storeId, version]);

  useEffect(() => {
    let active = true;
    const loadStock = async () => {
      if (!selectedProductId || !storeId) {
        setSelectedStock(null);
        return;
      }
      const prod = products.find((p) => p.id === selectedProductId);
      if (prod?.isDish) {
        setSelectedStock(null);
        return;
      }
      try {
        const data = await getStockByProductAndStore(Number(storeId), Number(selectedProductId));
        if (!active) return;
        const stock = typeof data?.stock === "number" ? data.stock : data?.quantity ?? null;
        setSelectedStock(stock);
      } catch {
        if (active) setSelectedStock(null);
      }
    };
    loadStock();
    return () => {
      active = false;
    };
  }, [selectedProductId, storeId, products]);

  const handleProductPick = useCallback((product: ProductOption | null) => {
    if (!product) {
      setSelectedProductId(null);
      setSelectedPrice(0);
      setSelectedStock(null);
      return;
    }
    setSelectedProductId(product.id);
    setSelectedPrice(Number(product.price ?? 0));
  }, []);

  const addItem = useCallback(() => {
    if (!selectedProductId) return;
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === selectedProductId);
      if (existing) {
        return prev.map((i) =>
          i.productId === selectedProductId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { productId: product.id, name: product.name, quantity, price: selectedPrice }];
    });
    setQuantity(1);
  }, [selectedProductId, products, quantity, selectedPrice]);

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const handleCreateRestaurantOrder = useCallback(async () => {
    if (items.length === 0) {
      toast.error("Agrega productos a la orden.");
      return;
    }
    if (orderType === "DINE_IN" && !selectedTableId) {
      toast.error("Selecciona una mesa.");
      return;
    }
    try {
      const payload = {
        orderType,
        tableId: orderType === "DINE_IN" ? selectedTableId : null,
        clientId: selectedClientId ?? null,
        notes: orderNotes?.trim() || null,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price,
        })),
      };
      await createRestaurantOrder(payload as any);
      toast.success("Orden creada correctamente.");
      router.push("/dashboard/restaurant-orders");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo crear la orden.");
    }
  }, [items, orderType, selectedTableId, selectedClientId, orderNotes, router]);

  if (!isRestaurant) {
    return (
      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 text-amber-200">
            Este modulo solo esta disponible para el vertical de restaurantes.
          </div>
        </div>
      </section>
    );
  }

  const isPageLoading = storesLoading || productsLoading || clientsLoading || tablesLoading;

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="container mx-auto px-4 py-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {[...Array(3)].map((_, idx) => (
                <Card key={idx} className="border-white/10 bg-background/60">
                  <CardHeader className="px-4 pt-4 pb-2">
                    <Skeleton className="h-5 w-32" />
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="border-white/10 bg-background/70">
              <CardHeader className="px-4 pt-4 pb-2">
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
                <div className="pt-4">
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Restaurante</p>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Nueva orden</h1>
              <PageGuideButton steps={RESTAURANT_ORDER_FORM_GUIDE_STEPS} tooltipLabel="Guía de nueva orden" />
            </div>
            <p className="text-sm text-muted-foreground">
              Registra una orden de mesa, para llevar o delivery con productos del menu.
            </p>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary">
            {orderType === "DINE_IN" ? "Mesa" : orderType === "TAKEAWAY" ? "Para llevar" : "Delivery"}
          </Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 max-w-7xl">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-white/10 bg-background/60">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle>Tipo de orden</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Button
                    type="button"
                    variant={orderType === "DINE_IN" ? "default" : "outline"}
                    className={`cursor-pointer gap-2 transition-all duration-200 ${orderType === "DINE_IN" ? "shadow-md shadow-primary/25 ring-1 ring-primary/30" : "hover:border-primary/50 hover:bg-primary/5 hover:text-primary"}`}
                    onClick={() => setOrderType("DINE_IN")}
                  >
                    <UtensilsCrossed className="h-4 w-4" />
                    Mesa
                  </Button>
                  <Button
                    type="button"
                    variant={orderType === "TAKEAWAY" ? "default" : "outline"}
                    className={`cursor-pointer gap-2 transition-all duration-200 ${orderType === "TAKEAWAY" ? "shadow-md shadow-primary/25 ring-1 ring-primary/30" : "hover:border-primary/50 hover:bg-primary/5 hover:text-primary"}`}
                    onClick={() => setOrderType("TAKEAWAY")}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Para llevar
                  </Button>
                  <Button
                    type="button"
                    variant={orderType === "DELIVERY" ? "default" : "outline"}
                    className={`cursor-pointer gap-2 transition-all duration-200 ${orderType === "DELIVERY" ? "shadow-md shadow-primary/25 ring-1 ring-primary/30" : "hover:border-primary/50 hover:bg-primary/5 hover:text-primary"}`}
                    onClick={() => setOrderType("DELIVERY")}
                  >
                    <Truck className="h-4 w-4" />
                    Delivery
                  </Button>
                </div>

                {orderType === "DINE_IN" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Mesa</Label>
                      <Select
                        value={selectedTableId ? String(selectedTableId) : ""}
                        onValueChange={(value) => setSelectedTableId(Number(value))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={tablesLoading ? "Cargando mesas..." : "Selecciona una mesa"} />
                        </SelectTrigger>
                        <SelectContent>
                          {tables.map((table) => {
                            const isOccupied = table.status === "OCCUPIED" || !!table.currentOrderId;
                            return (
                              <SelectItem
                                key={table.id}
                                value={String(table.id)}
                                disabled={isOccupied}
                                className={isOccupied ? "opacity-50" : ""}
                              >
                                <span className="flex items-center gap-2">
                                  <span
                                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                                      isOccupied
                                        ? "bg-rose-400"
                                        : table.status === "RESERVED"
                                          ? "bg-amber-400"
                                          : table.status === "DISABLED"
                                            ? "bg-sky-400"
                                            : "bg-emerald-400"
                                    }`}
                                  />
                                  {table.code} - {table.name}
                                  {isOccupied && (
                                    <span className="text-[10px] text-rose-400">Ocupada</span>
                                  )}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {selectedTableId && tables.find((t) => t.id === selectedTableId && (t.status === "OCCUPIED" || t.currentOrderId)) && (
                        <p className="flex items-center gap-1.5 text-xs text-amber-400">
                          <AlertCircle className="h-3 w-3" />
                          Esta mesa se ocupo — selecciona otra
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <ClientCombobox
                        clients={clientsWithKey}
                        selectedId={selectedClientId}
                        selectedLabel={selectedClientLabel}
                        onPick={handleClientPick}
                        showPublicOption
                      />
                    </div>
                  </div>
                )}

                {orderType !== "DINE_IN" && (
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <ClientCombobox
                      clients={clientsWithKey}
                      selectedId={selectedClientId}
                      selectedLabel={selectedClientLabel}
                      onPick={handleClientPick}
                    />
                  </div>
                )}

                {!tablesLoading && orderType === "DINE_IN" && tables.length === 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    No hay mesas configuradas. Crea una mesa para habilitar ordenes en sala.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Menú de platos y productos ── */}
            <Card className="border-white/10 bg-background/60">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle>Menú</CardTitle>
                <p className="text-xs text-muted-foreground">Selecciona platos y productos para la orden.</p>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                {/* Tienda (solo si hay más de una) */}
                {stores.length > 1 && (
                  <div className="space-y-2">
                    <Label>Tienda</Label>
                    <Select value={String(storeId)} onValueChange={(v) => setStoreId(Number(v))}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {stores.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Buscador */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar plato o producto..."
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Categorías como tabs */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={selectedCategory === 0 ? "default" : "outline"}
                    size="sm"
                    className={`cursor-pointer text-xs transition-all duration-150 ${selectedCategory === 0 ? "shadow-sm" : "hover:border-primary/50 hover:text-primary"}`}
                    onClick={() => setSelectedCategory(0)}
                  >
                    Todos
                  </Button>
                  {categories.map((c) => (
                    <Button
                      key={c.id}
                      type="button"
                      variant={selectedCategory === c.id ? "default" : "outline"}
                      size="sm"
                      className={`cursor-pointer text-xs transition-all duration-150 ${selectedCategory === c.id ? "shadow-sm" : "hover:border-primary/50 hover:text-primary"}`}
                      onClick={() => setSelectedCategory(c.id)}
                    >
                      {c.name}
                    </Button>
                  ))}
                </div>

                {/* Grid de productos */}
                {filteredProducts.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {products.length === 0 ? "No hay platos o productos registrados." : "Sin resultados para esta búsqueda."}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {filteredProducts.map((p) => {
                      const imgSrc = p.image ? resolveImageUrl(p.image) : null;
                      const isSelected = selectedProductId === p.id;
                      const inCart = items.some((i) => i.productId === p.id);
                      const noStock = !p.isDish && typeof p.stock === "number" && p.stock <= 0;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={noStock}
                          onClick={() => {
                            if (isSelected) {
                              addItem();
                            } else {
                              handleProductPick(p);
                            }
                          }}
                          className={`group relative flex flex-col overflow-hidden rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                              : noStock
                                ? "border-white/5 opacity-50 cursor-not-allowed"
                                : "border-white/10 hover:border-primary/40 hover:bg-white/[0.02]"
                          }`}
                        >
                          {/* Imagen */}
                          <div className="relative aspect-square w-full overflow-hidden bg-muted/30">
                            {imgSrc ? (
                              <img
                                src={imgSrc}
                                alt={p.name}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ImageOff className="h-8 w-8 text-muted-foreground/30" />
                              </div>
                            )}
                            {inCart && (
                              <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                {items.find((i) => i.productId === p.id)?.quantity ?? 0}
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex flex-1 flex-col gap-0.5 p-2">
                            <span className="text-xs font-medium leading-tight line-clamp-2">{p.name}</span>
                            <span className="text-xs font-semibold text-primary">S/. {(Number(p.price) || 0).toFixed(2)}</span>
                            {!p.isDish && typeof p.stock === "number" && (
                              <Badge variant="outline" className={`mt-0.5 w-fit text-[10px] ${p.stock > 0 ? "border-green-500/40 text-green-400" : "border-red-500/40 text-red-400"}`}>
                                Stock: {p.stock}
                              </Badge>
                            )}
                            {p.isDish && (
                              <span className="mt-0.5 text-[10px] text-muted-foreground">Plato</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Panel del producto seleccionado */}
                {selectedProduct && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{selectedProduct.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedProduct.isDish ? "Plato" : `Stock: ${selectedStock ?? "-"}`}
                          {" · "}S/. {(Number(selectedPrice) || 0).toFixed(2)} c/u
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8 cursor-pointer" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                        <Button
                          type="button" variant="outline" size="icon" className="h-8 w-8 cursor-pointer"
                          onClick={() => setQuantity(quantity + 1)}
                          disabled={remainingStock !== null && quantity >= (selectedStock ?? Infinity)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      className="w-full cursor-pointer gap-2"
                      type="button"
                      onClick={addItem}
                      disabled={!selectedProduct.isDish && remainingStock !== null && quantity > (selectedStock ?? 0)}
                    >
                      <Plus className="h-4 w-4" />
                      Agregar · S/. {(quantity * selectedPrice).toFixed(2)}
                    </Button>
                  </div>
                )}

                {/* Items agregados */}
                <Separator />
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No has agregado items a la orden.</p>
                  ) : (
                    items.map((it) => (
                      <div key={it.productId} className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.02] p-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{it.name}</p>
                          <p className="text-xs text-muted-foreground">{it.quantity} x S/. {it.price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">S/. {(it.quantity * it.price).toFixed(2)}</span>
                          <Button variant="ghost" size="sm" className="cursor-pointer text-xs text-destructive hover:text-destructive" onClick={() => removeItem(it.productId)}>
                            Quitar
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {!storesLoading && stores.length === 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                No hay tiendas configuradas. Crea una tienda para habilitar la carga de productos.
              </div>
            )}

            <Card className="border-white/10 bg-background/60">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle>Notas adicionales</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Textarea
                  value={orderNotes}
                  onChange={(event) => setOrderNotes(event.target.value)}
                  placeholder="Notas para cocina o el salon"
                  className="min-h-[90px]"
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="border-white/10 bg-background/70 sticky top-8">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle>Resumen de la orden</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Agrega productos para ver el resumen.</p>
                  ) : (
                    items.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity} x S/. {item.price.toFixed(2)}</p>
                        </div>
                        <span className="font-semibold">S/. {(item.quantity * item.price).toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
                <Separator />
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>S/. {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>S/. {total.toFixed(2)}</span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateRestaurantOrder}
                  disabled={items.length === 0 || (orderType === "DINE_IN" && !selectedTableId)}
                >
                  Crear orden
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
