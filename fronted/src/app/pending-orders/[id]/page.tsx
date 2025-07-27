"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

import { ArrowLeft, Calendar, MapPin, Package, Truck, User, FileText } from "lucide-react"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import Navbar from "@/components/navbar"
import { getWebOrderById, uploadOrderProofs } from "@/app/dashboard/sales/sales.api"
import { getProduct } from "@/app/dashboard/products/products.api"
import { toast } from "sonner"

export default function OrderDetails() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const [order, setOrder] = useState<any | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [files, setFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviewUrls(urls)
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [files])

  useEffect(() => {
    async function fetchOrder() {
      try {
        const data = await getWebOrderById(id as string)
        setOrder(data)
      } catch (error) {
        console.error("Error al obtener la orden:", error)
      }
    }
    if (id) fetchOrder()
  }, [id])

  useEffect(() => {
    async function fetchProducts() {
      if (!order) return
      const payload = order.payload as any
      const list = await Promise.all(
        payload.details.map(async (detail: any) => {
          let image: string | null = null
          try {
            const p = await getProduct(String(detail.productId))
            image = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null
          } catch (err) {
            console.error('Error fetching product', detail.productId, err)
          }
          return {
            id: detail.productId,
            name: detail.name,
            quantity: detail.quantity,
            unitPrice: detail.price,
            subtotal: detail.quantity * detail.price,
            image,
          }
        })
      )
      setProducts(list)
    }
    fetchProducts()
  }, [order])

  if (!order) {
    return <div className="p-6">Cargando...</div>
  }

  const payload = order.payload as any

  const subtotal = products.reduce((s: number, p: any) => s + p.subtotal, 0)

  const statusText = order.status === "PENDING" ? "Pendiente" : "Completado"
  const statusColor =
    order.status === "PENDING"
      ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200"
      : "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200"

  const orderData = {
    orderNumber: order.code,
    orderDate: new Date(order.createdAt).toLocaleDateString("es-ES"),
    status: statusText,
    customer: {
      name: payload.firstName ? `${payload.firstName} ${payload.lastName}` : '',
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
    products,
    summary: {
      subtotal,
      shipping: 0,
      discount: 0,
      total: payload.total,
    },
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleSendProof = async () => {
    if (!id) return
    if (files.length === 0) {
      toast.warning('Seleccione una o más imágenes')
      return
    }
    try {
      setIsUploading(true)
      await uploadOrderProofs(id, files, description)
      const updated = await getWebOrderById(id as string)
      setOrder(updated)
      toast.success('Comprobante enviado')
      setFiles([])
      setDescription('')
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Error al subir el comprobante'
      toast.error(message)
    } finally {
      setIsUploading(false)
    }
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
          <h1 className="text-3xl font-bold text-blue-900 dark:text-blue-200 mb-2">
            Detalle del Pedido
            <span className="text-xl font-normal ml-2">#{orderData.orderNumber}</span>
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            ¡Gracias por tu compra! Tu orden ha sido generada con éxito y está siendo procesada.
            Pronto recibirás una confirmación por correo electrónico con todos los detalles de tu pedido.
            Si tienes alguna pregunta o deseas hacer seguimiento, no dudes en contactarnos.
            Valoramos tu confianza y estamos comprometidos a ofrecerte el mejor servicio mientras tu orden está en proceso.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Order Info & Customer Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Information */}
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

            {/* Customer Details */}
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

            {/* Billing Details */}
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

            {/* Shipping Details */}
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

            {/* Product List */}
            <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0">
              <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4 items-center">
                <CardTitle className="text-blue-900 dark:text-blue-100">Productos Pedidos</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {products.map((product:any, index:any) => (
                    <div key={product.id}>
                      <div className="flex items-center gap-4">
                        {product.image && (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-md border"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                            {product.name || `Producto ${product.id}`}
                          </h3>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            Cantidad: {product.quantity}
                          </div>
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

            {/* Payment Proof */}
            <Card className="border-blue-100 dark:border-blue-700 shadow-sm pt-0">
              <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4 items-center">
                <CardTitle className="text-blue-900 dark:text-blue-100">Comprobante de Pago</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {payload.proofImages && payload.proofImages.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {payload.proofImages.map((url: string, idx: number) => {
                      const imgUrl = url.startsWith('http')
                        ? url
                        : `${BACKEND_URL}${url.startsWith('/') ? '' : '/'}${url}`
                      return (
                        <img
                          key={idx}
                          src={imgUrl}
                          alt={`Comprobante ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )
                    })}
                  </div>
                )}
                <label
                  htmlFor="proof-files"
                  className="block w-full border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-md p-4 text-center cursor-pointer bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-100"
                >
                  Seleccionar imágenes
                </label>
                <Input
                  id="proof-files"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                {previewUrls.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {previewUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Vista previa ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={200}
                  placeholder="Descripción (opcional, máximo 200 caracteres)"
                />
                <Button
                  onClick={handleSendProof}
                  disabled={isUploading}
                  className="w-full bg-blue-900 hover:bg-blue-800 text-white dark:bg-blue-700 dark:hover:bg-blue-600"
                >
                  {isUploading ? 'Enviando...' : 'Enviar comprobante'}
                </Button>
              </CardContent>
            </Card>

          </div>

          

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <Card className="border-blue-100 dark:border-blue-700 shadow-sm sticky top-8 pt-0">
              <CardHeader className="bg-blue-50 dark:bg-blue-900 border-b border-blue-100 dark:border-blue-700 rounded-t-lg p-4 items-center">
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