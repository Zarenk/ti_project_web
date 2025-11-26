import { describe, expect, it, vi } from "vitest"

import {
  ContextRestoreService,
  type ContextStrategy,
} from "@/context/context-restore.service"

const baseSelection = { orgId: null, companyId: null }

const defaultStrategy: ContextStrategy = {
  name: "control",
  ttlMs: 30 * 24 * 60 * 60 * 1000,
  priority: ["local", "remote", "session", "suggested"],
  preferPriority: false,
}

const createService = (overrides: any = {}, strategy = defaultStrategy) => {
  const storage = {
    getLocalContext: vi.fn(() => null),
    clearContext: vi.fn(),
  }

  const service = new ContextRestoreService({
    storage,
    fetchRemoteContext: vi.fn(async () => null),
    validateContext: vi.fn(async () => ({ isValid: true, reason: null })),
    now: () => 10_000,
    isRememberEnabled: () => true,
    validationCacheMs: 10_000,
    fetchSuggestion: vi.fn(async () => null),
    ...overrides,
  } as any, strategy)

  return { service, storage }
}

describe("ContextRestoreService", () => {
  it("prefers local context when fresher than remote", async () => {
    const localContext = {
      orgId: 5,
      companyId: 10,
      updatedAt: 9_500,
      source: "local" as const,
    }
    const remoteContext = {
      orgId: 7,
      companyId: 14,
      updatedAt: 8_000,
      source: "remote" as const,
    }

    const { service } = createService({
      storage: {
        getLocalContext: () =>
          ({
            orgId: localContext.orgId,
            companyId: localContext.companyId,
            updatedAt: localContext.updatedAt,
          }) satisfies any,
        clearContext: vi.fn(),
      },
      fetchRemoteContext: vi.fn(async () => remoteContext),
    })

    const result = await service.restore(baseSelection)
    expect(result.selection).toEqual({ orgId: 5, companyId: 10 })
    expect(result.source).toBe("local")
  })

  it("falls back to remote context when local is stale", async () => {
    const { service } = createService({
      storage: {
        getLocalContext: () =>
          ({
            orgId: 1,
            companyId: 2,
            updatedAt: 0,
          }) satisfies any,
        clearContext: vi.fn(),
      },
      fetchRemoteContext: vi.fn(async () => ({
        orgId: 15,
        companyId: null,
        updatedAt: 9_500,
        source: "remote" as const,
      })),
    })

    const result = await service.restore(baseSelection)
    expect(result.selection).toEqual({ orgId: 15, companyId: null })
    expect(result.source).toBe("remote")
  })

  it("clears cached context when validation fails", async () => {
    const clearContext = vi.fn()
    const { service } = createService({
      storage: {
        getLocalContext: () =>
          ({
            orgId: 30,
            companyId: 40,
            updatedAt: 9_500,
          }) satisfies any,
        clearContext,
      },
      validateContext: vi.fn(async () => ({
        isValid: false,
        reason: "ORG_ACCESS_REVOKED",
      })),
    })

    const result = await service.restore(baseSelection)
    expect(result.selection).toBeNull()
    expect(result.reason).toBe("ORG_ACCESS_REVOKED")
    expect(clearContext).toHaveBeenCalled()
  })

  it("returns null when there are no candidates", async () => {
    const { service } = createService({
      fetchRemoteContext: vi.fn(async () => null),
      fetchSuggestion: vi.fn(async () => null),
    })

    const result = await service.restore(baseSelection)
    expect(result.selection).toBeNull()
    expect(result.reason).toBe("NO_CONTEXT")
  })

  it("short-circuits when preference is disabled", async () => {
    const { service } = createService({
      isRememberEnabled: () => false,
    })
    const result = await service.restore(baseSelection)
    expect(result.selection).toBeNull()
    expect(result.reason).toBe("PREFERENCE_DISABLED")
  })

  it("uses suggestion when no other context is available", async () => {
    const { service } = createService({
      fetchRemoteContext: vi.fn(async () => null),
      fetchSuggestion: vi.fn(async () => ({ orgId: 99, companyId: 77 })),
    })
    const result = await service.restore(baseSelection)
    expect(result.selection).toEqual({ orgId: 99, companyId: 77 })
    expect(result.source).toBe("suggested")
  })

  it("honors strategy priority when selecting candidates", async () => {
    const remoteFirst: ContextStrategy = {
      name: "remote_first",
      ttlMs: 30 * 24 * 60 * 60 * 1000,
      priority: ["remote", "local", "session", "suggested"],
      preferPriority: true,
    }

    const { service } = createService(
      {
        storage: {
          getLocalContext: () =>
            ({
              orgId: 1,
              companyId: 2,
              updatedAt: 9_900,
            }) satisfies any,
          clearContext: vi.fn(),
        },
        fetchRemoteContext: vi.fn(async () => ({
          orgId: 50,
          companyId: 60,
          updatedAt: 9_800,
          source: "remote" as const,
        })),
      },
      remoteFirst,
    )

    const result = await service.restore(baseSelection)
    expect(result.selection).toEqual({ orgId: 50, companyId: 60 })
    expect(result.source).toBe("remote")
  })

  it("respects variant TTL when checking freshness", async () => {
    const extended: ContextStrategy = {
      name: "extended_ttl",
      ttlMs: Number.MAX_SAFE_INTEGER,
      priority: ["local", "remote", "session", "suggested"],
      preferPriority: false,
    }

    const { service } = createService(
      {
        storage: {
          getLocalContext: () =>
            ({
              orgId: 21,
              companyId: 22,
              updatedAt: 1,
            }) satisfies any,
          clearContext: vi.fn(),
        },
        fetchRemoteContext: vi.fn(async () => null),
      },
      extended,
    )

    const result = await service.restore(baseSelection)
    expect(result.selection).toEqual({ orgId: 21, companyId: 22 })
    expect(result.source).toBe("local")
  })
})
