"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useVerticalConfig } from "@/hooks/use-vertical-config";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { getRestaurantOrder, updateRestaurantOrder } from "@/app/dashboard/orders/orders.api";

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
  closedAt?: string | null;
  total?: number | null;
  subtotal?: number | null;
  tax?: number | null;
  serviceCharge?: number | null;
  salesId?: number | null;
  notes?: string | null;
  table?: { name?: string | null; code?: string | null } | null;
  client?: { name?: string | null; email?: string | null } | null;
  items?: Array<{ product?: { name?: string | null } | null; quantity?: number | null; unitPrice?: number | null }>;
  history?: Array<{
    id?: number | string;
    type?: string | null;
    message?: string | null;
    createdAt?: string | null;
    meta?: Record<string, any> | null;
  }>;
};

const STATUS_LABELS: Record<RestaurantOrderStatus, string> = {
  OPEN: "Pendiente",
  IN_PROGRESS: "Preparando",
  READY: "Listo",
  SERVED: "Servido",
  CLOSED: "Cerrado",
  CANCELLED: "Cancelado",
};

const STATUS_CLASSES: Record<RestaurantOrderStatus, string> = {
  OPEN: "border-amber-500/40 text-amber-200 bg-amber-500/10",
  IN_PROGRESS: "border-orange-500/40 text-orange-200 bg-orange-500/10",
  READY: "border-emerald-500/40 text-emerald-200 bg-emerald-500/10",
  SERVED: "border-sky-500/40 text-sky-200 bg-sky-500/10",
  CLOSED: "border-slate-500/40 text-slate-200 bg-slate-500/10",
  CANCELLED: "border-rose-500/40 text-rose-200 bg-rose-500/10",
};

const TYPE_LABELS: Record<RestaurantOrderType, string> = {
  DINE_IN: "Mesa",
  TAKEAWAY: "Para llevar",
  DELIVERY: "Delivery",
};

const FLOW_ACTIONS: Record<RestaurantOrderStatus, RestaurantOrderStatus[]> = {
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["READY", "CANCELLED"],
  READY: ["SERVED", "CANCELLED"],
  SERVED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export default function RestaurantOrderDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const { info: verticalInfo } = useVerticalConfig();
  const isRestaurant = verticalInfo?.businessVertical === "RESTAURANTS";

  const [order, setOrder] = useState<RestaurantOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  const computedHistory = useMemo(() => {
    if (!order) return [];
    const events = [...(order.history ?? [])].filter(Boolean);
    if (events.length > 0) {
      return events.map((event) => ({
        key: event.id ?? `${event.type ?? "event"}-${event.createdAt ?? ""}`,
        label: event.message ?? event.type ?? "Evento",
        timestamp: event.createdAt ?? null,
        meta: event.meta ?? null,
      }));
    }
    return [
      {
        key: "opened",
        label: "Orden creada",
        timestamp: order.openedAt ?? null,
      },
      order.status === "CANCELLED"
        ? {
            key: "cancelled",
            label: "Orden cancelada",
            timestamp: order.closedAt ?? null,
          }
        : null,
      order.status === "CLOSED"
        ? {
            key: "closed",
            label: "Orden cerrada",
            timestamp: order.closedAt ?? null,
          }
        : null,
    ].filter(Boolean) as Array<{ key: string; label: string; timestamp: string | null }>;
  }, [order]);

  const formatTimestamp = (value: string | null | undefined) => {
    if (!value) return "Sin fecha";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "Sin fecha" : parsed.toLocaleString();
  };

  useEffect(() => {
    if (!isRestaurant || !id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getRestaurantOrder(id as string);
        if (cancelled) return;
        setOrder(data as RestaurantOrder);
        setNotesDraft(data?.notes ?? "");
      } catch (err: any) {
        toast.error(err?.message ?? "No se pudo cargar la orden.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, isRestaurant]);

  const subtotal = useMemo(() => {
    if (!order) return 0;
    if (typeof order.subtotal === "number") return order.subtotal;
    const items = order.items ?? [];
    return items.reduce((acc, item) => acc + (item.quantity ?? 0) * (item.unitPrice ?? 0), 0);
  }, [order]);

  const tax = typeof order?.tax === "number" ? order.tax : 0;
  const serviceCharge = typeof order?.serviceCharge === "number" ? order.serviceCharge : 0;
  const total = typeof order?.total === "number" ? order.total : subtotal;

  const handleStatusChange = async (nextStatus: RestaurantOrderStatus) => {
    if (!order) return;
    setUpdating(true);
    try {
      const updated = await updateRestaurantOrder(order.id, { status: nextStatus });
      setOrder(updated as RestaurantOrder);
      toast.success("Estado actualizado.");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo actualizar el estado.");
    } finally {
      setUpdating(false);
    }
  };

  const handleNotesSave = async () => {
    if (!order) return;
    setUpdating(true);
    try {
      const updated = await updateRestaurantOrder(order.id, { notes: notesDraft });
      setOrder(updated as RestaurantOrder);
      toast.success("Notas actualizadas.");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo actualizar las notas.");
    } finally {
      setUpdating(false);
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

  if (loading || !order) {
    return (
      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {[...Array(3)].map((_, idx) => (
              <Card key={idx} className="border-white/10 bg-background/60">
                <CardHeader className="px-4 pt-4 pb-2">
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const items = order.items ?? [];

  return (
    <section className="py-6">
      <div className="container mx-auto px-4 space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Orden restaurante</p>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Orden #{order.id}
            </h1>
            <p className="text-sm text-muted-foreground">
              {TYPE_LABELS[order.orderType]} {order.table?.name ? `· ${order.table.name}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={STATUS_CLASSES[order.status]}>
              {STATUS_LABELS[order.status]}
            </Badge>
            <Button variant="outline" onClick={() => router.push("/dashboard/restaurant-orders")}>Volver</Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="border-white/10 bg-background/60">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardTitle>Detalle de la orden</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Estado</p>
                  <p className="font-semibold text-foreground">{STATUS_LABELS[order.status]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <p className="font-semibold text-foreground">{TYPE_LABELS[order.orderType]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mesa</p>
                  <p className="font-semibold text-foreground">
                    {order.table?.name ?? "-"}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <p className="text-sm font-semibold">Items</p>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin items.</p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div key={`${item.product?.name}-${idx}`} className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-foreground">{item.product?.name ?? "Producto"}</p>
                          <p className="text-xs text-muted-foreground">{item.quantity ?? 0} x S/. {(item.unitPrice ?? 0).toFixed(2)}</p>
                        </div>
                        <span className="font-semibold">S/. {((item.quantity ?? 0) * (item.unitPrice ?? 0)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal, "PEN")}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(total, "PEN")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-white/10 bg-background/60">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle>Acciones de flujo</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {FLOW_ACTIONS[order.status].length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay acciones disponibles.</p>
                ) : (
                  FLOW_ACTIONS[order.status].map((next) => (
                    <Button
                      key={next}
                      className="w-full"
                      variant={next === "CANCELLED" ? "destructive" : "default"}
                      disabled={updating}
                      onClick={() => handleStatusChange(next)}
                    >
                      {next === "CANCELLED" ? "Cancelar orden" : `Marcar como ${STATUS_LABELS[next]}`}
                    </Button>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-background/60">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle>Pagos y comprobante</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal, "PEN")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Impuestos</span>
                    <span>{formatCurrency(tax, "PEN")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Servicio</span>
                    <span>{formatCurrency(serviceCharge, "PEN")}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(total, "PEN")}</span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Venta vinculada</span>
                    <span className="font-semibold text-foreground">
                      {order.salesId ? `#${order.salesId}` : "Sin venta"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estado de pago</span>
                    <span className="font-semibold text-foreground">
                      {order.salesId ? "Registrado" : "Pendiente"}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={!order.salesId}
                    onClick={() => {
                      toast.message("Comprobante disponible desde la venta vinculada.");
                    }}
                  >
                    Ver comprobante
                  </Button>
                  <Button
                    className="w-full"
                    variant="default"
                    disabled={order.status !== "SERVED" || Boolean(order.salesId)}
                    onClick={() => {
                      toast.message("Cierra la orden para registrar el pago desde caja.");
                    }}
                  >
                    Registrar pago
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  El pago y comprobante se gestionan cuando la orden esta servida y cerrada.
                </p>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-background/60">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle>Notas de cocina</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <Textarea
                  value={notesDraft}
                  onChange={(event) => setNotesDraft(event.target.value)}
                  placeholder="Notas para cocina o salon"
                  className="min-h-[90px]"
                />
                <Button variant="outline" className="w-full" disabled={updating} onClick={handleNotesSave}>
                  Guardar notas
                </Button>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-background/60">
              <CardHeader className="px-4 pt-4 pb-2">
                <CardTitle>Historial de la orden</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4 text-sm">
                {computedHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>
                ) : (
                  <div className="space-y-4">
                    {computedHistory.map((event, index) => (
                      <div key={event.key} className="relative pl-6">
                        <span className="absolute left-[7px] top-2 h-full w-px bg-border/60" aria-hidden />
                        <span className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-background/80">
                          <span className="h-2 w-2 rounded-full bg-primary/70" />
                        </span>
                        <div className="rounded-2xl border border-border/60 bg-background/40 p-3 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-foreground">{event.label}</p>
                            <span className="text-xs text-muted-foreground">{formatTimestamp(event.timestamp)}</span>
                          </div>
                          {event.meta ? (
                            <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/30 p-2 text-[11px] text-muted-foreground">
                              {JSON.stringify(event.meta, null, 2)}
                            </pre>
                          ) : null}
                        </div>
                        {index === computedHistory.length - 1 ? (
                          <span className="absolute left-[7px] top-5 h-[calc(100%-1.25rem)] w-px bg-transparent" aria-hidden />
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
