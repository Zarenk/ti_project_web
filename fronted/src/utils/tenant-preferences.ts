import { userContextStorage } from "@/utils/user-context-storage"
import { shouldRememberContext } from "@/utils/context-preferences"

const ORG_COOKIE = "tenant_org_id"
const COMPANY_COOKIE = "tenant_company_id"
const STORAGE_KEY = "dashboard.tenant-selection"
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 dias
export const TENANT_SELECTION_EVENT = "tenant-selection:change" as const
export const TENANT_ORGANIZATIONS_EVENT = "tenant-selection:organizations-refresh" as const

type TenantSelection = {
  orgId: number | null
  companyId: number | null
}

type StoredTenantSelection = TenantSelection & {
  ownerId?: number | null
}

type TenantSelectionChangeDetail = TenantSelection & {
  source?: "manual" | "system"
}

function parseNumber(value: string | null | undefined): number | null {
  if (value == null || value.trim().length === 0 || value === "null") {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function readSelectionWithOwnerFromDocument(): {
  selection: TenantSelection
  ownerId: number | null
} {
  if (typeof document === "undefined") {
    return { selection: { orgId: null, companyId: null }, ownerId: null }
  }
  const cookies = document.cookie.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawKey, rawValue] = part.split("=")
    if (!rawKey) return acc
    const key = rawKey.trim()
    if (!key) return acc
    acc[key] = decodeURIComponent(rawValue ?? "")
    return acc
  }, {})

  const stored = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as StoredTenantSelection) : null
    } catch {
      return null
    }
  })()

  const orgCookie = parseNumber(cookies[ORG_COOKIE])
  const companyCookie = parseNumber(cookies[COMPANY_COOKIE])

  return {
    selection: {
      orgId: orgCookie ?? parseNumber(stored?.orgId?.toString() ?? null),
      companyId: companyCookie ?? parseNumber(stored?.companyId?.toString() ?? null),
    },
    ownerId: parseNumber(stored?.ownerId?.toString() ?? null),
  }
}

async function readSelectionFromServer(): Promise<TenantSelection> {
  try {
    const { cookies } = await import("next/headers")
    const store = await cookies()
    const org = store.get(ORG_COOKIE)?.value ?? null
    const company = store.get(COMPANY_COOKIE)?.value ?? null

    return {
      orgId: parseNumber(org),
      companyId: parseNumber(company),
    }
  } catch {
    return { orgId: null, companyId: null }
  }
}

async function readSelectionWithOwnerFromServer(): Promise<{
  selection: TenantSelection
  ownerId: number | null
}> {
  const selection = await readSelectionFromServer()
  return { selection, ownerId: null }
}

export async function getTenantSelectionWithOwner(): Promise<{
  selection: TenantSelection
  ownerId: number | null
}> {
  if (typeof window === "undefined") {
    return readSelectionWithOwnerFromServer()
  }
  return readSelectionWithOwnerFromDocument()
}

export async function getTenantSelection(): Promise<TenantSelection> {
  const { selection } = await getTenantSelectionWithOwner()
  return selection
}

export function setTenantSelection(
  selection: TenantSelection,
  metadata?: { source?: "manual" | "system"; ownerId?: number | null },
): void {
  if (typeof document === "undefined") {
    return
  }

  const { orgId, companyId } = selection
  const cookieOptions = `path=/; max-age=${COOKIE_MAX_AGE_SECONDS}`

  if (orgId != null) {
    document.cookie = `${ORG_COOKIE}=${encodeURIComponent(String(orgId))}; ${cookieOptions}`
  } else {
    document.cookie = `${ORG_COOKIE}=; path=/; max-age=0`
  }

  if (companyId != null) {
    document.cookie = `${COMPANY_COOKIE}=${encodeURIComponent(String(companyId))}; ${cookieOptions}`
  } else {
    document.cookie = `${COMPANY_COOKIE}=; path=/; max-age=0`
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        orgId,
        companyId,
        ownerId: metadata?.ownerId ?? null,
      } satisfies StoredTenantSelection),
    )
  } catch {
    /* ignore */
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<TenantSelectionChangeDetail>(TENANT_SELECTION_EVENT, {
        detail: {
          orgId,
          companyId,
          source: metadata?.source ?? "system",
        },
      }),
    )
  }

  if (orgId != null && shouldRememberContext()) {
    void userContextStorage.saveContext(orgId, companyId ?? null)
  } else {
    userContextStorage.clearContext({ silent: orgId != null })
  }
}

export function clearTenantSelection(options?: { silent?: boolean }): void {
  if (typeof document === "undefined") {
    return
  }
  document.cookie = `${ORG_COOKIE}=; path=/; max-age=0`
  document.cookie = `${COMPANY_COOKIE}=; path=/; max-age=0`
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }

  if (typeof window !== "undefined") {
    if (!options?.silent) {
      window.dispatchEvent(
        new CustomEvent<TenantSelectionChangeDetail>(TENANT_SELECTION_EVENT, {
          detail: { orgId: null, companyId: null, source: "system" },
        }),
      )
    }
  }

  userContextStorage.clearContext(options)
}

export function setManualTenantSelection(
  selection: TenantSelection,
  metadata?: { ownerId?: number | null },
): void {
  setTenantSelection(selection, { source: "manual", ownerId: metadata?.ownerId })
}

export type { TenantSelection, TenantSelectionChangeDetail }
