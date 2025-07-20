"use client"

import React, { useState } from "react"
import { useCart } from "@/context/cart-context"
import { CreditCard, Building2, Smartphone, Check, ShoppingCart } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createSale } from "@/app/dashboard/sales/sales.api"
import {
  createClient,
  checkClientExists,
  getClients,
} from "@/app/dashboard/clients/clients.api"
import { getUserDataFromToken } from "@/lib/auth"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import Navbar from "@/components/navbar"
import CheckoutSteps from "@/components/checkout-steps"
import { regions } from "@/lib/region"
import { DEFAULT_STORE_ID } from "@/lib/config"

export default function Component() {
  const [paymentMethod, setPaymentMethod] = useState("visa")
  const [sameAsShipping, setSameAsShipping] = useState(true)

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    shipFirstName: "",
    shipLastName: "",
    shipAddress: "",
    shipCity: "",
    shipPostalCode: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
    cardName: "",
    invoiceType: "BOLETA",
    dni: "",
    invoiceName: "",
    ruc: "",
    razonSocial: "",
    invoiceAddress: "",
  })

  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { id, value } = e.target
    let newValue = value

    switch (id) {
      case "firstName":
      case "lastName":
      case "invoiceName":
      case "razonSocial":
      case "cardName":
      case "shipFirstName":
      case "shipLastName":
        newValue = newValue.replace(/[^a-zA-Z\sÁÉÍÓÚáéíóúñÑ]/g, "")
        break
      case "phone":
        newValue = newValue.replace(/[^0-9+]/g, "")
        break
      case "dni":
        newValue = newValue.replace(/\D/g, "").slice(0, 8)
        break
      case "ruc":
        newValue = newValue.replace(/\D/g, "").slice(0, 11)
        break
      case "postalCode":
      case "shipPostalCode":
      case "cvv":
        newValue = newValue.replace(/\D/g, "")
        break
      case "cardNumber":
        newValue = newValue.replace(/\D/g, "").slice(0, 16)
        break
      case "expiry":
        newValue = newValue.replace(/[^0-9/]/g, "").slice(0, 5)
        if (newValue.length === 2 && !newValue.includes("/")) newValue += "/"
        break
      default:
        break
    }

    setFormData((prev) => ({ ...prev, [id]: newValue }))
  }

  const router = useRouter()
  const { items: orderItems, clear } = useCart()

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: { [key: string]: string } = {}

    const nameRegex = /^[a-zA-Z\sÁÉÍÓÚáéíóúñÑ]+$/
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^\+?\d{6,15}$/

    if (!formData.firstName.trim())
      newErrors.firstName = "Ingrese sus nombres completos"
    else if (!nameRegex.test(formData.firstName.trim()))
      newErrors.firstName = "El nombre solo debe contener letras"

    if (!formData.lastName.trim())
      newErrors.lastName = "Ingrese sus apellidos"
    else if (!nameRegex.test(formData.lastName.trim()))
      newErrors.lastName = "El apellido solo debe contener letras"

    if (!formData.email.trim()) newErrors.email = "Ingrese su email"
    else if (!emailRegex.test(formData.email.trim()))
      newErrors.email = "Ingrese un email valido"

    if (!formData.phone.trim()) newErrors.phone = "Ingrese su telefono"
    else if (!phoneRegex.test(formData.phone.trim()))
      newErrors.phone = "Ingrese un telefono valido"

    if (!formData.address.trim())
      newErrors.address = "Ingrese su direccion de facturacion"
    if (!formData.city.trim()) newErrors.city = "Ingrese su ciudad"
    if (!formData.state.trim()) newErrors.state = "Ingrese su estado o region"
    if (!formData.postalCode.trim())
      newErrors.postalCode = "Ingrese su codigo postal"
    else if (!/^\d+$/.test(formData.postalCode))
      newErrors.postalCode = "Codigo postal invalido"

    if (formData.invoiceType === "BOLETA") {
      if (!formData.dni.trim()) newErrors.dni = "Ingrese su DNI"
      else if (!/^\d{8}$/.test(formData.dni))
        newErrors.dni = "El DNI debe tener 8 digitos"

      if (!formData.invoiceName.trim())
        newErrors.invoiceName = "Ingrese su nombre completo"
      else if (!nameRegex.test(formData.invoiceName.trim()))
        newErrors.invoiceName = "El nombre solo debe contener letras"

    } else if (formData.invoiceType === "FACTURA") {
      if (!formData.ruc.trim()) newErrors.ruc = "Ingrese su RUC"
      else if (!/^\d{11}$/.test(formData.ruc))
        newErrors.ruc = "El RUC debe tener 11 digitos"

      if (!formData.razonSocial.trim())
        newErrors.razonSocial = "Ingrese la razon social"
      else if (!nameRegex.test(formData.razonSocial.trim()))
        newErrors.razonSocial = "La razon social solo debe contener letras"

      if (!formData.invoiceAddress.trim())
        newErrors.invoiceAddress = "Ingrese la direccion"
    }

    if (!sameAsShipping) {
      if (!formData.shipFirstName.trim())
        newErrors.shipFirstName = "Ingrese los nombres de envio"
      else if (!nameRegex.test(formData.shipFirstName.trim()))
        newErrors.shipFirstName = "El nombre solo debe contener letras"

      if (!formData.shipLastName.trim())
        newErrors.shipLastName = "Ingrese los apellidos de envio"
      else if (!nameRegex.test(formData.shipLastName.trim()))
        newErrors.shipLastName = "El apellido solo debe contener letras"

      if (!formData.shipAddress.trim())
        newErrors.shipAddress = "Ingrese la direccion de envio"

      if (!formData.shipCity.trim())
        newErrors.shipCity = "Ingrese la ciudad de envio"
      else if (!nameRegex.test(formData.shipCity.trim()))
        newErrors.shipCity = "La ciudad solo debe contener letras"

      if (!formData.shipPostalCode.trim())
        newErrors.shipPostalCode = "Ingrese el codigo postal de envio"
    }

    if (!paymentMethod)
      newErrors.paymentMethod = "Seleccione un metodo de pago"
    if (paymentMethod === "visa") {
      const cardNum = formData.cardNumber.replace(/\s+/g, "")
      if (!cardNum) newErrors.cardNumber = "Ingrese el numero de tarjeta"
      else if (!/^\d{16}$/.test(cardNum))
        newErrors.cardNumber = "Numero de tarjeta invalido"

      if (!formData.expiry.trim())
        newErrors.expiry = "Ingrese la fecha de expiracion"
      else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(formData.expiry))
        newErrors.expiry = "Formato MM/YY invalido"

      if (!formData.cvv.trim()) newErrors.cvv = "Ingrese el CVV"
      else if (!/^\d{3,4}$/.test(formData.cvv))
        newErrors.cvv = "CVV invalido"

      if (!formData.cardName.trim())
        newErrors.cardName = "Ingrese el nombre de la tarjeta"
      else if (!nameRegex.test(formData.cardName.trim()))
        newErrors.cardName = "El nombre solo debe contener letras"
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length === 0) {
      try {
        const details = orderItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
        }))

        const paymentMethodMap: Record<string, number> = {
          visa: -3,
          transfer: -2,
          yape: -4,
        }

        const userData = getUserDataFromToken();
        const userIdToSend = userData?.userId ?? 1;

        let clientId: number | undefined = undefined;
        if (formData.invoiceType === "BOLETA" || formData.invoiceType === "FACTURA") {
          const typeNumber =
            formData.invoiceType === "BOLETA" ? formData.dni.trim() : formData.ruc.trim();
          const type = formData.invoiceType === "BOLETA" ? "DNI" : "RUC";
          const name =
            formData.invoiceType === "BOLETA" ? formData.invoiceName.trim() : formData.razonSocial.trim();

          if (typeNumber) {
            try {
              const exists = await checkClientExists(typeNumber);
              if (exists) {
                const clients = await getClients();
                const existing = clients.find((c: any) => c.typeNumber === typeNumber);
                clientId = existing?.id;
              } else {
                const created = await createClient({ name, type, typeNumber, userId: userData?.userId });
                clientId = created?.id;
              }
            } catch (err) {
              console.error("Error obteniendo cliente:", err);
            }
          }
        }

        const payload = {
          userId: userIdToSend,
          storeId: DEFAULT_STORE_ID,
          ...(clientId ? { clientId } : {}),
          total,
          description: `Compra online de ${formData.firstName} ${formData.lastName}`,
          details,
          tipoComprobante: formData.invoiceType,
          tipoMoneda: "PEN",
          payments: [
            {
              paymentMethodId: paymentMethodMap[paymentMethod] ?? -6,
              amount: total,
              currency: "PEN",
            },
          ],
          source: 'WEB',
        }

        const sale = await createSale(payload)
        if (sale && sale.id) {
          clear()
          router.push(`/orders/${sale.id}`)
        } else {
          alert("No se pudo procesar la compra")
        }
      } catch (error) {
        console.error("Error al crear la orden:", error)
        alert("Ocurrió un error al procesar la compra")
      }
    }
  }

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shipping = 15.0
  const total = subtotal + shipping

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <CheckoutSteps step={3} />
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Completa Tu Compra</h1>
          <p className="text-gray-600">Proceso de compra seguro para tus necesidades tecnológicas</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Billing Information */}
            <Card className="border-blue-200 shadow-sm p-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-lg p-4">
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
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="John"
                      className="border-gray-300 focus:border-blue-500"
                    />
                    {errors.firstName && (
                      <p className="text-red-500 text-sm">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellidos *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                      className="border-gray-300 focus:border-blue-500"
                    />
                    {errors.lastName && (
                      <p className="text-red-500 text-sm">{errors.lastName}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john.doe@example.com"
                    className="border-gray-300 focus:border-blue-500"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm">{errors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+51 999 999 999"
                    className="border-gray-300 focus:border-blue-500"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm">{errors.phone}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Direccion de Facturacion *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="123 Main Street"
                    className="border-gray-300 focus:border-blue-500"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-sm">{errors.address}</p>
                  )}
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="state">Región *</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, state: value, city: "" }))
                      }
                    >
                      <SelectTrigger className="w-full border-gray-300 focus:border-blue-500">
                        <SelectValue placeholder="Seleccione una región" />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map((region) => (
                          <SelectItem key={region.name} value={region.name}>
                            {region.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.state && (
                      <p className="text-red-500 text-sm">{errors.state}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad *</Label>
                    <Select
                      value={formData.city}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, city: value }))
                      }
                      disabled={!formData.state}
                    >
                      <SelectTrigger className="w-full border-gray-300 focus:border-blue-500">
                        <SelectValue placeholder="Seleccione una ciudad" />
                      </SelectTrigger>
                      <SelectContent>
                        {regions
                          .find((r:any) => r.name === formData.state)
                          ?.cities.map((city:any) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {errors.city && (
                      <p className="text-red-500 text-sm">{errors.city}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Codigo Postal</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="20001"
                      className="border-gray-300 focus:border-blue-500"
                    />
                    {errors.postalCode && (
                      <p className="text-red-500 text-sm">{errors.postalCode}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Document */}
            <Card className="border-blue-200 shadow-sm p-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-lg p-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold">2</span>
                  </div>
                  Facturacion
                </CardTitle>
                <CardDescription className="text-blue-100">Seleccione el tipo de comprobante</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <RadioGroup
                  value={formData.invoiceType}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, invoiceType: value }))
                  }
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="BOLETA" id="boleta" />
                    <Label htmlFor="boleta">Boleta</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="FACTURA" id="factura" />
                    <Label htmlFor="factura">Factura</Label>
                  </div>
                </RadioGroup>

                {formData.invoiceType === "BOLETA" && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dni">Numero de Documento (DNI) *</Label>
                      <Input
                        id="dni"
                        value={formData.dni}
                        onChange={handleChange}
                        placeholder="12345678"
                        className="border-gray-300 focus:border-blue-500"
                      />
                      {errors.dni && (
                        <p className="text-red-500 text-sm">{errors.dni}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoiceName">Nombre Completo *</Label>
                      <Input
                        id="invoiceName"
                        value={formData.invoiceName}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className="border-gray-300 focus:border-blue-500"
                      />
                      {errors.invoiceName && (
                        <p className="text-red-500 text-sm">{errors.invoiceName}</p>
                      )}
                    </div>
                  </div>
                )}

                {formData.invoiceType === "FACTURA" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ruc">RUC *</Label>
                      <Input
                        id="ruc"
                        value={formData.ruc}
                        onChange={handleChange}
                        placeholder="20123456789"
                        className="border-gray-300 focus:border-blue-500"
                      />
                      {errors.ruc && (
                        <p className="text-red-500 text-sm">{errors.ruc}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="razonSocial">Razon Social *</Label>
                      <Input
                        id="razonSocial"
                        value={formData.razonSocial}
                        onChange={handleChange}
                        placeholder="Empresa SAC"
                        className="border-gray-300 focus:border-blue-500"
                      />
                      {errors.razonSocial && (
                        <p className="text-red-500 text-sm">{errors.razonSocial}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoiceAddress">Direccion *</Label>
                      <Input
                        id="invoiceAddress"
                        value={formData.invoiceAddress}
                        onChange={handleChange}
                        placeholder="Av. Principal 123"
                        className="border-gray-300 focus:border-blue-500"
                      />
                      {errors.invoiceAddress && (
                        <p className="text-red-500 text-sm">{errors.invoiceAddress}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card className="border-blue-200 shadow-sm p-0">
              <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-t-lg p-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold">3</span>
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
                          value={formData.shipFirstName}
                          onChange={handleChange}
                          placeholder="John"
                          className="border-gray-300 focus:border-blue-500"
                        />
                        {errors.shipFirstName && (
                          <p className="text-red-500 text-sm">{errors.shipFirstName}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shipLastName">Apellidos *</Label>
                        <Input
                          id="shipLastName"
                          value={formData.shipLastName}
                          onChange={handleChange}
                          placeholder="Doe"
                          className="border-gray-300 focus:border-blue-500"
                        />
                        {errors.shipLastName && (
                          <p className="text-red-500 text-sm">{errors.shipLastName}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shipAddress">Direccion de Envio *</Label>
                      <Input
                        id="shipAddress"
                        value={formData.shipAddress}
                        onChange={handleChange}
                        placeholder="Avenida 123."
                        className="border-gray-300 focus:border-blue-500"
                      />
                      {errors.shipAddress && (
                        <p className="text-red-500 text-sm">{errors.shipAddress}</p>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="shipCity">Ciudad *</Label>
                        <Input
                          id="shipCity"
                          value={formData.shipCity}
                          onChange={handleChange}
                          placeholder="Lima"
                          className="border-gray-300 focus:border-blue-500"
                        />
                        {errors.shipCity && (
                          <p className="text-red-500 text-sm">{errors.shipCity}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shipPostalCode">Codigo postal</Label>
                        <Input
                          id="shipPostalCode"
                          value={formData.shipPostalCode}
                          onChange={handleChange}
                          placeholder="20000"
                          className="border-gray-300 focus:border-blue-500"
                        />
                        {errors.shipPostalCode && (
                          <p className="text-red-500 text-sm">{errors.shipPostalCode}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="border-blue-200 shadow-sm p-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-lg p-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold">4</span>
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
                            value={formData.cardNumber}
                            onChange={handleChange}
                            placeholder="1234 5678 9012 3456"
                            className="border-gray-300 focus:border-blue-500"
                          />
                          {errors.cardNumber && (
                            <p className="text-red-500 text-sm">{errors.cardNumber}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="expiry">Fecha de Expiracion *</Label>
                            <Input
                              id="expiry"
                              value={formData.expiry}
                              onChange={handleChange}
                              placeholder="MM/YY"
                              className="border-gray-300 focus:border-blue-500"
                            />
                            {errors.expiry && (
                              <p className="text-red-500 text-sm">{errors.expiry}</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cvv">CVV *</Label>
                            <Input
                              id="cvv"
                              value={formData.cvv}
                              onChange={handleChange}
                              placeholder="123"
                              className="border-gray-300 focus:border-blue-500"
                            />
                            {errors.cvv && (
                              <p className="text-red-500 text-sm">{errors.cvv}</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cardName">Nombre de la Tarjeta *</Label>
                          <Input
                            id="cardName"
                            value={formData.cardName}
                            onChange={handleChange}
                            placeholder="John Doe"
                            className="border-gray-300 focus:border-blue-500"
                          />
                          {errors.cardName && (
                            <p className="text-red-500 text-sm">{errors.cardName}</p>
                          )}
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
                              <strong>Numero de Cuenta:</strong> 540-1639272047                             
                            </p>
                            <p>
                              <strong>Numero de Cuenta(CCI):</strong> 002-540-00163927204736
                            </p>                           
                            <p>
                              <strong>Titular de la Cuenta:</strong> TECNOLOGIA INFORMATICA E.I.R.L.
                            </p>
                            <p>
                              <strong>Referencia:</strong> Orden #{Math.random().toString(36).substr(2, 9).toUpperCase()}
                            </p>
                          </div>
                          <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                            Por favor, incluya el número de operación en la descripción de su transferencia
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
                              <strong>Numero de Celular:</strong> +51 969 337 457
                            </p>
                            <p>
                              <strong>Nombre:</strong> TECNOLOGIA INFORMATICA E.I.R.L.
                            </p>
                            <p>
                              <strong>Monto:</strong> S/. {(total).toFixed(2)}
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
            <Card className="border-blue-200 shadow-lg sticky top-8 p-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-t-lg p-4">
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
                    <span className="font-medium">S/.{subtotal.toFixed(2)}</span>
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

                <Button
                  onClick={handlePurchase}
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 text-lg shadow-lg"
                >
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