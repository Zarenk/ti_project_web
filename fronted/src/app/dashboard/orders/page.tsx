"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "./data-table";
import { getUserDataFromToken, isTokenValid } from "@/lib/auth";
import { getColumns } from "./column";
import { getOrders, getRestaurantOrders } from "./orders.api";
import { getStore } from "@/app/dashboard/stores/stores.api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useTenantSelection } from "@/context/tenant-selection-context";
import { fetchCompanyVerticalInfo } from "@/app/dashboard/tenancy/tenancy.api";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { useDebounce } from "@/app/hooks/useDebounce";

type RestaurantOrderStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "READY"
  | "SERVED"
  | "CLOSED"
  | "CANCELLED";

type RestaurantOrderType = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

type RestaurantOrder = {
  id: number;
  status: RestaurantOrderStatus;
  orderType: RestaurantOrderType;
  openedAt?: string;
  total?: number | null;
  table?: { name?: string | null } | null;
  items?: Array<{ product?: { name?: string | null } | null; quantity?: number | null }>;
};

const RESTAURANT_STATUS_LABELS: Record<RestaurantOrderStatus, string> = {
  OPEN: "Pendiente",
  IN_PROGRESS: "Preparando",
  READY: "Listo",
  SERVED: "Servido",
  CLOSED: "Cerrado",
  CANCELLED: "Cancelado",
};

const RESTAURANT_STATUS_CLASSES: Record<RestaurantOrderStatus, string> = {
  OPEN: "border-amber-500/40 text-amber-200 bg-amber-500/10",
  IN_PROGRESS: "border-orange-500/40 text-orange-200 bg-orange-500/10",
  READY: "border-emerald-500/40 text-emerald-200 bg-emerald-500/10",
  SERVED: "border-sky-500/40 text-sky-200 bg-sky-500/10",
  CLOSED: "border-slate-500/40 text-slate-200 bg-slate-500/10",
  CANCELLED: "border-rose-500/40 text-rose-200 bg-rose-500/10",
};

const RESTAURANT_TYPE_LABELS: Record<RestaurantOrderType, string> = {
  DINE_IN: "Mesa",
  TAKEAWAY: "Para llevar",
  DELIVERY: "Delivery",
};

const normalizeOrderSunatStatus = (value: any) => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const statusRaw = typeof value.status === "string" ? value.status.trim() : "";
  if (!statusRaw) {
    return null;
  }

  return {
    status: statusRaw.toUpperCase(),
    ticket: value.ticket ?? null,
    environment: typeof value.environment === "string" ? value.environment : null,
    errorMessage: value.errorMessage ?? null,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : value.updated_at ?? null,
  };
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restaurantOrders, setRestaurantOrders] = useState<RestaurantOrder[]>([]);
  const [restaurantLoading, setRestaurantLoading] = useState(true);
  const [restaurantStatus, setRestaurantStatus] = useState<RestaurantOrderStatus | "ALL">("ALL");
  const [restaurantSearch, setRestaurantSearch] = useState("");
  const debouncedRestaurantSearch = useDebounce(restaurantSearch, 300);
  const router = useRouter();
  const [storesMap, setStoresMap] = useState<Record<number, string>>({});
  const { version, selection } = useTenantSelection();
  const [verticalName, setVerticalName] = useState("GENERAL");
  const [verticalResolved, setVerticalResolved] = useState(false);

  const handleStatusUpdate = useCallback((id: number, status: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
  }, []);

  const columns = useMemo(() => getColumns(handleStatusUpdate), [handleStatusUpdate]);

  useEffect(() => {
    let cancelled = false;
    const loadVertical = async () => {
      if (!selection.companyId) {
        if (!cancelled) {
          setVerticalName("GENERAL");
          setVerticalResolved(true);
        }
        return;
      }
      try {
        const info = await fetchCompanyVerticalInfo(selection.companyId);
        if (cancelled) return;
        const name = typeof info?.verticalName === "string" ? info.verticalName.toUpperCase() : "GENERAL";
        setVerticalName(name);
        setVerticalResolved(true);
      } catch {
        if (!cancelled) {
          setVerticalName("GENERAL");
          setVerticalResolved(true);
        }
      }
    };
    loadVertical();
    return () => {
      cancelled = true;
    };
  }, [selection.companyId, version]);

  const isRestaurant = verticalName === "RESTAURANTS";

  useEffect(() => {
    if (!verticalResolved || !isRestaurant) {
      return;
    }
    let cancelled = false;
    setRestaurantLoading(true);
    setRestaurantOrders([]);
    const load = async () => {
      try {
        const data = await getRestaurantOrders(
          restaurantStatus === "ALL" ? {} : { status: restaurantStatus },
        );
        if (cancelled) return;
        setRestaurantOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        if (!cancelled) setRestaurantOrders([]);
      } finally {
        if (!cancelled) setRestaurantLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [verticalResolved, isRestaurant, restaurantStatus, version]);

  useEffect(() => {
    if (!verticalResolved || isRestaurant) {
      return;
    }
    setIsLoading(true);
    setOrders([]);
    setStoresMap({});
    async function fetchData() {
      const user = await getUserDataFromToken();
      const isValid = await isTokenValid();
      const normalizedRole = user?.role ? user.role.trim().toUpperCase().replace(/\s+/g, "_") : null;
      const isSuperAdmin = normalizedRole ? normalizedRole.includes("SUPER_ADMIN") : false;
      const allowedRoles = new Set(["ADMIN", "EMPLOYEE", "ACCOUNTANT", "AUDITOR"]);
      const roleAllowed = normalizedRole ? (isSuperAdmin || allowedRoles.has(normalizedRole)) : false;

      if (!user || !isValid || !roleAllowed) {
        router.replace("/unauthorized");
        return;
      }
      try {
        const data = await getOrders();

        const uniqueStoreIds = Array.from(
          new Set(
            (data || [])
              .map((o: any) => Number(o?.payload?.storeId))
              .filter((n: any) => typeof n === "number" && !Number.isNaN(n) && n > 0)
          )
        );

        const storeEntries: [number, string][] = [];
        for (const sid of uniqueStoreIds) {
          try {
            const s = await getStore(String(sid));
            if (s && s.name) storeEntries.push([sid as number, String(s.name)]);
          } catch {
            /* ignore */
          }
        }
        const nextStoresMap = Object.fromEntries(storeEntries);
        setStoresMap(nextStoresMap);

        const mapped = data.map((o: any) => {
          const sid = Number(o?.payload?.storeId);
          const origin = sid && sid > 0 ? (nextStoresMap[sid] || `Tienda ${sid}`) : "WEB POS";
          return {
            id: o.id,
            code: o.code,
            createdAt: o.createdAt,
            client: o.payload?.firstName ? `${o.payload.firstName} ${o.payload.lastName}` : o.shippingName,
            total: o.payload?.total ?? 0,
            status: o.status,
            origin,
            shippingMethod: typeof o?.payload?.shippingMethod === "string" ? o.payload.shippingMethod : undefined,
            carrierName: o.carrierName ?? undefined,
            carrierId: o.carrierId ?? undefined,
            carrierMode: o.carrierMode ?? undefined,
            sunatStatus: normalizeOrderSunatStatus(o.sunatStatus ?? o.sunat_status ?? null),
          };
        });
        setOrders(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [router, version, isRestaurant, verticalResolved]);

  const restaurantStatusCounts = useMemo(() => {
    const base = {
      OPEN: 0,
      IN_PROGRESS: 0,
      READY: 0,
      SERVED: 0,
      CLOSED: 0,
      CANCELLED: 0,
    };
    restaurantOrders.forEach((order) => {
      base[order.status] += 1;
    });
    return base;
  }, [restaurantOrders]);

  const filteredRestaurantOrders = useMemo(() => {
    const query = debouncedRestaurantSearch.trim().toLowerCase();
    return restaurantOrders.filter((order) => {
      if (restaurantStatus !== "ALL" && order.status !== restaurantStatus) return false;
      if (!query) return true;
      const tableName = order.table?.name?.toLowerCase() ?? "";
      const items = order.items ?? [];
      const itemText = items
        .map((item) => item.product?.name ?? "")
        .join(" ")
        .toLowerCase();
      return (
        String(order.id).includes(query) ||
        tableName.includes(query) ||
        itemText.includes(query)
      );
    });
  }, [restaurantOrders, restaurantStatus, debouncedRestaurantSearch]);

  const ordersByType = useMemo(() => {
    const grouped: Record<RestaurantOrderType, RestaurantOrder[]> = {
      DINE_IN: [],
      TAKEAWAY: [],
      DELIVERY: [],
    };
    filteredRestaurantOrders.forEach((order) => {
      grouped[order.orderType]?.push(order);
    });
    return grouped;
  }, [filteredRestaurantOrders]);

  return (
    <section className="py-2 sm:py-6">
      <div className="container mx-auto px-1 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between px-5 gap-3 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Ordenes</h1>
          <Button
            onClick={() => router.push("/dashboard/orders/new")}
            className="bg-blue-900 hover:bg-blue-800 text-white"
          >
            Nueva Orden
          </Button>
        </div>

        {isRestaurant ? (
          <div className="space-y-6 px-5">
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
                  Gestion de ordenes
                </h2>
                <p className="text-sm text-muted-foreground">
                  Controla el flujo de mesas, delivery y para llevar en tiempo real.
                </p>
              </div>
              <Badge variant="outline" className="border-primary/30 text-primary">
                Vertical Restaurantes
              </Badge>
            </header>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {(
                [
                  ["OPEN", "Pendientes", "border-amber-500/20 bg-amber-500/5 text-amber-200"],
                  ["IN_PROGRESS", "Preparando", "border-orange-500/20 bg-orange-500/5 text-orange-200"],
                  ["READY", "Listos", "border-emerald-500/20 bg-emerald-500/5 text-emerald-200"],
                  ["SERVED", "Servidos", "border-sky-500/20 bg-sky-500/5 text-sky-200"],
                  ["CLOSED", "Cerrados", "border-slate-500/20 bg-slate-500/5 text-slate-200"],
                  ["CANCELLED", "Cancelados", "border-rose-500/20 bg-rose-500/5 text-rose-200"],
                ] as const
              ).map(([key, label, className]) => (
                <div key={key} className={`rounded-2xl border p-4 ${className}`}>
                  <p className="text-xs uppercase text-muted-foreground">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {restaurantStatusCounts[key as RestaurantOrderStatus] ?? 0}
                  </p>
                </div>
              ))}
            </div>

            <Card className="border border-border/60 bg-background/60 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap gap-2">
                  {(["ALL", "OPEN", "IN_PROGRESS", "READY", "SERVED", "CLOSED", "CANCELLED"] as const).map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setRestaurantStatus(status)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          restaurantStatus === status
                            ? "border-primary/50 bg-primary/15 text-primary"
                            : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {status === "ALL" ? "Todas" : RESTAURANT_STATUS_LABELS[status]}
                      </button>
                    ),
                  )}
                </div>
                <div className="ml-auto w-full sm:w-64">
                  <Input
                    value={restaurantSearch}
                    onChange={(event) => setRestaurantSearch(event.target.value)}
                    placeholder="Buscar por mesa, item u orden..."
                  />
                </div>
              </div>
            </Card>

            {restaurantLoading ? (
              <div className="rounded-md border p-4">
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={`h-${i}`} className="h-6 w-full" />
                  ))}
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={`c-${i}`} className="h-32 w-full" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                {(Object.keys(ordersByType) as RestaurantOrderType[]).map((type) => (
                  <div key={type} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">
                        {RESTAURANT_TYPE_LABELS[type]}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {ordersByType[type].length} ordenes
                      </span>
                    </div>
                    <div className="space-y-3">
                      {ordersByType[type].length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                          Sin ordenes en esta seccion.
                        </div>
                      ) : (
                        ordersByType[type].map((order) => {
                          const items = order.items ?? [];
                          const itemNames = items
                            .map((item) => item.product?.name ?? "")
                            .filter(Boolean)
                            .slice(0, 3)
                            .join(", ");
                          return (
                            <div
                              key={order.id}
                              className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs text-muted-foreground">Orden #{order.id}</p>
                                  <p className="mt-1 text-base font-semibold text-foreground">
                                    {order.table?.name ?? (order.orderType === "TAKEAWAY" ? "Para llevar" : "Delivery")}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {items.length} item(s)
                                  </p>
                                </div>
                                <Badge className={`border ${RESTAURANT_STATUS_CLASSES[order.status]}`}>
                                  {RESTAURANT_STATUS_LABELS[order.status]}
                                </Badge>
                              </div>
                              <p className="mt-3 text-xs text-muted-foreground">
                                {itemNames || "Sin items registrados"}
                                {items.length > 3 ? " ..." : ""}
                              </p>
                              <div className="mt-4 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {order.openedAt
                                    ? new Date(order.openedAt).toLocaleTimeString()
                                    : "Sin hora"}
                                </span>
                                <span className="font-semibold text-foreground">
                                  {formatCurrency(Number(order.total ?? 0), "PEN")}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="rounded-md border p-4">
            <div className="grid grid-cols-7 gap-3 px-2 py-2">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={`h-${i}`} className="h-4 w-full" />
              ))}
            </div>
            <div className="divide-y">
              {[...Array(8)].map((_, r) => (
                <div key={`r-${r}`} className="grid grid-cols-7 gap-3 px-2 py-3">
                  {[...Array(7)].map((_, c) => (
                    <Skeleton key={`r-${r}-c-${c}`} className="h-5 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <DataTable columns={columns} data={orders} />
        )}
      </div>
    </section>
  );
}
