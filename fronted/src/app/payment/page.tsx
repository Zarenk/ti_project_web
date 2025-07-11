"use client"

import { useState } from "react"
import { CreditCard, Building2, Smartphone, Check, ShoppingCart } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"

export default function Component() {
  const [paymentMethod, setPaymentMethod] = useState("visa")
  const [sameAsShipping, setSameAsShipping] = useState(true)

  const orderItems = [
    {
      id: 1,
      name: 'MacBook Pro 14" M3 Chip',
      price: 1999.0,
      quantity: 1,
      image: "/placeholder.svg?height=80&width=80",
    },
    {
      id: 2,
      name: "Logitech MX Master 3S Mouse",
      price: 99.99,
      quantity: 1,
      image: "/placeholder.svg?height=80&width=80",
    },
    {
      id: 3,
      name: "USB-C Hub 7-in-1",
      price: 49.99,
      quantity: 2,
      image: "/placeholder.svg?height=80&width=80",
    },
  ]

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = 15.0
  const total = subtotal + shipping

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Completa Tu Compra</h1>
          <p className="text-gray-600">Proceso de compra seguro para tus necesidades tecnológicas</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Billing Information */}
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold">1</span>
                  </div>
                  Detalles de facturación
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Ingrese sus datos de facturación para la emisión de la factura
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombres Completos *</Label>
                    <Input id="firstName" placeholder="John" className="border-gray-300 focus:border-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellidos *</Label>
                    <Input id="lastName" placeholder="Doe" className="border-gray-300 focus:border-blue-500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    className="border-gray-300 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono *</Label>
                  <Input id="phone" placeholder="+51 999 999 999" className="border-gray-300 focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Direccion de Facturacion *</Label>
                  <Input id="address" placeholder="123 Main Street" className="border-gray-300 focus:border-blue-500" />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad *</Label>
                    <Input id="city" placeholder="Lima" className="border-gray-300 focus:border-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado/Region</Label>
                    <Input id="state" placeholder="Lima" className="border-gray-300 focus:border-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Codigo Postal</Label>
                    <Input id="postalCode" placeholder="20001" className="border-gray-300 focus:border-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold">2</span>
                  </div>
                  Informacion de Envio
                </CardTitle>
                <CardDescription className="text-blue-100">A donde debemos enviar tu orden?</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sameAsShipping"
                    checked={sameAsShipping}
                    onCheckedChange={(checked) => setSameAsShipping(Boolean(checked))}
                    className="border-blue-500 data-[state=checked]:bg-blue-600"
                  />
                  <Label htmlFor="sameAsShipping" className="text-sm font-medium">
                    La misma que la direccion de facturacion
                  </Label>
                </div>

                {!sameAsShipping && (
                  <div className="space-y-4 pt-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="shipFirstName">Nombres Completos *</Label>
                        <Input
                          id="shipFirstName"
                          placeholder="John"
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shipLastName">Apellidos *</Label>
                        <Input id="shipLastName" placeholder="Doe" className="border-gray-300 focus:border-blue-500" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shipAddress">Direccion de Envio *</Label>
                      <Input
                        id="shipAddress"
                        placeholder="Avenida 123."
                        className="border-gray-300 focus:border-blue-500"
                      />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="shipCity">Ciudad *</Label>
                        <Input id="shipCity" placeholder="Lima" className="border-gray-300 focus:border-blue-500" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shipPostalCode">Codigo postal</Label>
                        <Input
                          id="shipPostalCode"
                          placeholder="20000"
                          className="border-gray-300 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold">3</span>
                  </div>
                  Metodo de Pago
                </CardTitle>
                <CardDescription className="text-blue-100">Elija el método de pago que prefiera</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
                  {/* Visa Card */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                      <RadioGroupItem value="visa" id="visa" className="border-blue-500 text-blue-600" />
                      <Label htmlFor="visa" className="flex items-center gap-3 cursor-pointer flex-1">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium">Tarjeta de Credito/Debito</div>
                          <div className="text-sm text-gray-500">Aceptamos Visa, Mastercard</div>
                        </div>
                      </Label>
                      <Image
                        src="/placeholder.svg?height=24&width=40"
                        alt="Visa"
                        width={40}
                        height={24}
                        className="opacity-70"
                      />
                    </div>

                    {paymentMethod === "visa" && (
                      <div className="ml-8 space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="space-y-2">
                          <Label htmlFor="cardNumber">Numero de Tarjeta *</Label>
                          <Input
                            id="cardNumber"
                            placeholder="1234 5678 9012 3456"
                            className="border-gray-300 focus:border-blue-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="expiry">Fecha de Expiracion *</Label>
                            <Input id="expiry" placeholder="MM/YY" className="border-gray-300 focus:border-blue-500" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cvv">CVV *</Label>
                            <Input id="cvv" placeholder="123" className="border-gray-300 focus:border-blue-500" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cardName">Nombre de la Tarjeta *</Label>
                          <Input
                            id="cardName"
                            placeholder="John Doe"
                            className="border-gray-300 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bank Transfer */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                      <RadioGroupItem value="transfer" id="transfer" className="border-blue-500 text-blue-600" />
                      <Label htmlFor="transfer" className="flex items-center gap-3 cursor-pointer flex-1">
                        <Building2 className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium">Transferencia bancaria</div>
                          <div className="text-sm text-gray-500">Transferencia directa al banco</div>
                        </div>
                      </Label>
                    </div>

                    {paymentMethod === "transfer" && (
                      <div className="ml-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="space-y-3">
                          <h4 className="font-medium text-blue-900">Instrucciones para transferencia bancaria</h4>
                          <div className="text-sm space-y-1">
                            <p>
                              <strong>Banco:</strong> Banco de Crédito del Perú (BCP)
                            </p>
                            <p>
                              <strong>Numero de Cuenta:</strong> 123-456789-0-12
                            </p>
                            <p>
                              <strong>Titular de la Cuenta:</strong> TechStore Peru SAC
                            </p>
                            <p>
                              <strong>Referencia:</strong> Orden #{Math.random().toString(36).substr(2, 9).toUpperCase()}
                            </p>
                          </div>
                          <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                            Por favor, incluya el número de referencia en la descripción de su transferencia
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* YAPE */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                      <RadioGroupItem value="yape" id="yape" className="border-blue-500 text-blue-600" />
                      <Label htmlFor="yape" className="flex items-center gap-3 cursor-pointer flex-1">
                        <Smartphone className="h-5 w-5 text-purple-600" />
                        <div>
                          <div className="font-medium">YAPE</div>
                          <div className="text-sm text-gray-500">Pago Movil</div>
                        </div>
                      </Label>
                      <div className="text-purple-600 font-bold text-lg">YAPE</div>
                    </div>

                    {paymentMethod === "yape" && (
                      <div className="ml-8 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="space-y-3">
                          <h4 className="font-medium text-purple-900">Instrucciones para pagar con YAPE</h4>
                          <div className="text-sm space-y-1">
                            <p>
                              <strong>Numero de Celular:</strong> +51 999 123 456
                            </p>
                            <p>
                              <strong>Nombre:</strong> TechStore Peru
                            </p>
                            <p>
                              <strong>Monto:</strong> S/. {(total * 3.8).toFixed(2)}
                            </p>
                          </div>
                          <div className="text-xs text-purple-700 bg-purple-100 p-2 rounded">
                            Envíe una captura de pantalla de la confirmación de pago para finalizar su pedido
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="border-blue-200 shadow-lg sticky top-8">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Resumen del pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        width={60}
                        height={60}
                        className="rounded-md object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 truncate">{item.name}</h4>
                        <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator className="my-6" />

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Envio</span>
                    <span className="font-medium">S/.{shipping.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">S/.{total.toFixed(2)}</span>
                  </div>
                </div>

                <Button className="w-full mt-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 text-lg shadow-lg">
                  <Check className="h-5 w-5 mr-2" />
                  Completa tu compra
                </Button>

                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">🔒 Su información de pago es segura y está encriptada</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}