"use client"

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import Navbar from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getWebOrderByCode } from "@/app/dashboard/sales/sales.api";
import { getProduct } from "@/app/dashboard/products/products.api";
import { ArrowLeft, Loader2 } from "lucide-react";
import OrderTimeline from "@/components/order-timeline";
import { Button } from "@/components/ui/button";
import { resolveImageUrl } from "@/lib/images";

interface TrackingEvent {
  id: number;
  status: string;
  description?: string | null;
  createdAt: string;
}

interface ProductItem {
  id: number | string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  image?: string | null;
}

interface OrderDetail {
  productId: number | string;
  name: string;
  quantity: number;
  price: number;
}

interface OrderPayload {
  details: OrderDetail[];
  [key: string]: unknown;
}

interface OrderData {
  code: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  payload: OrderPayload;
}

export default function TrackOrderDetailsPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const orderData = (await getWebOrderByCode(id)) as OrderData;
        setOrder(orderData);
        const payload = orderData.payload;
        if (payload?.details) {
          const list = await Promise.all(
            payload.details.map(async (detail: OrderDetail) => {
              let image: string | null = null;
              try {
                const p = await getProduct(String(detail.productId));
                image = Array.isArray(p.images) && p.images.length > 0 ? resolveImageUrl(p.images[0]) : null;
              } catch (err) {
                console.error("Error fetching product", detail.productId, err);
              }
              return {
                id: detail.productId,
                name: detail.name,
                quantity: detail.quantity,
                unitPrice: detail.price,
                subtotal: detail.quantity * detail.price,
                image,
              } as ProductItem;
            })
          );
          setProducts(list);
        }

        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
        // Backend has a global '/api' prefix; include it here
        const res = await fetch(
          `${backendUrl}/api/orders/${encodeURIComponent(id)}/tracking`
        );
        if (res.ok) {
          const trackingData = await res.json();
          setEvents(trackingData as TrackingEvent[]);
        }
      } catch (err) {
        console.error("Error fetching order", err);
      }
    }
    fetchData();
  }, [id]);

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-900 dark:to-slate-950">
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Cargando pedido...</span>
          </div>
          <div className="mt-6 h-2 w-32 rounded bg-gradient-to-r from-slate-200 to-sky-200 dark:from-slate-700 dark:to-sky-700 animate-pulse" />
        </div>
      </div>
    );
  }

  const normalizedStatus = order.status?.toLowerCase();
  const orderLabel = order.code ? `El pedido ${order.code}` : id ? `El pedido ${id}` : "El pedido";
  const statusText =
    normalizedStatus === "cancelado" || normalizedStatus === "anulado"
      ? "El Pedido ha sido cancelado, si requiere mayor información comuníquese con nosotros para mayor detalle."
      : normalizedStatus === "pendiente"
        ? "El Pedido sigue en procesado."
        : normalizedStatus === "completado"
          ? "El pedido se ha completado correctamente."
          : normalizedStatus === "pending"
            ? `${orderLabel} se encuentra PENDIENTE.`
            : normalizedStatus === "completed"
              ? `${orderLabel} se encuentra COMPLETADO.`
              : normalizedStatus === "denied"
                ? `${orderLabel} ha sido RECHAZADO.`
                : order.status ?? "";
  const orderDate = new Date(order.createdAt).toLocaleDateString("es-ES");
  const lastUpdate = events.length
    ? new Date(events[events.length - 1].createdAt).toLocaleDateString("es-ES")
    : new Date(order.updatedAt || order.createdAt).toLocaleDateString("es-ES");

  const subtotal = products.reduce((s, p) => s + p.subtotal, 0);

  const orderPayload: any = order.payload || {};
  const orderRecord: any = order || {};
  const shippingMethodValue =
    typeof orderPayload.shippingMethod === 'string' ? orderPayload.shippingMethod : '';
  const normalizedShippingMethod = shippingMethodValue
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
  let shippingMethodLabel = shippingMethodValue || '-';
  let estimatedDelivery = orderPayload.estimatedDelivery ?? '-';
  if (normalizedShippingMethod === 'PICKUP' || normalizedShippingMethod === 'RECOJO EN TIENDA') {
    shippingMethodLabel = 'RECOJO EN TIENDA';
    estimatedDelivery = 'Inmediata';
  } else if (
    normalizedShippingMethod === 'DELIVERY' ||
    normalizedShippingMethod === 'ENVIO A DOMICILIO'
  ) {
    shippingMethodLabel =
      normalizedShippingMethod === 'DELIVERY' ? 'DELIVERY' : 'ENVIO A DOMICILIO';
    estimatedDelivery = 'entre 24 a 72 horas';
  }
  const shippingName = orderRecord.shippingName ?? orderPayload.shippingName ?? '';
  const shippingAddressParts = [
    orderRecord.shippingAddress ?? orderPayload.shippingAddress ?? '',
    orderRecord.city ?? orderPayload.city ?? '',
    orderRecord.postalCode ?? orderPayload.postalCode ?? '',
  ].filter(Boolean);
  const carrierName = orderRecord.carrierName ?? '';
  const carrierId = orderRecord.carrierId ?? '';
  const carrierModeRaw = orderRecord.carrierMode ?? '';
  const carrierModeNormalized = carrierModeRaw
    ? carrierModeRaw
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase()
    : '';
  let carrierModeLabel = '';
  if (
    carrierModeNormalized === 'HOME_DELIVERY' ||
    carrierModeNormalized === 'DELIVERY' ||
    carrierModeNormalized === 'ENTREGA A DOMICILIO'
  ) {
    carrierModeLabel = 'Entrega a domicilio';
  } else if (
    carrierModeNormalized === 'AGENCY_PICKUP' ||
    carrierModeNormalized === 'PICKUP' ||
    carrierModeNormalized === 'RETIRO EN AGENCIA' ||
    carrierModeNormalized === 'AGENCIA'
  ) {
    carrierModeLabel = 'Retiro en agencia';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-900 dark:to-slate-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/track-order" className="inline-flex items-center">
            <Button variant="outline" className="shadow-sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver a buscar pedido
            </Button>
          </Link>
        </div>
        {/* Timeline */}
        <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0 mb-6">
          <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4">
            <CardTitle className="text-blue-900 dark:text-blue-100">Estado del Pedido</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {events.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {statusText || "No hay actualizaciones disponibles."}
              </p>
            ) : (
              <OrderTimeline events={events} />
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0 mb-6">
          <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4">
            <CardTitle className="text-blue-900 dark:text-blue-100">
              Resumen del Pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Numero de Pedido
              </p>
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                #{order.code}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Estado Actual
              </p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {statusText}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Fecha de Creacion
              </p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {orderDate}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Ultima Actualizacion
              </p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {lastUpdate}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0 mb-6">
          <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4">
            <CardTitle className="text-blue-900 dark:text-blue-100">Detalles de EnvÃ­o</CardTitle>
          </CardHeader>
          <CardContent className="p-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Destinatario</p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">{shippingName || 'â€”'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Metodo de Envi­o</p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">{shippingMethodLabel}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Direccion</p>
              <p className="text-slate-700 dark:text-slate-300">
                {shippingAddressParts.length > 0 ? shippingAddressParts.join(', ') : 'â€”'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Entrega Estimada</p>
              <p className="font-semibold text-sky-600 dark:text-sky-400">{estimatedDelivery}</p>
            </div>
            {(carrierName || carrierModeLabel) && (
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Transportista</p>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  {carrierName || 'â€”'}
                  {carrierId && carrierName && (
                    <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">ID: {carrierId}</span>
                  )}
                </p>
                {carrierModeLabel && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{carrierModeLabel}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products */}
        <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0">
          <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4">
            <CardTitle className="text-blue-900 dark:text-blue-100">
              Productos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-blue-50 dark:bg-blue-900/50">
                  <TableHead className="text-blue-900 dark:text-blue-100">Producto</TableHead>
                  <TableHead className="text-blue-900 dark:text-blue-100">Cantidad</TableHead>
                  <TableHead className="text-blue-900 dark:text-blue-100">Precio Unitario</TableHead>
                  <TableHead className="text-blue-900 dark:text-blue-100">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-800/50">
                    <TableCell className="flex items-center gap-2">
                      <Image
                        src={p.image || "/placeholder.svg"}
                        alt={p.name}
                        width={40}
                        height={40}
                        className="rounded-md object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {p.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">
                      {p.quantity}
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">
                      S/. {p.unitPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-semibold text-blue-900 dark:text-blue-100">
                      S/. {p.subtotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-600 dark:text-slate-400">
                      No hay productos
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex justify-end mt-4">
              <span className="font-bold text-blue-900 dark:text-blue-100">
                Total: S/. {subtotal.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}





