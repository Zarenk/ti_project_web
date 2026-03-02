"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useVerticalConfig } from "@/hooks/use-vertical-config";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { useKitchenSocket } from "@/hooks/use-kitchen-socket";
import {
  getRestaurantOrder,
  updateRestaurantOrder,
  checkoutRestaurantOrder,
} from "@/app/dashboard/orders/orders.api";
import { getStores } from "@/app/dashboard/stores/stores.api";
import { pdf } from "@react-pdf/renderer";
import {
  RestaurantReceiptPdf,
  type RestaurantReceiptData,
} from "../components/RestaurantReceiptPdf";

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
  storeId?: number | null;
  openedAt?: string;
  closedAt?: string | null;
  total?: number | null;
  subtotal?: number | null;
  tax?: number | null;
  serviceCharge?: number | null;
  salesId?: number | null;
  notes?: string | null;
  table?: { name?: string | null; code?: string | null } | null;
  store?: { id: number; name: string; adress?: string | null } | null;
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
  OPEN: ["CANCELLED"],
  IN_PROGRESS: [],
  READY: [],
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

  // Checkout dialog state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [stores, setStores] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("-1");
  const [tipoComprobante, setTipoComprobante] = useState("BOLETA");
  const [servicePercent, setServicePercent] = useState("10");
  const [tipAmount, setTipAmount] = useState("0");

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
    ].filter(Boolean) as Array<{ key: string; label: string; timestamp: string | null; meta?: unknown }>;
  }, [order]);

  const formatTimestamp = (value: string | null | undefined) => {
    if (!value) return "Sin fecha";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "Sin fecha" : parsed.toLocaleString();
  };

  const loadOrder = useCallback(async () => {
    if (!isRestaurant || !id) return;
    setLoading(true);
    try {
      const data = await getRestaurantOrder(id as string);
      setOrder(data as RestaurantOrder);
      setNotesDraft(data?.notes ?? "");
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo cargar la orden.");
    } finally {
      setLoading(false);
    }
  }, [isRestaurant, id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // Real-time updates from kitchen
  useKitchenSocket({
    enabled: isRestaurant,
    onOrderUpdate: useCallback(
      (payload: { orderId: number; status: string; action: string }) => {
        if (payload.orderId === Number(id)) {
          void loadOrder();
        }
      },
      [loadOrder, id],
    ),
  });

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

  // Load stores for checkout
  useEffect(() => {
    if (!isRestaurant) return;
    getStores()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : data?.stores ?? [];
        setStores(list);
        if (list.length === 1) setSelectedStoreId(String(list[0].id));
      })
      .catch(() => {});
  }, [isRestaurant]);

  const checkoutSubtotal = useMemo(() => {
    if (!order) return 0;
    const items = order.items ?? [];
    return items.reduce((acc, item) => acc + (item.quantity ?? 0) * (item.unitPrice ?? 0), 0);
  }, [order]);

  const checkoutService = Number(servicePercent) > 0
    ? Number((checkoutSubtotal * Number(servicePercent) / 100).toFixed(2))
    : 0;
  const checkoutTip = Number(tipAmount) || 0;
  const checkoutTaxable = checkoutSubtotal + checkoutService;
  const checkoutIgv = Number((checkoutTaxable * 0.18).toFixed(2));
  const checkoutTotal = checkoutTaxable + checkoutTip;

  const handleCheckout = useCallback(async () => {
    if (!order || !selectedStoreId) {
      toast.error("Selecciona una tienda para procesar el pago.");
      return;
    }
    setCheckoutLoading(true);
    try {
      const result = await checkoutRestaurantOrder(order.id, {
        storeId: Number(selectedStoreId),
        tipoComprobante,
        tipoMoneda: "PEN",
        serviceChargePercent: Number(servicePercent),
        tip: checkoutTip,
        payments: [
          {
            paymentMethodId: Number(paymentMethod),
            amount: checkoutTotal,
            currency: "PEN",
          },
        ],
      });
      toast.success(`Pago registrado. Venta #${result.salesId}`);
      setCheckoutOpen(false);
      // Reload order to reflect CLOSED status + salesId
      const updated = await getRestaurantOrder(order.id);
      setOrder(updated as RestaurantOrder);
    } catch (err: any) {
      toast.error(err?.message ?? "Error al procesar el pago.");
    } finally {
      setCheckoutLoading(false);
    }
  }, [order, selectedStoreId, tipoComprobante, servicePercent, checkoutTip, paymentMethod, checkoutTotal]);

  const handlePrintReceipt = useCallback(async () => {
    if (!order) return;
    const PAYMENT_LABELS: Record<string, string> = {
      "-1": "Efectivo", "-2": "Transferencia", "-3": "Visa",
      "-4": "Yape", "-5": "Plin", "-6": "Otro",
    };
    const items = (order.items ?? []).map((i) => ({
      name: i.product?.name ?? "Producto",
      quantity: i.quantity ?? 1,
      unitPrice: i.unitPrice ?? 0,
      total: (i.quantity ?? 1) * (i.unitPrice ?? 0),
    }));
    const subtotal = order.subtotal ?? items.reduce((sum, i) => sum + i.total, 0);
    const service = order.serviceCharge ?? 0;
    const igv = order.tax ?? subtotal * 0.18;
    const total = order.total ?? (subtotal + service + igv);

    const orderStore = order.store;
    const fallbackStore = stores.find((s) => s.id === order.storeId);
    const receiptData: RestaurantReceiptData = {
      storeName: orderStore?.name ?? fallbackStore?.name ?? "Restaurante",
      storeAddress: orderStore?.adress ?? undefined,
      orderNumber: String(order.id),
      tableName: order.table?.name ?? undefined,
      orderType: order.orderType ?? "DINE_IN",
      dateTime: order.closedAt
        ? new Date(order.closedAt).toLocaleString()
        : new Date().toLocaleString(),
      items,
      subtotal,
      serviceCharge: service > 0 ? service : undefined,
      igv,
      total,
      paymentMethod: PAYMENT_LABELS[String(paymentMethod)] ?? "Efectivo",
      tipoComprobante: tipoComprobante,
      notes: order.notes ?? undefined,
    };

    try {
      const blob = await pdf(<RestaurantReceiptPdf data={receiptData} />).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error("Error al generar el recibo.");
      console.error(err);
    }
  }, [order, stores, paymentMethod, tipoComprobante]);

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
                    <Badge variant="outline" className={order.salesId ? "border-emerald-500/40 text-emerald-200 bg-emerald-500/10" : "border-amber-500/40 text-amber-200 bg-amber-500/10"}>
                      {order.salesId ? "Pagado" : "Pendiente"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 pt-1">
                  {order.salesId ? (
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => router.push(`/dashboard/sales`)}
                      >
                        Ver en ventas
                      </Button>
                      <Button
                        variant="secondary"
                        className="w-full"
                        onClick={handlePrintReceipt}
                      >
                        Imprimir recibo
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      variant="default"
                      disabled={order.status !== "SERVED" && order.status !== "READY"}
                      onClick={() => setCheckoutOpen(true)}
                    >
                      Cobrar orden
                    </Button>
                  )}
                </div>
                {!order.salesId && order.status !== "SERVED" && order.status !== "READY" && (
                  <p className="text-xs text-muted-foreground">
                    La orden debe estar en estado Servido o Listo para cobrar.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Checkout Dialog */}
            <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Cobrar Orden #{order.id}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Items summary */}
                  <div className="space-y-1 text-sm">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span>{item.quantity}x {item.product?.name}</span>
                        <span>S/. {((item.quantity ?? 0) * (item.unitPrice ?? 0)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Store selector */}
                  <div className="space-y-2">
                    <Label>Tienda / Caja</Label>
                    <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tienda" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment method */}
                  <div className="space-y-2">
                    <Label>Metodo de pago</Label>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2 rounded-md border p-2">
                        <RadioGroupItem value="-1" id="cash" />
                        <Label htmlFor="cash" className="cursor-pointer text-sm">Efectivo</Label>
                      </div>
                      <div className="flex items-center space-x-2 rounded-md border p-2">
                        <RadioGroupItem value="-3" id="card" />
                        <Label htmlFor="card" className="cursor-pointer text-sm">Tarjeta</Label>
                      </div>
                      <div className="flex items-center space-x-2 rounded-md border p-2">
                        <RadioGroupItem value="-4" id="yape" />
                        <Label htmlFor="yape" className="cursor-pointer text-sm">Yape</Label>
                      </div>
                      <div className="flex items-center space-x-2 rounded-md border p-2">
                        <RadioGroupItem value="-5" id="plin" />
                        <Label htmlFor="plin" className="cursor-pointer text-sm">Plin</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Document type */}
                  <div className="space-y-2">
                    <Label>Comprobante</Label>
                    <RadioGroup value={tipoComprobante} onValueChange={setTipoComprobante} className="flex gap-3">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="BOLETA" id="boleta" />
                        <Label htmlFor="boleta" className="cursor-pointer text-sm">Boleta</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="FACTURA" id="factura" />
                        <Label htmlFor="factura" className="cursor-pointer text-sm">Factura</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="SIN COMPROBANTE" id="sin" />
                        <Label htmlFor="sin" className="cursor-pointer text-sm">Sin comprobante</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Service charge & tip */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Servicio (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={servicePercent}
                        onChange={(e) => setServicePercent(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Propina (S/.)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={tipAmount}
                        onChange={(e) => setTipAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Totals */}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(checkoutSubtotal, "PEN")}</span>
                    </div>
                    {checkoutService > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Servicio ({servicePercent}%)</span>
                        <span>{formatCurrency(checkoutService, "PEN")}</span>
                      </div>
                    )}
                    {checkoutTip > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Propina</span>
                        <span>{formatCurrency(checkoutTip, "PEN")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-semibold pt-1">
                      <span>Total a cobrar</span>
                      <span>{formatCurrency(checkoutTotal, "PEN")}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    disabled={checkoutLoading || !selectedStoreId}
                    onClick={handleCheckout}
                  >
                    {checkoutLoading ? "Procesando..." : `Confirmar pago S/. ${checkoutTotal.toFixed(2)}`}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

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
