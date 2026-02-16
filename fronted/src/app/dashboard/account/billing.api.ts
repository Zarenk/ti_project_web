import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch"

export interface BillingInvoice {
  id: number
  code: string
  amount: string
  currency: string
  status: string
  billingPeriodStart: string | null
  billingPeriodEnd: string | null
  createdAt: string
  planName: string | null
  pdfAvailable: boolean
  canRetry: boolean
  paymentMethod: { brand: string | null; last4: string | null } | null
}

export interface OrganizationExport {
  id: number
  status: string
  cleanupStatus: string
  requestedAt: string
  completedAt: string | null
  expiresAt: string | null
  errorMessage: string | null
  fileReady: boolean
}

export interface SubscriptionPlan {
  id: number
  code: string
  name: string
  description?: string | null
  interval: string
  price: string
  currency: string
  features?: Record<string, any> | null
}

export type BillingPaymentProvider = "STRIPE" | "MERCADOPAGO" | "CULQI" | "MANUAL"

export interface BillingPaymentMethod {
  id: number
  organizationId: number
  provider: BillingPaymentProvider
  externalId: string
  brand: string | null
  last4: string | null
  expMonth: number | null
  expYear: number | null
  country: string | null
  status: string
  isDefault: boolean
  billingCustomerId: string | null
  createdAt: string
  updatedAt: string
}

export interface UpsertPaymentMethodInput {
  organizationId: number
  provider: BillingPaymentProvider
  externalId: string
  brand?: string | null
  last4?: string | null
  expMonth?: number | null
  expYear?: number | null
  country?: string | null
  isDefault?: boolean
  billingCustomerId?: string | null
  tokenized?: boolean
  cardholderName?: string | null
  cardholderEmail?: string | null
  identificationType?: string | null
  identificationNumber?: string | null
}

export async function fetchBillingInvoices(organizationId: number): Promise<BillingInvoice[]> {
  try {
    const params = new URLSearchParams({ organizationId: String(organizationId) })
    const res = await authFetch(`/subscriptions/invoices?${params.toString()}`, {
      cache: "no-store",
    })
    if (!res.ok) {
      const message = await res.text().catch(() => "No se pudo obtener las facturas")
      throw new Error(message || "No se pudo obtener las facturas")
    }
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
}

export async function retryBillingInvoice(organizationId: number, invoiceId: number) {
  const res = await authFetch(`/subscriptions/invoices/${invoiceId}/retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId }),
  })
  if (!res.ok) {
    const message = await res.text().catch(() => "No se pudo reintentar el cobro")
    throw new Error(message || "No se pudo reintentar el cobro")
  }
}

export async function downloadBillingInvoicePdf(organizationId: number, invoiceId: number) {
  try {
    const params = new URLSearchParams({ organizationId: String(organizationId) })
    const res = await authFetch(`/subscriptions/invoices/${invoiceId}/pdf?${params.toString()}`, {
      cache: "no-store",
    })
    if (!res.ok) {
      const message = await res.text().catch(() => "PDF no disponible")
      throw new Error(message || "PDF no disponible")
    }
    return res.blob()
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return new Blob()
    }
    throw error
  }
}

export async function fetchOrganizationExports(organizationId: number): Promise<OrganizationExport[]> {
  try {
    const params = new URLSearchParams({ organizationId: String(organizationId) })
    const res = await authFetch(`/subscriptions/exports?${params.toString()}`, {
      cache: "no-store",
    })
    if (!res.ok) {
      const message = await res.text().catch(() => "No se pudo obtener las exportaciones")
      throw new Error(message || "No se pudo obtener las exportaciones")
    }
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
}

export async function requestOrganizationExport(organizationId: number) {
  const res = await authFetch("/subscriptions/exports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId }),
  })
  if (!res.ok) {
    const message = await res.text().catch(() => "No se pudo programar la exportacion")
    throw new Error(message || "No se pudo programar la exportacion")
  }
}

export async function downloadOrganizationExport(organizationId: number, exportId: number) {
  try {
    const params = new URLSearchParams({ organizationId: String(organizationId) })
    const res = await authFetch(`/subscriptions/exports/${exportId}/download?${params.toString()}`, {
      cache: "no-store",
    })
    if (!res.ok) {
      const message = await res.text().catch(() => "No se pudo descargar la exportacion")
      throw new Error(message || "No se pudo descargar la exportacion")
    }
    return res.blob()
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return new Blob()
    }
    throw error
  }
}

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const res = await authFetch(`/subscriptions/plans`, { cache: "no-store" })
    if (!res.ok) {
      const message = await res.text().catch(() => "No se pudieron obtener los planes")
      throw new Error(message || "No se pudieron obtener los planes")
    }
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
}

export interface PlanChangeResponse {
  effectiveImmediately: boolean
  planCode: string
  planName: string
  scheduledFor?: string
  checkoutUrl?: string | null
  sessionId?: string | null
  invoiceId?: number | null
}

export interface ComplimentaryGrantResponse {
  subscriptionId: number
  organizationId: number
  planCode: string
  currentPeriodEnd: string
  complimentary: {
    grantedAt: string
    startsAt: string
    endsAt: string
    durationMonths: number
    planCode: string
    planId: number
    reason: string | null
    grantedBy: {
      userId: number | null
      email: string | null
      username: string | null
    }
  }
}

export async function requestPlanChange(input: {
  organizationId: number
  planCode: string
  effectiveImmediately?: boolean
}): Promise<PlanChangeResponse> {
  const res = await authFetch(`/subscriptions/change-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const message = await res.text().catch(() => "No se pudo cambiar el plan")
    throw new Error(message || "No se pudo cambiar el plan")
  }
  return res.json()
}

export async function grantComplimentarySubscription(input: {
  organizationId: number
  planCode: string
  durationMonths: number
  reason?: string
}): Promise<ComplimentaryGrantResponse> {
  const res = await authFetch(`/admin/subscriptions/${input.organizationId}/complimentary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      planCode: input.planCode,
      durationMonths: input.durationMonths,
      reason: input.reason,
    }),
  })
  if (!res.ok) {
    const message = await res.text().catch(() => "No se pudo activar la membresia sin pago")
    throw new Error(message || "No se pudo activar la membresia sin pago")
  }
  return res.json()
}

export async function cancelSubscription(input: {
  organizationId: number
  cancelImmediately?: boolean
  reasonCategory?: string
  customReason?: string
}) {
  const res = await authFetch(`/subscriptions/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const message = await res.text().catch(() => "No se pudo cancelar la suscripcion")
    throw new Error(message || "No se pudo cancelar la suscripcion")
  }
  return res.json()
}

export async function fetchPaymentMethods(organizationId: number): Promise<BillingPaymentMethod[]> {
  try {
    const params = new URLSearchParams({ organizationId: String(organizationId) })
    const res = await authFetch(`/subscriptions/payment-methods?${params.toString()}`, { cache: "no-store" })
    if (!res.ok) {
      const message = await res.text().catch(() => "No se pudieron obtener los metodos de pago")
      throw new Error(message || "No se pudieron obtener los metodos de pago")
    }
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return []
    }
    throw error
  }
}

export async function upsertPaymentMethod(input: UpsertPaymentMethodInput) {
  const res = await authFetch(`/subscriptions/payment-methods`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const message = await res.text().catch(() => "No se pudo guardar el metodo de pago")
    throw new Error(message || "No se pudo guardar el metodo de pago")
  }
  return res.json()
}

export async function markPaymentMethodAsDefault(organizationId: number, methodId: number) {
  const res = await authFetch(`/subscriptions/payment-methods/${methodId}/default`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId }),
  })
  if (!res.ok) {
    const message = await res.text().catch(() => "No se pudo actualizar el metodo predeterminado")
    throw new Error(message || "No se pudo actualizar el metodo predeterminado")
  }
}

export async function removePaymentMethod(organizationId: number, methodId: number) {
  const res = await authFetch(`/subscriptions/payment-methods/${methodId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId }),
  })
  if (!res.ok) {
    const message = await res.text().catch(() => "No se pudo eliminar el metodo de pago")
    throw new Error(message || "No se pudo eliminar el metodo de pago")
  }
}
