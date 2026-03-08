"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useCart } from "@/context/cart-context"
import { useRouter } from "next/navigation"
import { createWebOrder, payWithCulqi } from "@/app/dashboard/sales/sales.api"
import {
  selfRegisterClient,
  checkClientExists,
  getClients,
} from "@/app/dashboard/clients/clients.api"
import { getUserDataFromToken } from "@/lib/auth"
import { DEFAULT_STORE_ID } from "@/lib/config"
import {
  type FormData,
  INITIAL_FORM_DATA,
  PAYMENT_METHOD_MAP,
  validateCheckoutForm,
} from "./payment-utils"

export function useCheckout() {
  const router = useRouter()
  const { items: orderItems, clear } = useCart()

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [checkoutStep, setCheckoutStep] = useState(2)
  const [paymentMethod, setPaymentMethod] = useState("visa")
  const [sameAsShipping, setSameAsShipping] = useState(true)
  const [pickupInStore, setPickupInStore] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)

  const orderReference = useMemo(
    () => Math.random().toString(36).substr(2, 9).toUpperCase(),
    [],
  )

  // Load Culqi script when visa selected
  useEffect(() => {
    if (paymentMethod !== "visa") return
    if (!document.getElementById("culqi-js")) {
      const s = document.createElement("script")
      s.id = "culqi-js"
      s.src = "https://checkout.culqi.com/js/v4"
      s.async = true
      document.body.appendChild(s)
    }
  }, [paymentMethod])

  // Prefill form with existing client data
  useEffect(() => {
    let cancelled = false
    async function loadClientData() {
      try {
        const user = await getUserDataFromToken()
        if (user) {
          const clients = await getClients()
          const client = clients.find((c: any) => c.userId === user.id)
          if (client && !cancelled) {
            const [first, ...lastParts] = (client.name ?? "").split(" ")
            setFormData((prev) => ({
              ...prev,
              firstName: prev.firstName || first,
              lastName: prev.lastName || lastParts.join(" "),
              email: prev.email || client.email || "",
              phone: prev.phone || client.phone || "",
              address: prev.address || client.adress || "",
              personalDni:
                prev.personalDni ||
                (client.type === "DNI" ? client.typeNumber || "" : ""),
              invoiceName: prev.invoiceName || client.name || "",
              invoiceAddress: prev.invoiceAddress || client.adress || "",
              invoiceType: client.type === "RUC" ? "FACTURA" : "BOLETA",
              dni: client.type === "DNI" ? client.typeNumber || "" : prev.dni,
              ruc: client.type === "RUC" ? client.typeNumber || "" : prev.ruc,
              razonSocial:
                client.type === "RUC" ? client.name || "" : prev.razonSocial,
            }))
          }
        }
      } catch (err) {
        console.error("Error cargando datos del cliente:", err)
      } finally {
        if (!cancelled) setIsPageLoading(false)
      }
    }
    loadClientData()
    const timeout = setTimeout(() => {
      if (!cancelled) setIsPageLoading(false)
    }, 800)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [])

  // Sync billing DNI with personal DNI
  useEffect(() => {
    if (formData.invoiceType === "BOLETA" && !formData.dni) {
      setFormData((prev) => ({ ...prev, dni: formData.personalDni }))
    }
  }, [formData.personalDni, formData.invoiceType])

  const handleChange = useCallback((id: string, value: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }))
  }, [])

  const handleSameAsShippingChange = (checked: boolean) => {
    setSameAsShipping(Boolean(checked))
    if (checked) setPickupInStore(false)
  }

  const handlePickupInStoreChange = (checked: boolean) => {
    setPickupInStore(Boolean(checked))
    if (checked) setSameAsShipping(false)
  }

  // ── Computed totals ──

  const subtotal = useMemo(
    () => orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [orderItems],
  )
  const shipping = pickupInStore ? 0 : 15.0
  const total = useMemo(() => subtotal + shipping, [subtotal, shipping])

  // ── Purchase handler ──

  const handlePurchase = async (e?: React.FormEvent) => {
    e?.preventDefault()

    const newErrors = validateCheckoutForm(formData, paymentMethod, sameAsShipping, pickupInStore)
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    setIsProcessing(true)
    try {
      const details = orderItems.map((item) => ({
        productId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }))

      const userData = await getUserDataFromToken()
      const userIdToSend = userData?.id ?? 1

      let clientId: number | undefined
      if (formData.invoiceType === "BOLETA" || formData.invoiceType === "FACTURA") {
        const typeNumber =
          formData.invoiceType === "BOLETA" ? formData.dni.trim() : formData.ruc.trim()
        const type = formData.invoiceType === "BOLETA" ? "DNI" : "RUC"
        const name =
          formData.invoiceType === "BOLETA"
            ? formData.invoiceName.trim()
            : formData.razonSocial.trim()

        if (typeNumber) {
          try {
            const exists = await checkClientExists(typeNumber)
            if (exists) {
              const clients = await getClients()
              const existing = clients.find((c: any) => c.typeNumber === typeNumber)
              clientId = existing?.id
            } else {
              const created = await selfRegisterClient({
                name,
                type,
                typeNumber,
                userId: userIdToSend,
              })
              clientId = created?.id
            }
          } catch (err) {
            console.error("Error obteniendo cliente:", err)
          }
        }
      }

      const payload = {
        userId: userIdToSend,
        storeId: DEFAULT_STORE_ID,
        ...(clientId ? { clientId } : {}),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        personalDni: formData.personalDni.trim(),
        dni: formData.dni.trim(),
        invoiceName: formData.invoiceName.trim(),
        ruc: formData.ruc.trim(),
        razonSocial: formData.razonSocial.trim(),
        invoiceAddress: formData.invoiceAddress.trim(),
        total,
        description: `Compra online de ${formData.firstName} ${formData.lastName}`,
        details,
        tipoComprobante: formData.invoiceType,
        tipoMoneda: "PEN",
        payments: [
          {
            paymentMethodId: PAYMENT_METHOD_MAP[paymentMethod] ?? -6,
            amount: total,
            currency: "PEN",
          },
        ],
        shippingName: pickupInStore
          ? "RECOJO EN TIENDA"
          : sameAsShipping
            ? `${formData.firstName} ${formData.lastName}`
            : `${formData.shipFirstName} ${formData.shipLastName}`,
        shippingAddress: pickupInStore
          ? "RECOJO EN TIENDA"
          : sameAsShipping
            ? formData.address
            : formData.shipAddress,
        shippingMethod: pickupInStore ? "RECOJO EN TIENDA" : "ENVIO A DOMICILIO",
        estimatedDelivery: "24 a 72 horas",
        city: pickupInStore
          ? ""
          : sameAsShipping
            ? formData.city
            : formData.shipCity,
        postalCode: pickupInStore
          ? ""
          : sameAsShipping
            ? formData.postalCode
            : formData.shipPostalCode,
        phone: formData.phone,
        source: "WEB" as const,
        code: orderReference,
      }

      let order: any
      if (paymentMethod === "visa") {
        const [expM, expY] = formData.expiry.split("/")
        const tokenRes = await fetch("https://secure.culqi.com/v2/tokens", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY || process.env.CULQI_PUBLIC_KEY}`,
          },
          body: JSON.stringify({
            card_number: formData.cardNumber,
            cvv: formData.cvv,
            expiration_month: expM,
            expiration_year: `20${expY}`,
            email: formData.email.trim(),
          }),
        })
        const tokenData = await tokenRes.json()
        if (!tokenRes.ok) throw new Error(tokenData.user_message)
        order = await payWithCulqi(tokenData.id, total, payload)
      } else {
        order = await createWebOrder(payload)
      }

      if (order && order.id) {
        clear()
        router.push(`/pending-orders/${order.id}`)
      } else {
        alert("No se pudo procesar la compra")
      }
    } catch (error) {
      console.error("Error al crear la orden:", error)
      alert("Ocurrió un error al procesar la compra")
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    formData,
    setFormData,
    errors,
    checkoutStep,
    setCheckoutStep,
    paymentMethod,
    setPaymentMethod,
    sameAsShipping,
    pickupInStore,
    isProcessing,
    isPageLoading,
    orderReference,
    orderItems,
    subtotal,
    shipping,
    total,
    handleChange,
    handleSameAsShippingChange,
    handlePickupInStoreChange,
    handlePurchase,
  }
}
