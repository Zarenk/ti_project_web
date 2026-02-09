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
import { useVerticalConfig } from "@/hooks/use-vertical-config";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { getStores } from "@/app/dashboard/stores/stores.api";
import { getClients } from "@/app/dashboard/clients/clients.api";
import { getCategories } from "@/app/dashboard/categories/categories.api";
import { getProductsByStore, getStockByProductAndStore } from "@/app/dashboard/sales/sales.api";
import { createRestaurantOrder } from "@/app/dashboard/orders/orders.api";
import { getRestaurantTables, type RestaurantTable } from "@/app/dashboard/tables/tables.api";
import ClientCombobox from "@/app/dashboard/orders/new/ClientCombobox";
import ProductsSection from "@/app/dashboard/orders/new/ProductsSection";
import { DEFAULT_STORE_ID } from "@/lib/config";

 type ProductOption = {
  id: number;
  name: string;
  price: number;
  stock?: number | null;
  categoryId?: number | null;
  categoryName?: string | null;
  searchKey?: string;
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
  const [selectedClientLabel, setSelectedClientLabel] = useState<string>("");

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [selectedStock, setSelectedStock] = useState<number | null>(null);
  const [orderNotes, setOrderNotes] = useState("");

  const handleClientPick = useCallback((client: any | null) => {
    if (!client) {
      setSelectedClientId(null);
      setSelectedClientLabel("");
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

  const remainingStock = useMemo(() => {
    if (!selectedProductId || selectedStock == null) return null;
    return Math.max(selectedStock - quantity, 0);
  }, [selectedProductId, selectedStock, quantity]);

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

  useEffect(() => {
    let active = true;
    if (!isRestaurant) {
      setTables([]);
      setTablesLoading(false);
      return;
    }
    const loadTables = async () => {
      setTablesLoading(true);
      try {
        const data = await getRestaurantTables();
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setTables(list);
        if (orderType === "DINE_IN" && list.length > 0) {
          setSelectedTableId((prev) => prev ?? list[0].id);
        }
      } catch (err) {
        console.error("Error loading tables", err);
        if (active) setTables([]);
      } finally {
        if (active) setTablesLoading(false);
      }
    };
    loadTables();
    return () => {
      active = false;
    };
  }, [version, isRestaurant, orderType]);

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
        const data = await getProductsByStore(String(storeId));
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
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
      try {
        const data = await getStockByProductAndStore(String(selectedProductId), String(storeId));
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
  }, [selectedProductId, storeId]);

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
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Nueva orden</h1>
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
                    onClick={() => setOrderType("DINE_IN")}
                  >
                    Mesa
                  </Button>
                  <Button
                    type="button"
                    variant={orderType === "TAKEAWAY" ? "default" : "outline"}
                    onClick={() => setOrderType("TAKEAWAY")}
                  >
                    Para llevar
                  </Button>
                  <Button
                    type="button"
                    variant={orderType === "DELIVERY" ? "default" : "outline"}
                    onClick={() => setOrderType("DELIVERY")}
                  >
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
                          {tables.map((table) => (
                            <SelectItem key={table.id} value={String(table.id)}>
                              {table.code} - {table.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <ClientCombobox
                        clients={clientsWithKey}
                        selectedId={selectedClientId}
                        selectedLabel={selectedClientLabel}
                        onPick={handleClientPick}
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

            <ProductsSection
              storeId={storeId}
              stores={stores}
              setStoreId={setStoreId}
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedProductId={selectedProductId}
              products={products}
              handleProductPick={handleProductPick}
              selectedStock={selectedStock}
              remainingStock={remainingStock}
              quantity={quantity}
              setQuantity={setQuantity}
              selectedPrice={selectedPrice}
              setSelectedPrice={setSelectedPrice}
              addItem={addItem}
              items={items}
              removeItem={removeItem}
            />

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
