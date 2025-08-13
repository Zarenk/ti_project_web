"use client"

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

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
  const code = Array.isArray(params.code) ? params.code[0] : params.code;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!code) return;
      try {
        const orderData = (await getWebOrderByCode(code)) as OrderData;
        setOrder(orderData);
        const payload = orderData.payload;
        if (payload?.details) {
          const list = await Promise.all(
            payload.details.map(async (detail: OrderDetail) => {
              let image: string | null = null;
              try {
                const p = await getProduct(String(detail.productId));
                image = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null;
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
        const res = await fetch(
          `${backendUrl}/orders/${encodeURIComponent(code)}/tracking`
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
  }, [code]);

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-900 dark:to-slate-950">
        <Navbar />
        <div className="container mx-auto px-4 py-8">Cargando...</div>
      </div>
    );
  }

  const statusText = order.status === "PENDING" ? "Pendiente" : "Completado";
  const orderDate = new Date(order.createdAt).toLocaleDateString("es-ES");
  const lastUpdate = events.length
    ? new Date(events[events.length - 1].createdAt).toLocaleDateString("es-ES")
    : new Date(order.updatedAt || order.createdAt).toLocaleDateString("es-ES");

  const subtotal = products.reduce((s, p) => s + p.subtotal, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-900 dark:to-slate-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Timeline */}
        <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0 mb-6">
          <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4">
            <CardTitle className="text-blue-900 dark:text-blue-100">Estado del Pedido</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {events.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No hay actualizaciones disponibles.
              </p>
            ) : (
              <ol className="relative border-l border-slate-200 dark:border-slate-700">
                {events.map((ev) => (
                  <li key={ev.id} className="mb-10 ml-4">
                    <div className="absolute w-3 h-3 bg-blue-400 rounded-full -left-1.5 border border-white dark:border-slate-900"></div>
                    <time className="mb-1 text-sm font-normal leading-none text-slate-500 dark:text-slate-400">
                      {new Date(ev.createdAt).toLocaleString("es-ES")}
                    </time>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {ev.status}
                    </h3>
                    {ev.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {ev.description}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
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
                Número de Pedido
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
                Fecha de Creación
              </p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {orderDate}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Última Actualización
              </p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                {lastUpdate}
              </p>
            </div>
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
