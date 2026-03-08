/**
 * Centralized query key factory.
 *
 * Every key includes the tenant context (orgId + companyId) so that
 * TanStack Query never serves cached data from a different tenant.
 *
 * Usage:
 *   useQuery({ queryKey: queryKeys.products.list(orgId, companyId), ... })
 *   queryClient.invalidateQueries({ queryKey: queryKeys.products.root(orgId, companyId) })
 */

type TenantScope = readonly ["tenant", number | null, number | null]

function tenantScope(orgId: number | null, companyId: number | null): TenantScope {
  return ["tenant", orgId, companyId] as const
}

export const queryKeys = {
  // ── Products ───────────────────────────────────────────────
  products: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "products"] as const,
    list: (orgId: number | null, companyId: number | null, filters?: Record<string, unknown>) =>
      [...tenantScope(orgId, companyId), "products", "list", filters] as const,
    detail: (orgId: number | null, companyId: number | null, id: number) =>
      [...tenantScope(orgId, companyId), "products", "detail", id] as const,
  },

  // ── Sales ──────────────────────────────────────────────────
  sales: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "sales"] as const,
    list: (orgId: number | null, companyId: number | null, filters?: Record<string, unknown>) =>
      [...tenantScope(orgId, companyId), "sales", "list", filters] as const,
    detail: (orgId: number | null, companyId: number | null, id: number) =>
      [...tenantScope(orgId, companyId), "sales", "detail", id] as const,
    dashboard: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "sales", "dashboard"] as const,
  },

  // ── Entries (purchases) ────────────────────────────────────
  entries: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "entries"] as const,
    list: (orgId: number | null, companyId: number | null, filters?: Record<string, unknown>) =>
      [...tenantScope(orgId, companyId), "entries", "list", filters] as const,
    detail: (orgId: number | null, companyId: number | null, id: number) =>
      [...tenantScope(orgId, companyId), "entries", "detail", id] as const,
    documents: (orgId: number | null, companyId: number | null, filters?: Record<string, unknown>) =>
      [...tenantScope(orgId, companyId), "entries", "documents", filters] as const,
  },

  // ── Inventory ──────────────────────────────────────────────
  inventory: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "inventory"] as const,
    list: (orgId: number | null, companyId: number | null, filters?: Record<string, unknown>) =>
      [...tenantScope(orgId, companyId), "inventory", "list", filters] as const,
    detail: (orgId: number | null, companyId: number | null, productId: number) =>
      [...tenantScope(orgId, companyId), "inventory", "detail", productId] as const,
  },

  // ── Categories ─────────────────────────────────────────────
  categories: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "categories"] as const,
    list: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "categories", "list"] as const,
  },

  // ── Brands ─────────────────────────────────────────────────
  brands: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "brands"] as const,
    list: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "brands", "list"] as const,
  },

  // ── Stores ─────────────────────────────────────────────────
  stores: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "stores"] as const,
    list: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "stores", "list"] as const,
  },

  // ── Providers ──────────────────────────────────────────────
  providers: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "providers"] as const,
    list: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "providers", "list"] as const,
  },

  // ── Clients ────────────────────────────────────────────────
  clients: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "clients"] as const,
    list: (orgId: number | null, companyId: number | null, filters?: Record<string, unknown>) =>
      [...tenantScope(orgId, companyId), "clients", "list", filters] as const,
  },

  // ── Exchange rate ──────────────────────────────────────────
  exchange: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "exchange"] as const,
    current: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "exchange", "current"] as const,
  },

  // ── Users ──────────────────────────────────────────────────
  users: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "users"] as const,
    list: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "users", "list"] as const,
  },

  // ── Accounting ─────────────────────────────────────────────
  accounting: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "accounting"] as const,
    summary: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "accounting", "summary"] as const,
    healthScore: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "accounting", "healthScore"] as const,
    cashFlow: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "accounting", "cashFlow"] as const,
    accounts: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "accounting", "accounts"] as const,
  },

  // ── Dashboard ──────────────────────────────────────────────
  dashboard: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "dashboard"] as const,
    overview: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "dashboard", "overview"] as const,
  },

  // ── Cash register ──────────────────────────────────────────
  cashRegister: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "cashRegister"] as const,
    active: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "cashRegister", "active"] as const,
  },

  // ── Series ─────────────────────────────────────────────────
  series: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "series"] as const,
    list: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "series", "list"] as const,
  },

  // ── Vertical config ────────────────────────────────────────
  vertical: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "vertical"] as const,
    config: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "vertical", "config"] as const,
  },

  // ── Activity / History ─────────────────────────────────────
  activity: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "activity"] as const,
    list: (orgId: number | null, companyId: number | null, filters?: Record<string, unknown>) =>
      [...tenantScope(orgId, companyId), "activity", "list", filters] as const,
  },

  // ── Legal ──────────────────────────────────────────────────
  legal: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "legal"] as const,
    matters: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "legal", "matters"] as const,
    detail: (orgId: number | null, companyId: number | null, id: number) =>
      [...tenantScope(orgId, companyId), "legal", "detail", id] as const,
  },

  // ── Restaurant ─────────────────────────────────────────────
  restaurant: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "restaurant"] as const,
    orders: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "restaurant", "orders"] as const,
    tables: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "restaurant", "tables"] as const,
    ingredients: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "restaurant", "ingredients"] as const,
  },

  // ── Quotes ─────────────────────────────────────────────────
  quotes: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "quotes"] as const,
    list: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "quotes", "list"] as const,
  },

  // ── Catalog ────────────────────────────────────────────────
  catalog: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "catalog"] as const,
    list: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "catalog", "list"] as const,
  },

  // ── Subscriptions / Billing ────────────────────────────────
  subscriptions: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "subscriptions"] as const,
    plan: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "subscriptions", "plan"] as const,
    invoices: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "subscriptions", "invoices"] as const,
  },

  // ── Gym ────────────────────────────────────────────────────
  gym: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "gym"] as const,
    overview: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "gym", "overview"] as const,
    members: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "gym", "members"] as const,
    classes: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "gym", "classes"] as const,
    trainers: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "gym", "trainers"] as const,
    checkins: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "gym", "checkins"] as const,
    memberships: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "gym", "memberships"] as const,
  },

  // ── Orders ───────────────────────────────────────────────
  orders: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "orders"] as const,
    list: (orgId: number | null, companyId: number | null, filters?: Record<string, unknown>) =>
      [...tenantScope(orgId, companyId), "orders", "list", filters] as const,
  },

  // ── Super Users (global admin) ───────────────────────────
  superUsers: {
    root: () => ["superUsers"] as const,
    organizations: () => ["superUsers", "organizations"] as const,
  },

  // ── Onboarding ───────────────────────────────────────────
  onboarding: {
    root: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "onboarding"] as const,
    progress: (orgId: number | null, companyId: number | null) =>
      [...tenantScope(orgId, companyId), "onboarding", "progress"] as const,
  },
} as const