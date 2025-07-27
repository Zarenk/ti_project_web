"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Package,
  Truck,
  User,
  FileText,
  ShoppingCart,
  Receipt,
  Clipboard,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getWebOrderById, getWebSaleById, completeWebOrder, rejectWebOrder, sendInvoiceToSunat } from "@/app/dashboard/sales/sales.api";
import { getProduct } from "@/app/dashboard/products/products.api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { InvoiceDocument } from "@/app/dashboard/sales/components/pdf/InvoiceDocument";
import { numeroALetrasCustom } from "@/app/dashboard/sales/components/utils/numeros-a-letras";
import QRCode from "qrcode";
import { pdf } from "@react-pdf/renderer";
import { uploadPdfToServer } from "@/lib/utils";
import { getUserDataFromToken, isTokenValid } from "@/lib/auth";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [order, setOrder] = useState<any | null>(null);
  const [sale, setSale] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [openComplete, setOpenComplete] = useState(false);
  const [openReject, setOpenReject] = useState(false);
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

  useEffect(() => {
    async function fetchData() {
      const user = await getUserDataFromToken();
      if (!user || !(await isTokenValid()) || user.role !== "ADMIN") {
        router.replace("/unauthorized");
        return;
      }
      try {
        const ord = await getWebOrderById(id as string);
        setOrder(ord);
        if (ord.salesId) {
          try {
            const saleData = await getWebSaleById(ord.salesId);
            setSale(saleData);
          } catch (err) {
            console.error("Error fetching sale", err);
          }
        }
      } catch (err) {
        console.error("Error fetching order", err);
      }
    }
    if (id) fetchData();
  }, [id, router]);

  useEffect(() => {
    async function fetchProducts() {
      let details: any[] = [];
      if (sale) {
        details = sale.salesDetails.map((d: any) => ({
          productId: d.productId,
          name: d.entryDetail.product.name,
          quantity: d.quantity,
          price: d.price,
        }));
      } else if (order) {
        const payload = (order.payload as any) || {};
        details = Array.isArray(payload.details) ? payload.details : [];
      }
      const list = await Promise.all(
        details.map(async (detail: any) => {
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
          };
        })
      );
      setProducts(list);
    }
    fetchProducts();
  }, [order, sale]);

  if (!order) {
    return <div className="p-6">Cargando...</div>;
  }

  const payload = (order.payload as any) || {};

  const subtotal = products.reduce((s, p) => s + p.subtotal, 0);

  const statusText =
    order.status === "PENDING"
      ? "Pendiente"
      : order.status === "DENIED"
      ? "Denegado"
      : "Completado";
  const statusColor =
    order.status === "PENDING"
      ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200"
      : order.status === "DENIED"
      ? "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-200"
      : "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200";

  const payments = Array.isArray(payload.payments) ? payload.payments : [];
  const paymentMethodMap: Record<number, string> = {
    [-1]: "EN EFECTIVO",
    [-2]: "TRANSFERENCIA",
    [-3]: "PAGO CON VISA",
    [-4]: "YAPE",
    [-5]: "PLIN",
    [-6]: "OTRO MEDIO DE PAGO",
  };

  const orderData = {
    orderNumber: order.code,
    orderDate: new Date(order.createdAt).toLocaleString("es-ES"),
    status: statusText,
    customer: {
      name: payload.firstName ? `${payload.firstName} ${payload.lastName}` : "",
      email: payload.email ?? "",
      phone: payload.phone ?? "",
      dni: payload.personalDni ?? "",
    },
    billing: {
      type: payload.tipoComprobante ?? "",
      dni: payload.dni ?? "",
      name: payload.invoiceName ?? "",
      ruc: payload.ruc ?? "",
      razonSocial: payload.razonSocial ?? "",
      address: payload.invoiceAddress ?? "",
    },
    shipping: {
      name: order.shippingName,
      address: order.shippingAddress,
      method: payload.shippingMethod ?? "-",
      estimatedDelivery: payload.estimatedDelivery ?? "-",
    },
    payments: payments.map((p: any) => ({
      method: paymentMethodMap[p.paymentMethodId] || `Método ${p.paymentMethodId}`,
      amount: p.amount,
    })),
    products,
    summary: {
      subtotal,
      shipping: 0,
      discount: 0,
      total: payload.total ?? sale?.total ?? 0,
    },
    proofImages: Array.isArray(payload.proofImages) ? payload.proofImages : [],
    proofDescription: payload.proofDescription ?? "",
  };

  const totalPaid = orderData.payments.reduce(
    (sum: number, p: any) => sum + Number(p.amount),
    0
  );

  const invoice =
    sale && Array.isArray(sale.invoices) && sale.invoices.length > 0
      ? sale.invoices[0]
      : null;

  const invoiceData = invoice
    ? {
        type: invoice.tipoComprobante,
        serie: invoice.serie,
        number: invoice.nroCorrelativo,
        date: invoice.fechaEmision,
        total: invoice.total ?? sale?.total ?? 0,
      }
    : null;

  const invoicePdfUrl = invoiceData
    ? `${BACKEND_URL}/api/sunat/pdf/${
        invoiceData.type.toLowerCase() === 'boleta' ? 'boleta' : 'factura'
      }/20519857538-${
        invoiceData.type.toLowerCase() === 'boleta' ? '03' : '01'
      }-${invoiceData.serie}-${invoiceData.number}.pdf`
    : null;  

  return (
    <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <Link href="/dashboard/orders" className="flex items-center">
            <Button variant="outline" className="shadow-sm mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Órdenes
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-200 mb-2">
            Detalle de la Orden <span className="text-xl font-normal ml-2">#{orderData.orderNumber}</span>
          </h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0">
              <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4 items-center">
                <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
                  <Package className="w-5 h-5 mr-2" />
                  Información del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Número de Pedido</p>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">#{orderData.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Fecha del Pedido</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {orderData.orderDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Estado</p>
                    <Badge className={statusColor}>{orderData.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0">
              <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4 items-center">
                <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
                  <User className="w-5 h-5 mr-2" />
                  Datos del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nombre</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">{orderData.customer.name}</p>
                  </div>
                  {orderData.customer.dni && (
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">DNI</p>
                      <p className="text-slate-700 dark:text-slate-300">{orderData.customer.dni}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Email</p>
                    <p className="text-slate-700 dark:text-slate-300">{orderData.customer.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Teléfono</p>
                    <p className="text-slate-700 dark:text-slate-300">{orderData.customer.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0">
              <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4 items-center">
                <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
                  <FileText className="w-5 h-5 mr-2" />
                  Datos de Facturación
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tipo de Comprobante</p>
                    <p className="text-slate-700 dark:text-slate-300 font-semibold">{orderData.billing.type}</p>
                  </div>
                  {orderData.billing.type === "BOLETA" && (
                    <>
                      {orderData.billing.dni && (
                        <div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">DNI</p>
                          <p className="text-slate-700 dark:text-slate-300">{orderData.billing.dni}</p>
                        </div>
                      )}
                      {orderData.billing.name && (
                        <div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nombre Completo</p>
                          <p className="text-slate-700 dark:text-slate-300">{orderData.billing.name}</p>
                        </div>
                      )}
                    </>
                  )}
                  {orderData.billing.type === "FACTURA" && (
                    <>
                      {orderData.billing.ruc && (
                        <div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">RUC</p>
                          <p className="text-slate-700 dark:text-slate-300">{orderData.billing.ruc}</p>
                        </div>
                      )}
                      {orderData.billing.razonSocial && (
                        <div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Razón Social</p>
                          <p className="text-slate-700 dark:text-slate-300">{orderData.billing.razonSocial}</p>
                        </div>
                      )}
                      {orderData.billing.address && (
                        <div>
                          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Dirección</p>
                          <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">{orderData.billing.address}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0">
              <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4 items-center">
                <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
                  <Truck className="w-5 h-5 mr-2" />
                  Detalles de Envío
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Dirección de Envío</p>
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 mr-2 mt-1 text-slate-400 dark:text-slate-500" />
                      <div>
                        <p className="font-semibold">{orderData.shipping.name}</p>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">{orderData.shipping.address}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Método de Envío</p>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">{orderData.shipping.method}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Entrega Estimada</p>
                      <p className="font-semibold text-sky-600 dark:text-sky-400">{orderData.shipping.estimatedDelivery}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0">
              <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4 items-center">
                <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Productos Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {products.map((product: any, index: number) => (
                    <div key={product.id}>
                      <div className="flex items-center gap-4">
                        {product.image && (
                          <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded-md border" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                            {product.name || `Producto ${product.id}`}
                          </h3>
                          <div className="text-sm text-slate-500 dark:text-slate-400">Cantidad: {product.quantity}</div>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm text-slate-500 dark:text-slate-400">S/. {product.unitPrice.toFixed(2)} c/u</p>
                          <p className="font-bold text-blue-900 dark:text-blue-100">S/. {product.subtotal.toFixed(2)}</p>
                        </div>
                      </div>
                      {index < products.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0">
              <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4 items-center">
                <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
                  <Receipt className="w-5 h-5 mr-2" />
                  Comprobante de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {orderData.proofImages.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {orderData.proofImages.map((url: string, idx: number) => {
                      const imgUrl = url.startsWith("http")
                        ? url
                        : `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`;
                      return (
                        <img key={idx} src={imgUrl} alt={`Comprobante ${idx + 1}`} className="w-20 h-20 object-cover rounded" />
                      );
                    })}
                  </div>
                )}
                {orderData.proofDescription && (
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                    {orderData.proofDescription}
                  </p>
                )}
                {orderData.payments.length > 0 && (
                  <div className="space-y-2">
                    {orderData.payments.map((p: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm text-slate-700 dark:text-slate-300"
                      >
                        <span className="flex items-center">
                          <Banknote className="w-4 h-4 mr-1" />
                          {p.method}
                        </span>
                        <span>S/. {Number(p.amount).toFixed(2)}</span>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Pagado</span>
                      <span>S/. {totalPaid.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                {orderData.payments.length === 0 &&
                  orderData.proofImages.length === 0 &&
                  !orderData.proofDescription && (
                    <p className="text-sm text-slate-500">
                      No se proporcionó comprobante de pago.
                    </p>
                )}
              </CardContent>
            </Card>

            {invoiceData && (
              <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0">
                <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4 items-center">
                  <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
                    <FileText className="w-5 h-5 mr-2" />
                    Comprobante Emitido
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tipo</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">{invoiceData.type}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Serie</p>
                    <p className="text-slate-700 dark:text-slate-300">{invoiceData.serie}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Número</p>
                    <p className="text-slate-700 dark:text-slate-300">{invoiceData.number}</p>
                  </div>
                  {invoiceData.date && (
                    <div>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Fecha de Emisión</p>
                      <p className="text-slate-700 dark:text-slate-300">
                        {new Date(invoiceData.date).toLocaleString('es-ES')}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      S/. {Number(invoiceData.total).toFixed(2)}
                    </p>
                  </div>
                  {invoicePdfUrl && (
                    <a
                      href={invoicePdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      Descargar PDF
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <Card className="border-blue-100 dark:border-blue-700 shadow-sm sticky top-8 pt-0">
              <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4 items-center">
                <CardTitle className="flex items-center text-blue-900 dark:text-blue-100">
                  <Clipboard className="w-5 h-5 mr-2" />
                  Resumen del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                    <span className="font-semibold">S/. {orderData.summary.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Envío</span>
                    <span className="font-semibold">S/. {orderData.summary.shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Descuento</span>
                    <span className="font-semibold">-S/. {orderData.summary.discount.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold text-blue-900 dark:text-blue-100">
                    <span>Total</span>
                    <span>S/.{orderData.summary.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  {order.status === "PENDING" && (
                    <div className="flex flex-col gap-2">
                      <Button
                        className="w-full bg-green-700 hover:bg-green-800 text-white"
                        onClick={() => setOpenComplete(true)}
                      >
                        Completar Orden
                      </Button>
                      <Button
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => setOpenReject(true)}
                      >
                        Denegar Orden
                      </Button>
                    </div>
                  )}

                  <AlertDialog open={openComplete} onOpenChange={setOpenComplete}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Deseas completar esta orden?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Confirma que el cliente realizó el depósito o envió la información de pago necesaria.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              const createdSale = await completeWebOrder(order.id);
                              toast.success("Orden completada");

                              const invoice =
                                createdSale && Array.isArray(createdSale.invoices) && createdSale.invoices.length > 0
                                  ? createdSale.invoices[0]
                                  : null;

                              if (invoice) {
                                const invoicePayload = {
                                  saleId: createdSale.id,
                                  serie: invoice.serie,
                                  correlativo: invoice.nroCorrelativo,
                                  documentType:
                                    invoice.tipoComprobante === "FACTURA" ? "invoice" : "boleta",
                                  tipoMoneda: invoice.tipoMoneda ?? "PEN",
                                  total: invoice.total ?? createdSale.total,
                                  fechaEmision: invoice.fechaEmision,
                                  cliente: {
                                    razonSocial: createdSale.client?.name ?? "",
                                    ruc: createdSale.client?.typeNumber ?? "",
                                    dni: createdSale.client?.typeNumber ?? "",
                                    nombre: createdSale.client?.name ?? "",
                                    tipoDocumento: createdSale.client?.type ?? "",
                                  },
                                  emisor: {
                                    razonSocial: createdSale.store?.name ?? "",
                                    adress: createdSale.store?.adress ?? "",
                                    ruc: 20519857538,
                                  },
                                  items: createdSale.salesDetails.map((d: any) => ({
                                    cantidad: d.quantity,
                                    descripcion: d.entryDetail.product.name,
                                    series: d.series ?? [],
                                    precioUnitario: Number(d.price),
                                    subtotal: Number((d.price * d.quantity) / 1.18),
                                    igv: Number(d.price * d.quantity - (d.price * d.quantity) / 1.18),
                                    total: Number(d.price * d.quantity),
                                  })),
                                } as any;

                                const sunatResp = await sendInvoiceToSunat(invoicePayload);
                                const totalTexto = numeroALetrasCustom(invoicePayload.total, invoicePayload.tipoMoneda);
                                const qrData = `Representación impresa de la ${invoicePayload.documentType.toUpperCase()} ELECTRÓNICA\nN° ${invoicePayload.serie}-${invoicePayload.correlativo}`;
                                const qrCode = await QRCode.toDataURL(qrData);
                                const blob = await pdf(
                                  <InvoiceDocument
                                    data={invoicePayload}
                                    qrCode={qrCode}
                                    importeEnLetras={totalTexto}
                                  />
                                ).toBlob();
                                await uploadPdfToServer({
                                  blob,
                                  ruc: 20519857538,
                                  tipoComprobante: invoicePayload.documentType,
                                  serie: invoicePayload.serie,
                                  correlativo: invoicePayload.correlativo,
                                });

                                if (
                                  sunatResp.message &&
                                  sunatResp.message.toLowerCase().includes("exitosamente")
                                ) {
                                  toast.success("Factura enviada a la SUNAT correctamente.");
                                } else if (sunatResp.message) {
                                  toast.error(`Error al enviar la factura a la SUNAT: ${sunatResp.message}`);
                                } else {
                                  toast.error("Error desconocido al enviar la factura a la SUNAT.");
                                }
                              }
                              router.push("/dashboard/orders");
                            } catch {
                              toast.error("Error al completar la orden");
                            } finally {
                              setOpenComplete(false);
                            }
                          }}
                        >
                          Confirmar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog open={openReject} onOpenChange={setOpenReject}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Denegar esta orden?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Marca la orden como denegada por falta de información.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={async () => {
                            try {
                              await rejectWebOrder(order.id);
                              toast.success("Orden denegada");
                              router.push("/dashboard/orders");
                            } catch {
                              toast.error("Error al denegar la orden");
                            } finally {
                              setOpenReject(false);
                            }
                          }}
                        >
                          Confirmar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button asChild className="w-full bg-blue-900 hover:bg-blue-800 text-white dark:bg-blue-700 dark:hover:bg-blue-600">
                    <Link href="/dashboard/orders">Volver a Órdenes</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
