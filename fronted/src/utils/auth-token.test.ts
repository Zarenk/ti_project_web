import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("./tenant-preferences", () => ({
  getTenantSelection: vi.fn(),
}))

import * as authTokenModule from "./auth-token"
import { getTenantSelection } from "./tenant-preferences"

const mockedGetTenantSelection = vi.mocked(getTenantSelection)

describe("auth token utilities", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockedGetTenantSelection.mockReset()
  })

  it("returns bearer token and tenant headers when available", async () => {
    vi.spyOn(authTokenModule, "getAuthToken").mockResolvedValue("abc123")
    mockedGetTenantSelection.mockResolvedValue({ orgId: 55, companyId: 99 })

    const headers = await authTokenModule.getAuthHeaders()

    expect(headers.Authorization).toBe("Bearer abc123")
    expect(headers["x-org-id"]).toBe("55")
    expect(headers["x-company-id"]).toBe("99")
  })

  it("omits Authorization header when no token is present", async () => {
    vi.spyOn(authTokenModule, "getAuthToken").mockResolvedValue(null)
    mockedGetTenantSelection.mockResolvedValue({ orgId: 7, companyId: null })

    const headers = await authTokenModule.getAuthHeaders()

    expect(headers.Authorization).toBeUndefined()
    expect(headers["x-org-id"]).toBe("7")
    expect(headers["x-company-id"]).toBeUndefined()
  })

  it("ignores tenant selection failures gracefully", async () => {
    vi.spyOn(authTokenModule, "getAuthToken").mockResolvedValue("token")
    mockedGetTenantSelection.mockRejectedValue(new Error("boom"))

    const headers = await authTokenModule.getAuthHeaders()

    expect(headers.Authorization).toBe("Bearer token")
    expect(headers["x-org-id"]).toBeUndefined()
    expect(headers["x-company-id"]).toBeUndefined()
  })
})
