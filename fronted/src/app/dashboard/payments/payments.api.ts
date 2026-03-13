import { BACKEND_URL } from "@/lib/utils"
import { authFetch, UnauthenticatedError } from "@/utils/auth-fetch"

// ── Types ───────────────────────────────────────────────────

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "SETTLING"
  | "COMPLETED"
  | "FAILED"
  | "EXPIRED"
  | "REFUNDED"

export type PaymentProvider = "culqi" | "mercadopago" | "manual"

export interface PaymentOrder {
  id: number
  code: string
  orderId: number | null
  salesId: number | null
  amount: string
  currency: string
  provider: string
  providerPaymentId: string | null
  status: PaymentStatus
  clientName: string | null
  clientEmail: string | null
  clientPhone: string | null
  paymentUrl: string | null
  expiresAt: string | null
  completedAt: string | null
  failedAt: string | null
  failureReason: string | null
  grossAmount: string | null
  netAmount: string | null
  commissionAmount: string | null
  commissionRate: string | null
  idempotencyKey: string | null
  createdAt: string
  updatedAt: string
  events?: PaymentOrderEvent[]
}

export interface PaymentOrderEvent {
  id: number
  fromStatus: string
  toStatus: string
  reason: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface PaginatedPayments {
  data: PaymentOrder[]
  total: number
  page: number
  pageSize: number
}

export interface CommissionReport {
  totalGross: number
  totalNet: number
  totalCommission: number
  byProvider: Array<{
    provider: string
    count: number
    gross: number
    net: number
    commission: number
    avgRate: number
  }>
}

// ── API Functions ───────────────────────────────────────────

export interface CreatePaymentParams {
  orderId?: number
  amount: number
  currency?: string
  provider: PaymentProvider
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  description?: string
  idempotencyKey?: string
}

export async function createPaymentOrder(data: CreatePaymentParams): Promise<PaymentOrder> {
  const res = await authFetch(`${BACKEND_URL}/api/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Error al crear orden de pago" }))
    const message = Array.isArray(err.message) ? err.message.join(", ") : err.message
    throw new Error(message)
  }

  return res.json()
}

export interface PaymentQueryParams {
  status?: PaymentStatus
  provider?: PaymentProvider
  from?: string
  to?: string
  page?: number
  pageSize?: number
}

export async function getPaymentOrders(
  params: PaymentQueryParams = {},
): Promise<PaginatedPayments> {
  try {
    const qs = new URLSearchParams()
    if (params.status) qs.append("status", params.status)
    if (params.provider) qs.append("provider", params.provider)
    if (params.from) qs.append("from", params.from)
    if (params.to) qs.append("to", params.to)
    if (params.page) qs.append("page", String(params.page))
    if (params.pageSize) qs.append("pageSize", String(params.pageSize))

    const query = qs.toString()
    const res = await authFetch(
      `${BACKEND_URL}/api/payments${query ? `?${query}` : ""}`,
      { credentials: "include" },
    )

    if (!res.ok) throw new Error("Error al obtener órdenes de pago")
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { data: [], total: 0, page: 1, pageSize: 20 }
    }
    throw error
  }
}

export async function getPaymentByCode(code: string): Promise<PaymentOrder> {
  const res = await authFetch(`${BACKEND_URL}/api/payments/${code}`, {
    credentials: "include",
  })

  if (!res.ok) {
    throw new Error("Error al obtener la orden de pago")
  }

  return res.json()
}

export async function confirmManualPayment(
  code: string,
  data: { reference?: string; notes?: string },
): Promise<PaymentOrder> {
  const res = await authFetch(`${BACKEND_URL}/api/payments/${code}/confirm`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Error al confirmar pago" }))
    throw new Error(err.message || "Error al confirmar pago")
  }

  return res.json()
}

export async function getCommissionReport(
  params: { from?: string; to?: string } = {},
): Promise<CommissionReport> {
  try {
    const qs = new URLSearchParams()
    if (params.from) qs.append("from", params.from)
    if (params.to) qs.append("to", params.to)

    const query = qs.toString()
    const res = await authFetch(
      `${BACKEND_URL}/api/payments/commissions${query ? `?${query}` : ""}`,
      { credentials: "include" },
    )

    if (!res.ok) throw new Error("Error al obtener reporte de comisiones")
    return res.json()
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return { totalGross: 0, totalNet: 0, totalCommission: 0, byProvider: [] }
    }
    throw error
  }
}
