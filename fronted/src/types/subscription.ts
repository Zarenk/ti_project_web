export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED"

export type SubscriptionInterval = "MONTHLY" | "YEARLY"

export interface SubscriptionPlanOption {
  id: number
  code: string
  name: string
  description?: string | null
  interval: SubscriptionInterval
  price: string
  currency: string
  trialDays?: number | null
  features?: Record<string, unknown> | null
}

export interface SubscriptionSummary {
  organization: {
    id: number
    name: string | null
    slug: string | null
  } | null
  company: {
    id: number
    name: string | null
    legalName: string | null
  } | null
  plan: {
    name: string
    code: string
    status: SubscriptionStatus
    price: string | null
    currency: string
    interval: SubscriptionInterval
    features?: Record<string, unknown>
    isLegacy: boolean
    legacyGraceUntil: string | null
    restrictions?: {
      reason: string
      activatedAt: string | null
    } | null
  }
  trial: {
    isTrial: boolean
    daysLeft: number | null
    endsAt: string | null
  }
  billing: {
    currentPeriodStart: string | null
    currentPeriodEnd: string | null
    cancelAtPeriodEnd: boolean
    canceledAt: string | null
    lastInvoicePaidAt: string | null
    nextDueDate: string | null
  }
  contacts: {
    primary: {
      name: string
      email: string
    } | null
  }
  quotas: {
    users: number | null
    invoices: number | null
    storageMB: number | null
    [key: string]: number | null | undefined
  }
  usage: {
    users: number
    invoices: number
    storageMB: number
  }
}
