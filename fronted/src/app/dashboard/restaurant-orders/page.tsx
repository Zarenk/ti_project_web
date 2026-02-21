"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useVerticalConfig } from "@/hooks/use-vertical-config";
import { useDebounce } from "@/app/hooks/useDebounce";
import {
  getRestaurantOrders,
  updateRestaurantOrder,
  type PaginatedRestaurantOrders,
} from "@/app/dashboard/orders/orders.api";
import { toast } from "sonner";
import { useKitchenSocket } from "@/hooks/use-kitchen-socket";
import { CalendarDays } from "lucide-react";
import { ManualPagination } from "@/components/data-table-pagination";
import { PageGuideButton } from "@/components/page-guide-dialog";
import { RESTAURANT_ORDERS_GUIDE_STEPS } from "./restaurant-orders-guide-steps";

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
  items?: Array<{
    product?: { name?: string | null } | null;
    quantity?: number | null;
  }>;
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

const STATUS_ACTIONS: Record<RestaurantOrderStatus, RestaurantOrderStatus[]> = {
  OPEN: ["CANCELLED"],
  IN_PROGRESS: [],
  READY: [],
  SERVED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

// ── Date helpers ────────────────────────────────────────────────
type DatePreset = "today" | "week" | "month" | "custom";

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: "Hoy",
  week: "Esta semana",
  month: "Este mes",
  custom: "Personalizado",
};

/** Start of day in local timezone → UTC ISO string */
function startOfDayISO(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
}

/** End of day in local timezone → UTC ISO string */
function endOfDayISO(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();
}

/** YYYY-MM-DD for display and <input type="date"> */
function toDateInputStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Convert a YYYY-MM-DD string to local-start / local-end ISO bounds */
function dateToBounds(dateStr: string, mode: "start" | "end"): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return "";
  if (mode === "start") return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

type DateRange = { from: string; to: string; displayFrom: string; displayTo: string };

function getDateRange(preset: DatePreset): DateRange {
  const now = new Date();

  if (preset === "today") {
    return {
      from: startOfDayISO(now),
      to: endOfDayISO(now),
      displayFrom: toDateInputStr(now),
      displayTo: toDateInputStr(now),
    };
  }
  if (preset === "week") {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    return {
      from: startOfDayISO(monday),
      to: endOfDayISO(now),
      displayFrom: toDateInputStr(monday),
      displayTo: toDateInputStr(now),
    };
  }
  if (preset === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      from: startOfDayISO(first),
      to: endOfDayISO(now),
      displayFrom: toDateInputStr(first),
      displayTo: toDateInputStr(now),
    };
  }
  return { from: "", to: "", displayFrom: "", displayTo: "" };
}

const ITEMS_PER_PAGE = 20;

// ── Component ───────────────────────────────────────────────────
export default function RestaurantOrdersPage() {
  const router = useRouter();
  const { info: verticalInfo } = useVerticalConfig();
  const isRestaurant = verticalInfo?.businessVertical === "RESTAURANTS";

  // Data
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState<RestaurantOrderStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  // Pagination & date
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Derived date range (ISO timestamps with local timezone boundaries)
  const dateRange = useMemo((): DateRange => {
    if (datePreset === "custom") {
      return {
        from: customFrom ? dateToBounds(customFrom, "start") : "",
        to: customTo ? dateToBounds(customTo, "end") : "",
        displayFrom: customFrom,
        displayTo: customTo,
      };
    }
    return getDateRange(datePreset);
  }, [datePreset, customFrom, customTo]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [status, datePreset, customFrom, customTo]);

  const loadOrders = useCallback(async () => {
    if (!isRestaurant) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        take: pageSize,
      };
      if (status !== "ALL") params.status = status;
      if (dateRange.from) params.from = dateRange.from;
      if (dateRange.to) params.to = dateRange.to;

      const result: PaginatedRestaurantOrders = await getRestaurantOrders(
        params as Parameters<typeof getRestaurantOrders>[0],
      );
      setOrders(
        Array.isArray(result.data) ? (result.data as RestaurantOrder[]) : [],
      );
      setTotal(result.total ?? 0);
      setTotalPages(result.totalPages ?? 0);
    } catch (err) {
      console.error(err);
      setOrders([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [status, isRestaurant, page, pageSize, dateRange]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Real-time updates via WebSocket
  useKitchenSocket({
    enabled: isRestaurant,
    onOrderUpdate: useCallback(() => {
      void loadOrders();
    }, [loadOrders]),
  });

  // Status counts from the current page (visual feedback)
  const statusCounts = useMemo(() => {
    const base = {
      OPEN: 0,
      IN_PROGRESS: 0,
      READY: 0,
      SERVED: 0,
      CLOSED: 0,
      CANCELLED: 0,
    };
    orders.forEach((order) => {
      base[order.status] += 1;
    });
    return base;
  }, [orders]);

  // Client-side search within the current page
  const filteredOrders = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) => {
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
  }, [orders, debouncedSearch]);

  const ordersByType = useMemo(() => {
    const grouped: Record<RestaurantOrderType, RestaurantOrder[]> = {
      DINE_IN: [],
      TAKEAWAY: [],
      DELIVERY: [],
    };
    filteredOrders.forEach((order) => {
      grouped[order.orderType]?.push(order);
    });
    return grouped;
  }, [filteredOrders]);

  const handleQuickStatus = async (
    orderId: number,
    nextStatus: RestaurantOrderStatus,
  ) => {
    try {
      const updated = await updateRestaurantOrder(orderId, {
        status: nextStatus,
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)),
      );
      const label =
        nextStatus === "CANCELLED"
          ? "Orden cancelada"
          : `Orden marcada ${RESTAURANT_STATUS_LABELS[nextStatus]}`;
      toast.success(label);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo actualizar el estado.");
    }
  };

  const handleDropToType = async (
    orderId: number,
    targetType: RestaurantOrderType,
  ) => {
    try {
      const updated = await updateRestaurantOrder(orderId, {
        orderType: targetType,
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)),
      );
      toast.success(`Orden movida a ${RESTAURANT_TYPE_LABELS[targetType]}.`);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo mover la orden.");
    }
  };

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

  return (
    <section className="py-2 sm:py-6">
      <div className="container mx-auto px-1 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 gap-3 mb-4 sm:mb-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Restaurante
            </p>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                Ordenes
              </h1>
              <PageGuideButton steps={RESTAURANT_ORDERS_GUIDE_STEPS} tooltipLabel="Guía de órdenes" />
            </div>
            <p className="text-sm text-muted-foreground">
              Controla mesas, delivery y para llevar en una sola vista.
            </p>
          </div>
          <Button
            onClick={() => router.push("/dashboard/restaurant-orders/new")}
            className="bg-blue-900 hover:bg-blue-800 text-white"
          >
            Nueva Orden
          </Button>
        </div>

        <div className="space-y-6 px-5">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground sm:text-2xl">
                Gestion de ordenes
              </h2>
              <p className="text-sm text-muted-foreground">
                Visualiza el flujo por estado y tipo de servicio.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-primary/30 text-primary"
              >
                {total} orden{total !== 1 ? "es" : ""}
              </Badge>
              <Badge
                variant="outline"
                className="border-primary/30 text-primary"
              >
                Vertical Restaurantes
              </Badge>
            </div>
          </header>

          {/* Status summary cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {(
              [
                [
                  "OPEN",
                  "Pendientes",
                  "border-amber-500/20 bg-amber-500/5 text-amber-200",
                ],
                [
                  "IN_PROGRESS",
                  "Preparando",
                  "border-orange-500/20 bg-orange-500/5 text-orange-200",
                ],
                [
                  "READY",
                  "Listos",
                  "border-emerald-500/20 bg-emerald-500/5 text-emerald-200",
                ],
                [
                  "SERVED",
                  "Servidos",
                  "border-sky-500/20 bg-sky-500/5 text-sky-200",
                ],
                [
                  "CLOSED",
                  "Cerrados",
                  "border-slate-500/20 bg-slate-500/5 text-slate-200",
                ],
                [
                  "CANCELLED",
                  "Cancelados",
                  "border-rose-500/20 bg-rose-500/5 text-rose-200",
                ],
              ] as const
            ).map(([key, label, className]) => (
              <div key={key} className={`rounded-2xl border p-4 ${className}`}>
                <p className="text-xs uppercase text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {statusCounts[key as RestaurantOrderStatus] ?? 0}
                </p>
              </div>
            ))}
          </div>

          {/* ── Date range presets ─────────────────────────────── */}
          <Card className="border border-border/60 bg-background/60 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex flex-wrap gap-2">
                {(
                  ["today", "week", "month", "custom"] as const
                ).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDatePreset(preset)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      datePreset === preset
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {DATE_PRESET_LABELS[preset]}
                  </button>
                ))}
              </div>

              {datePreset === "custom" && (
                <div className="flex items-center gap-2 ml-auto">
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-36 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">a</span>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-36 text-xs"
                  />
                </div>
              )}

              {datePreset !== "custom" && dateRange.displayFrom && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {dateRange.displayFrom}
                  {dateRange.displayFrom !== dateRange.displayTo
                    ? ` — ${dateRange.displayTo}`
                    : ""}
                </span>
              )}
            </div>
          </Card>

          {/* ── Status filter + search ────────────────────────── */}
          <Card className="border border-border/60 bg-background/60 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "ALL",
                    "OPEN",
                    "IN_PROGRESS",
                    "READY",
                    "SERVED",
                    "CLOSED",
                    "CANCELLED",
                  ] as const
                ).map((nextStatus) => (
                  <button
                    key={nextStatus}
                    type="button"
                    onClick={() => setStatus(nextStatus)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      status === nextStatus
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {nextStatus === "ALL"
                      ? "Todas"
                      : RESTAURANT_STATUS_LABELS[nextStatus]}
                  </button>
                ))}
              </div>
              <div className="ml-auto w-full sm:w-64">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por mesa, item u orden..."
                />
              </div>
            </div>
          </Card>

          {/* ── Orders grid ───────────────────────────────────── */}
          {loading ? (
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
              {(Object.keys(ordersByType) as RestaurantOrderType[]).map(
                (type) => (
                  <div
                    key={type}
                    className="space-y-3"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      if (draggingId != null) {
                        handleDropToType(draggingId, type);
                        setDraggingId(null);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">
                          {RESTAURANT_TYPE_LABELS[type]}
                        </h3>
                        <Badge
                          variant="outline"
                          className="border-primary/20 text-primary"
                        >
                          {ordersByType[type].length}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {ordersByType[type].length} ordenes
                      </span>
                    </div>
                    <div className="space-y-3 max-h-[65vh] overflow-auto pr-1">
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
                          const canDrag =
                            order.status !== "CLOSED" &&
                            order.status !== "CANCELLED";
                          return (
                            <div
                              key={order.id}
                              className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm"
                              draggable={canDrag}
                              onDragStart={() => setDraggingId(order.id)}
                              onDragEnd={() => setDraggingId(null)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs text-muted-foreground">
                                    Orden #{order.id}
                                  </p>
                                  <p className="mt-1 text-base font-semibold text-foreground">
                                    {order.table?.name ??
                                      (order.orderType === "TAKEAWAY"
                                        ? "Para llevar"
                                        : "Delivery")}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {items.length} item(s)
                                  </p>
                                </div>
                                <Badge
                                  className={`border ${RESTAURANT_STATUS_CLASSES[order.status]}`}
                                >
                                  {RESTAURANT_STATUS_LABELS[order.status]}
                                </Badge>
                              </div>
                              <p className="mt-3 text-xs text-muted-foreground">
                                {itemNames || "Sin items registrados"}
                                {items.length > 3 ? " ..." : ""}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {STATUS_ACTIONS[order.status].map((next) => (
                                  <Button
                                    key={`${order.id}-${next}`}
                                    variant={
                                      next === "CANCELLED"
                                        ? "destructive"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() =>
                                      handleQuickStatus(order.id, next)
                                    }
                                  >
                                    {next === "CANCELLED"
                                      ? "Cancelar"
                                      : `Marcar ${RESTAURANT_STATUS_LABELS[next]}`}
                                  </Button>
                                ))}
                              </div>
                              <div className="mt-4 flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {order.openedAt
                                    ? new Date(
                                        order.openedAt,
                                      ).toLocaleTimeString()
                                    : "Sin hora"}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    router.push(
                                      `/dashboard/restaurant-orders/${order.id}`,
                                    )
                                  }
                                >
                                  Ver detalle
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}

          {/* ── Pagination controls ───────────────────────────── */}
          {totalPages > 0 && (
            <ManualPagination
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              pageSizeOptions={[10, 20, 30, 50]}
            />
          )}
        </div>
      </div>
    </section>
  );
}
