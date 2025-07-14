import { ArrowLeft, Calendar, MapPin, Package, Truck, User } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function OrderDetails() {
  const orderData = {
    orderNumber: "12345",
    orderDate: "15 de Enero, 2024",
    status: "Completado",
    customer: {
      name: "María González Rodríguez",
      email: "maria.gonzalez@email.com",
      phone: "+34 612 345 678",
    },
    shipping: {
      address: "Calle Mayor 123, 4º B\n28013 Madrid, España",
      method: "Envío Express",
      estimatedDelivery: "17 de Enero, 2024",
    },
    products: [
      {
        id: 1,
        name: "iPhone 15 Pro 128GB Titanio Natural",
        image: "/placeholder.svg?height=80&width=80",
        quantity: 1,
        unitPrice: 1199.0,
        subtotal: 1199.0,
      },
      {
        id: 2,
        name: "AirPods Pro (2ª generación)",
        image: "/placeholder.svg?height=80&width=80",
        quantity: 1,
        unitPrice: 279.0,
        subtotal: 279.0,
      },
      {
        id: 3,
        name: "Funda MagSafe para iPhone 15 Pro",
        image: "/placeholder.svg?height=80&width=80",
        quantity: 2,
        unitPrice: 59.0,
        subtotal: 118.0,
      },
    ],
    summary: {
      subtotal: 1596.0,
      shipping: 9.99,
      discount: 50.0,
      total: 1555.99,
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" className="mb-4 text-blue-900 hover:text-blue-700 hover:bg-blue-50">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Mis Pedidos
          </Button>
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Detalle del Pedido</h1>
          <p className="text-slate-600">Revisa los detalles de tu compra completada</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Order Info & Customer Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Information */}
            <Card className="border-blue-100 shadow-sm">
              <CardHeader className="bg-blue-50 border-b border-blue-100">
                <CardTitle className="flex items-center text-blue-900">
                  <Package className="w-5 h-5 mr-2" />
                  Información del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Número de Pedido</p>
                    <p className="font-semibold text-blue-900">#{orderData.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Fecha del Pedido</p>
                    <p className="font-semibold text-slate-700 flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {orderData.orderDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">Estado</p>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{orderData.status}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Details */}
            <Card className="border-blue-100 shadow-sm">
              <CardHeader className="bg-blue-50 border-b border-blue-100">
                <CardTitle className="flex items-center text-blue-900">
                  <User className="w-5 h-5 mr-2" />
                  Datos del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Nombre</p>
                    <p className="font-semibold text-slate-700">{orderData.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Email</p>
                    <p className="text-slate-700">{orderData.customer.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Teléfono</p>
                    <p className="text-slate-700">{orderData.customer.phone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Details */}
            <Card className="border-blue-100 shadow-sm">
              <CardHeader className="bg-blue-50 border-b border-blue-100">
                <CardTitle className="flex items-center text-blue-900">
                  <Truck className="w-5 h-5 mr-2" />
                  Detalles de Envío
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-2">Dirección de Envío</p>
                    <div className="flex items-start">
                      <MapPin className="w-4 h-4 mr-2 mt-1 text-slate-400" />
                      <p className="text-slate-700 whitespace-pre-line">{orderData.shipping.address}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Método de Envío</p>
                      <p className="font-semibold text-slate-700">{orderData.shipping.method}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Entrega Estimada</p>
                      <p className="font-semibold text-sky-600">{orderData.shipping.estimatedDelivery}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product List */}
            <Card className="border-blue-100 shadow-sm">
              <CardHeader className="bg-blue-50 border-b border-blue-100">
                <CardTitle className="text-blue-900">Productos Pedidos</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {orderData.products.map((product, index) => (
                    <div key={product.id}>
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <Image
                            src={product.image || "/placeholder.svg"}
                            alt={product.name}
                            width={80}
                            height={80}
                            className="rounded-lg border border-slate-200 object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 mb-1">{product.name}</h3>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Cantidad: {product.quantity}</span>
                            <span className="text-slate-500">€{product.unitPrice.toFixed(2)} c/u</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-900">€{product.subtotal.toFixed(2)}</p>
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
            <Card className="border-blue-100 shadow-sm sticky top-8">
              <CardHeader className="bg-blue-50 border-b border-blue-100">
                <CardTitle className="text-blue-900">Resumen del Pedido</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="font-semibold">€{orderData.summary.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Envío</span>
                    <span className="font-semibold">€{orderData.summary.shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>Descuento</span>
                    <span className="font-semibold">-€{orderData.summary.discount.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold text-blue-900">
                    <span>Total</span>
                    <span>€{orderData.summary.total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <Button asChild className="w-full bg-blue-900 hover:bg-blue-800 text-white">
                    <Link href="/mis-pedidos">Volver a Mis Pedidos</Link>
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