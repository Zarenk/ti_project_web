import { describe, expect, it, beforeEach, afterEach, vi } from "vitest"

import {
  clearTenantSelection,
  getTenantSelection,
  setTenantSelection,
  type TenantSelection,
} from "./tenant-preferences"

const ORIGINAL_WINDOW = globalThis.window
const ORIGINAL_DOCUMENT = globalThis.document
const ORIGINAL_LOCAL_STORAGE = (globalThis as any).localStorage

const COOKIE_OPTIONS_REGEX = /;\s*/

function createDocumentStub() {
  const cookieStore = new Map<string, string>()

  return {
    get cookie(): string {
      return Array.from(cookieStore.entries())
        .map(([key, value]) => `${key}=${value}`)
        .join("; ")
    },
    set cookie(value: string) {
      const [pair, ...directives] = value.split(COOKIE_OPTIONS_REGEX)
      const [rawKey, rawValue = ""] = pair.split("=")
      const key = rawKey?.trim()
      if (!key) return

      const hasMaxAgeZero = directives.some((directive) => {
        const [dKey, dValue] = directive.split("=")
        return dKey?.trim().toLowerCase() === "max-age" && dValue?.trim() === "0"
      })

      if (hasMaxAgeZero) {
        cookieStore.delete(key)
        return
      }

      cookieStore.set(key, rawValue)
    },
  }
}

function createStorageStub() {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value)
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
  }
}

describe("tenant-preferences utilities", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: undefined,
    })
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: undefined,
    })
  })

  afterEach(() => {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: ORIGINAL_DOCUMENT,
    })
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: ORIGINAL_WINDOW,
    })
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: ORIGINAL_LOCAL_STORAGE,
    })
  })

  it("reads tenant selection from server cookies when running on the server", async () => {
    const cookieValues: Record<string, string | undefined> = {
      tenant_org_id: "7",
      tenant_company_id: "15",
    }

    const getMock = vi.fn((key: string) => {
      const value = cookieValues[key]
      return value ? { value } : undefined
    })

    vi.mock("next/headers", () => ({
      cookies: vi.fn(async () => ({
        get: getMock,
      })),
    }))

    const selection = await getTenantSelection()
    expect(selection).toEqual({ orgId: 7, companyId: 15 })
    expect(getMock).toHaveBeenCalledWith("tenant_org_id")
    expect(getMock).toHaveBeenCalledWith("tenant_company_id")
  })

  it("persists tenant selection to cookies and localStorage on the client", async () => {
    const documentStub = createDocumentStub()
    const storageStub = createStorageStub()

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: documentStub,
    })
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {},
    })
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storageStub,
    })

    const selection: TenantSelection = { orgId: 42, companyId: 101 }
    setTenantSelection(selection)

    const cookieSnapshot = documentStub.cookie
    expect(cookieSnapshot).toContain("tenant_org_id=42")
    expect(cookieSnapshot).toContain("tenant_company_id=101")
    expect(storageStub.setItem).toHaveBeenCalledWith(
      "dashboard.tenant-selection",
      JSON.stringify(selection),
    )

    const resolved = await getTenantSelection()
    expect(resolved).toEqual(selection)
  })

  it("clears tenant selection from cookies and storage when requested", async () => {
    const documentStub = createDocumentStub()
    const storageStub = createStorageStub()

    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: documentStub,
    })
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {},
    })
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: storageStub,
    })

    setTenantSelection({ orgId: 5, companyId: 9 })
    clearTenantSelection()

    expect(documentStub.cookie).not.toContain("tenant_org_id")
    expect(documentStub.cookie).not.toContain("tenant_company_id")
    expect(storageStub.removeItem).toHaveBeenCalledWith("dashboard.tenant-selection")
  })
})
