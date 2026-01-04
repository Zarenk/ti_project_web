import { describe, it, expect, beforeEach, vi } from "vitest"

vi.mock("@/utils/auth-token", () => ({
  getAuthHeaders: vi.fn(),
}))

import { fetchCompanyVerticalInfo } from "./tenancy.api"
import { getAuthHeaders } from "@/utils/auth-token"

const mockedAuthHeaders = getAuthHeaders as unknown as ReturnType<typeof vi.fn>

describe("fetchCompanyVerticalInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAuthHeaders.mockReset()
    global.fetch = vi.fn()
  })

  it("returns null when there is no authentication header", async () => {
    mockedAuthHeaders.mockResolvedValue({})

    const result = await fetchCompanyVerticalInfo(5)

    expect(result).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("returns the normalized payload when the backend responds successfully", async () => {
    mockedAuthHeaders.mockResolvedValue({ Authorization: "Bearer token" })

    const backendResponse = {
      organizationId: 3,
      companyId: 9,
      businessVertical: "RETAIL",
      config: { displayName: "Comercio Minorista" },
    }

    const jsonMock = vi.fn().mockResolvedValue(backendResponse)
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: jsonMock,
    })

    const result = await fetchCompanyVerticalInfo(9)

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:4000/api/companies/9/vertical",
      {
        headers: { Authorization: "Bearer token" },
        cache: "no-store",
      },
    )
    expect(result).toEqual(backendResponse)
  })

  it("returns null when backend responds with an error status", async () => {
    mockedAuthHeaders.mockResolvedValue({ Authorization: "Bearer token" })
    ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue(null),
    })

    const result = await fetchCompanyVerticalInfo(1)

    expect(result).toBeNull()
  })
})
