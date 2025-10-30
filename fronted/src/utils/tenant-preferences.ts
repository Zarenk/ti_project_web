const ORG_COOKIE = "tenant_org_id"
const COMPANY_COOKIE = "tenant_company_id"
const STORAGE_KEY = "dashboard.tenant-selection"
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 dias
export const TENANT_SELECTION_EVENT = "tenant-selection:change" as const

type TenantSelection = {
  orgId: number | null
  companyId: number | null
}

function parseNumber(value: string | null | undefined): number | null {
  if (value == null || value.trim().length === 0 || value === "null") {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function readSelectionFromDocument(): TenantSelection {
  if (typeof document === "undefined") {
    return { orgId: null, companyId: null }
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
      return raw ? (JSON.parse(raw) as Partial<TenantSelection>) : null
    } catch {
      return null
    }
  })()

  const orgCookie = parseNumber(cookies[ORG_COOKIE])
  const companyCookie = parseNumber(cookies[COMPANY_COOKIE])

  return {
    orgId: orgCookie ?? parseNumber(stored?.orgId?.toString() ?? null),
    companyId: companyCookie ?? parseNumber(stored?.companyId?.toString() ?? null),
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

export async function getTenantSelection(): Promise<TenantSelection> {
  if (typeof window === "undefined") {
    return readSelectionFromServer()
  }
  return readSelectionFromDocument()
}

export function setTenantSelection(selection: TenantSelection): void {
  if (typeof document === "undefined") {
    return
  }

  const { orgId, companyId } = selection
  const options = `path=/; max-age=${COOKIE_MAX_AGE_SECONDS}`

  if (orgId != null) {
    document.cookie = `${ORG_COOKIE}=${encodeURIComponent(String(orgId))}; ${options}`
  } else {
    document.cookie = `${ORG_COOKIE}=; path=/; max-age=0`
  }

  if (companyId != null) {
    document.cookie = `${COMPANY_COOKIE}=${encodeURIComponent(String(companyId))}; ${options}`
  } else {
    document.cookie = `${COMPANY_COOKIE}=; path=/; max-age=0`
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        orgId,
        companyId,
      } satisfies TenantSelection),
    )
  } catch {
    /* ignore */
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<TenantSelection>(TENANT_SELECTION_EVENT, {
        detail: { orgId, companyId },
      }),
    )
  }
}

export function clearTenantSelection(): void {
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
    window.dispatchEvent(
      new CustomEvent<TenantSelection>(TENANT_SELECTION_EVENT, {
        detail: { orgId: null, companyId: null },
      }),
    )
  }
}

export type { TenantSelection }

