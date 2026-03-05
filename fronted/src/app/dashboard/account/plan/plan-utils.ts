import type { SubscriptionSummary, SubscriptionStatus } from "@/types/subscription"
import type { OrganizationCompaniesOverview } from "@/app/dashboard/tenancy/tenancy.api"

// ── Types ──────────────────────────────────────────────────────

export type UsageMetric = {
  used: number
  limit: number | null
  percent: number | null
}

export type GlobalPlanUsage = {
  orgId: number
  orgName: string
  planName: string
  planCode: string
  status: SubscriptionStatus
  users: UsageMetric
  invoices: UsageMetric
  storageMB: UsageMetric
  alert: string
  hasIssue: boolean
  summary: SubscriptionSummary | null
}

// ── Constants ──────────────────────────────────────────────────

export const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  TRIAL: "Periodo de prueba",
  ACTIVE: "Activa",
  PAST_DUE: "Cobro pendiente",
  CANCELED: "Cancelada",
}

export const CANCEL_REASONS = [
  { value: "missing_features", label: "Necesito funciones adicionales" },
  { value: "support", label: "No recibi el soporte esperado" },
  { value: "price", label: "El precio no se ajusta a mi presupuesto" },
  { value: "not_using", label: "Ya no usamos la plataforma" },
  { value: "data_quality", label: "Problemas con mi informacion" },
  { value: "other", label: "Otro motivo" },
] as const

export const COMPLIMENTARY_DURATIONS = [
  { value: "1", label: "1 mes" },
  { value: "3", label: "3 meses" },
  { value: "6", label: "6 meses" },
  { value: "12", label: "1 ano" },
] as const

// ── Status badge helpers ───────────────────────────────────────

export function getStatusBadgeClass(status: SubscriptionStatus): string {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800"
    case "TRIAL":
      return "bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-100 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800"
    case "PAST_DUE":
      return "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800"
    case "CANCELED":
      return "bg-red-100 text-red-800 border-red-200 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800"
    default:
      return ""
  }
}

// ── Feature label helpers ──────────────────────────────────────

const FEATURE_LABELS: Record<string, string> = {
  max_users: "Usuarios",
  max_invoices: "Comprobantes al mes",
  max_storage_mb: "Almacenamiento (MB)",
  max_companies: "Empresas",
  max_stores: "Tiendas",
  whatsapp: "WhatsApp",
  ecommerce: "E-commerce",
  accounting: "Contabilidad",
  legal: "Modulo legal",
  gym: "Modulo gimnasio",
  restaurant: "Modulo restaurante",
  api_access: "Acceso API",
  priority_support: "Soporte prioritario",
}

export function humanizeFeatureKey(key: string): string {
  return FEATURE_LABELS[key] ?? key.replace(/_/g, " ")
}

export function humanizeFeatureValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "Incluido" : "No incluido"
  if (typeof value === "number") return value.toLocaleString("es-PE")
  return String(value)
}

// ── Usage metric helpers ───────────────────────────────────────

export function computeUsageMetric(used?: number, limit?: number | null): UsageMetric {
  const safeUsed = typeof used === "number" && Number.isFinite(used) ? used : 0
  const safeLimit =
    typeof limit === "number" && Number.isFinite(limit) && limit > 0 ? Math.max(1, Math.floor(limit)) : null
  const percent = safeLimit ? Math.round((safeUsed / safeLimit) * 100) : null
  return {
    used: safeUsed,
    limit: safeLimit,
    percent: percent !== null ? Math.min(percent, 999) : null,
  }
}

export function formatUsageMetric(metric: UsageMetric, label: string) {
  if (metric.limit === null) {
    return `${metric.used} ${label} (sin limite)`
  }
  const percentText = metric.percent !== null ? ` (${metric.percent}%)` : ""
  return `${metric.used}/${metric.limit} ${label}${percentText}`
}

export function formatStorageUsage(metric: UsageMetric) {
  const used = formatStorageValue(metric.used)
  const total = metric.limit === null ? "sin limite" : formatStorageValue(metric.limit)
  const percentText = metric.percent !== null ? ` (${metric.percent}%)` : ""
  return `${used} / ${total}${percentText}`
}

export function formatStorageValue(value: number) {
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} GB`
  }
  return `${value} MB`
}

// ── Formatting helpers ─────────────────────────────────────────

export function formatPrice(amount: string, currency: string) {
  const numeric = Number(amount)
  if (!Number.isFinite(numeric)) {
    return `${currency} ${amount}`
  }
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: currency || "PEN",
    minimumFractionDigits: 2,
  }).format(numeric)
}

export function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleDateString("es-PE", { dateStyle: "medium" })
}

// ── Global usage builder ───────────────────────────────────────

export function buildGlobalPlanUsage(
  org: OrganizationCompaniesOverview,
  summary: SubscriptionSummary | null,
): GlobalPlanUsage {
  const fallbackMetric: UsageMetric = { used: 0, limit: null, percent: null }

  if (!summary) {
    return {
      orgId: org.id,
      orgName: org.name,
      planName: "Sin datos",
      planCode: "N/D",
      status: "ACTIVE",
      users: fallbackMetric,
      invoices: fallbackMetric,
      storageMB: fallbackMetric,
      alert: "Sin datos disponibles",
      hasIssue: true,
      summary: null,
    }
  }

  const planStatus = summary.plan.status
  const users = computeUsageMetric(summary.usage?.users, summary.quotas?.users)
  const invoices = computeUsageMetric(summary.usage?.invoices, summary.quotas?.invoices)
  const storageMB = computeUsageMetric(summary.usage?.storageMB, summary.quotas?.storageMB)

  let alert = "Consumo saludable"
  let hasIssue = false

  const metrics = [users, invoices, storageMB]
  const exceeded = metrics.some((metric) => metric.percent !== null && metric.percent >= 100)
  const warning = metrics.some((metric) => metric.percent !== null && metric.percent >= 90)

  if (exceeded) {
    alert = "Limite excedido en uno de los recursos"
    hasIssue = true
  } else if (warning) {
    alert = "Cerca al limite permitido"
    hasIssue = true
  }

  if (planStatus !== "ACTIVE") {
    alert = `Estado ${STATUS_LABEL[planStatus].toLowerCase()}`
    hasIssue = true
  }

  return {
    orgId: org.id,
    orgName: org.name,
    planName: summary.plan.name,
    planCode: summary.plan.code,
    status: planStatus,
    users,
    invoices,
    storageMB,
    alert,
    hasIssue,
    summary,
  }
}
