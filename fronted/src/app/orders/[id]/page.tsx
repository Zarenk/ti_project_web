"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

import { ArrowLeft, Calendar, MapPin, Package, Truck, User } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Navbar from "@/components/navbar"
import { getWebSaleById } from "@/app/dashboard/sales/sales.api"

export default function OrderDetails() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const [order, setOrder] = useState<any | null>(null)

  useEffect(() => {
    async function fetchOrder() {
      try {
        const data = await getWebSaleById(id as string)
        setOrder(data)
      } catch (error) {
        console.error("Error al obtener la orden:", error)
      }
    }
    if (id) fetchOrder()
  }, [id])

  if (!order) {
    return <div className="p-6">Cargando...</div>
  }

  const products = order.salesDetails.map((detail: any) => ({
    id: detail.productId,
    name: detail.entryDetail.product.name,
    image: detail.entryDetail.product.images?.[0] ?? "/placeholder.svg",
    quantity: detail.quantity,
    unitPrice: detail.price,
    subtotal: detail.quantity * detail.price,
  }))

  const subtotal = products.reduce((s: number, p: any) => s + p.subtotal, 0)

  const orderData = {
    orderNumber: order.invoices[0]
      ? `${order.invoices[0].serie}-${order.invoices[0].nroCorrelativo}`
      : order.order?.code,
    orderDate: new Date(order.createdAt).toLocaleDateString("es-ES"),
    status: "Completado",
    customer: {
      name: order.client.name,
      email: order.client.email ?? "",
      phone: order.client.phone ?? "",
    },
    shipping: {
      name: order.order?.shippingName ?? `${order.client.name}`,
      address: order.order?.shippingAddress ?? order.client.adress ?? "",
      method: "-",
      estimatedDelivery: "-",
    },
    products,
    summary: {
        subtotal,
      shipping: 0,
      discount: 0,
      total: order.total,
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-900 dark:to-slate-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4 text-blue-900 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:text-blue-100 dark:hover:bg-blue-800"
          >
            <Link href="/users" className="flex items-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Mis Pedidos
            </Link>
          </Button>
          <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-200 mb-2">Detalle del Pedido</h1>
          <p className="text-slate-600 dark:text-slate-300">Revisa los detalles de tu compra completada</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Order Info & Customer Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Information */}
            <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0">
              <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4">
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
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200">{orderData.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Details */}
            <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0">
              <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4">
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

            {/* Shipping Details */}
            <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0">
              <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4">
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

            {/* Product List */}
            <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0">
              <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4">
                <CardTitle className="text-blue-900 dark:text-blue-100">Productos Pedidos</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {orderData.products.map((product:any, index:any) => (
                    <div key={product.id}>
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Image
                            src={product.image || "/placeholder.svg"}
                            alt={product.name}
                            width={80}
                            height={80}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{product.name}</h3>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500 dark:text-slate-400">Cantidad: {product.quantity}</span>
                            <span className="text-slate-500 dark:text-slate-400">S/. {product.unitPrice.toFixed(2)} c/u</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-900 dark:text-blue-100">S/. {product.subtotal.toFixed(2)}</p>
                        </div>
                      </div>
                      {index < orderData.products.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="border-blue-100 dark:border-blue-700 shadow-sm sticky top-8 pt-0">
              <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4">
                <CardTitle className="text-blue-900 dark:text-blue-100">Resumen del Pedido</CardTitle>
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

                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <Button asChild className="w-full bg-blue-900 hover:bg-blue-800 text-white dark:bg-blue-700 dark:hover:bg-blue-600">
                    <Link href="/users">Volver a Mis Pedidos</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}