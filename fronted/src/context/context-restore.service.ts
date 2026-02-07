import { authFetch } from "@/utils/auth-fetch"
import { type TenantSelection } from "@/utils/tenant-preferences"
import {
  userContextStorage,
  type StoredUserContext,
} from "@/utils/user-context-storage"
import { shouldRememberContext } from "@/utils/context-preferences"
import { trackEvent } from "@/lib/analytics"
import { ValidationCache } from "./validation-cache"
import { prefetchTenantData as runTenantPrefetch } from "@/utils/tenant-prefetch"

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000
const VALIDATION_CACHE_MS = 10_000

type ContextSource = "local" | "remote" | "session" | "suggested"

type ContextCandidate = TenantSelection & {
  updatedAt: number
  source: ContextSource
  hash?: string | null
}

type ValidationResponse = {
  isValid: boolean
  reason: string | null
  permissions?: string[]
}

export type RestoreResult = {
  selection: TenantSelection | null
  source: ContextSource | null
  context: ContextCandidate | null
  validation: ValidationResponse | null
  reason: string | null
}

type UserContextStorageLike = Pick<
  typeof userContextStorage,
  "getLocalContext" | "clearContext"
>

type RestoreDependencies = {
  storage: UserContextStorageLike
  fetchRemoteContext: () => Promise<ContextCandidate | null>
  validateContext: (
    orgId: number,
    companyId: number | null,
  ) => Promise<ValidationResponse>
  now: () => number
  isRememberEnabled: () => boolean
  validationCache: ValidationCache<ValidationResponse>
  fetchSuggestion: () => Promise<{ orgId: number; companyId: number | null } | null>
  prefetchTenantData: (selection: TenantSelection) => Promise<void>
}

export type ContextStrategyName =
  | "control"
  | "remote_first"
  | "extended_ttl"

export type ContextStrategy = {
  name: ContextStrategyName
  ttlMs: number
  priority: ContextSource[]
  preferPriority: boolean
}

const STRATEGIES: Record<ContextStrategyName, ContextStrategy> = {
  control: {
    name: "control",
    ttlMs: DAYS_30_MS,
    priority: ["local", "remote", "session", "suggested"],
    preferPriority: false,
  },
  remote_first: {
    name: "remote_first",
    ttlMs: DAYS_30_MS,
    priority: ["remote", "local", "session", "suggested"],
    preferPriority: true,
  },
  extended_ttl: {
    name: "extended_ttl",
    ttlMs: 45 * 24 * 60 * 60 * 1000,
    priority: ["local", "remote", "session", "suggested"],
    preferPriority: false,
  },
}

function resolveStrategyFromEnv(): ContextStrategy {
  const raw =
    process.env.NEXT_PUBLIC_CONTEXT_RESTORE_VARIANT?.toLowerCase().trim() ?? ""
  if (raw && raw in STRATEGIES) {
    return STRATEGIES[raw as ContextStrategyName]
  }
  return STRATEGIES.control
}

const defaultDependencies: RestoreDependencies = {
  storage: userContextStorage,
  fetchRemoteContext: async () => {
    try {
      const res = await authFetch("/users/me", { cache: "no-store" })
      if (!res.ok) {
        return null
      }
      const payload = (await res.json()) as {
        lastContext?: {
          orgId?: number | null
          companyId?: number | null
          updatedAt?: string | null
          hash?: string | null
        }
      }
      const ctx = payload.lastContext
      if (!ctx || typeof ctx.orgId !== "number") {
        return null
      }
      const updatedAt =
        ctx.updatedAt && Number.isFinite(Date.parse(ctx.updatedAt))
          ? Date.parse(ctx.updatedAt)
          : 0
      return {
        orgId: ctx.orgId,
        companyId:
          typeof ctx.companyId === "number" && Number.isFinite(ctx.companyId)
            ? ctx.companyId
            : null,
        updatedAt,
        source: "remote",
        hash: ctx.hash ?? null,
      }
    } catch {
      return null
    }
  },
  validateContext: async (orgId, companyId) => {
    const params = new URLSearchParams({ orgId: String(orgId) })
    if (companyId != null) {
      params.set("companyId", String(companyId))
    }
    const res = await authFetch(`/users/me/validate-context?${params.toString()}`, {
      cache: "no-store",
    })
    if (!res.ok) {
      const payload = await res.text().catch(() => "")
      throw new Error(payload || "Context validation failed")
    }
    return (await res.json()) as ValidationResponse
  },
  now: () => Date.now(),
  isRememberEnabled: shouldRememberContext,
  validationCache: new ValidationCache<ValidationResponse>(VALIDATION_CACHE_MS),
  fetchSuggestion: async () => {
    const res = await authFetch("/users/me/context-suggestion", {
      cache: "no-store",
    })
    if (!res.ok) {
      return null
    }
    const data = (await res.json()) as {
      orgId?: number | null
      companyId?: number | null
    }
    if (typeof data?.orgId !== "number") {
      return null
    }
    return {
      orgId: data.orgId,
      companyId:
        typeof data.companyId === "number" && Number.isFinite(data.companyId)
          ? data.companyId
          : null,
    }
  },
  prefetchTenantData: (selection) =>
    runTenantPrefetch(selection, {
      includeActivity: false,
      includePermissions: true,
    }),
}

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") {
    return null
  }
  const pattern = new RegExp(`(?:^|; )${name}=([^;]*)`)
  const match = document.cookie.match(pattern)
  return match ? decodeURIComponent(match[1]) : null
}

export class ContextRestoreService {
  private readonly deps: RestoreDependencies
  private readonly strategy: ContextStrategy

  constructor(
    deps: Partial<RestoreDependencies> = {},
    strategy: ContextStrategy = resolveStrategyFromEnv(),
  ) {
    this.deps = {
      ...defaultDependencies,
      ...deps,
    }
    this.strategy = strategy
  }

  async restore(current: TenantSelection): Promise<RestoreResult> {
    const startedAt = this.deps.now()
    if (!this.deps.isRememberEnabled()) {
      this.track("context_restore_skipped", {
        reason: "PREFERENCE_DISABLED",
      })
      return {
        selection: null,
        source: null,
        context: null,
        validation: null,
        reason: "PREFERENCE_DISABLED",
      }
    }
    const candidates = await this.collectCandidates(current)
    const freshest = this.pickBestCandidate(candidates)

    if (!freshest) {
      this.track("context_restore_failure", { reason: "NO_CONTEXT" })
      return {
        selection: null,
        source: null,
        context: null,
        validation: null,
        reason: "NO_CONTEXT",
      }
    }

    try {
      const validation = await this.validateWithCache(
        freshest.orgId,
        freshest.companyId ?? null,
      )

      if (!validation.isValid) {
        this.track("context_restore_failure", {
          reason: validation.reason ?? "INVALID_CONTEXT",
          source: freshest.source,
          orgId: freshest.orgId,
          companyId: freshest.companyId ?? null,
        })
        this.deps.storage.clearContext({ silent: true })
        return {
          selection: null,
          source: freshest.source,
          context: freshest,
          validation,
          reason: validation.reason ?? "INVALID_CONTEXT",
        }
      }

      const latency = this.deps.now() - startedAt
      this.track("context_restore_success", {
        source: freshest.source,
        orgId: freshest.orgId,
        companyId: freshest.companyId ?? null,
        latency,
      })
      const selection = {
        orgId: freshest.orgId,
        companyId: freshest.companyId ?? null,
      }
      this.deps
        .prefetchTenantData(selection)
        .catch(() => undefined)

      return {
        selection,
        source: freshest.source,
        context: freshest,
        validation,
        reason: null,
      }
    } catch (error) {
      this.track("context_restore_failure", {
        reason: (error as Error)?.message ?? "VALIDATION_ERROR",
        source: freshest.source,
        orgId: freshest.orgId,
        companyId: freshest.companyId ?? null,
      })
      return {
        selection: {
          orgId: freshest.orgId,
          companyId: freshest.companyId ?? null,
        },
        source: freshest.source,
        context: freshest,
        validation: null,
        reason: null,
      }
    }
  }

  private async collectCandidates(
    current: TenantSelection,
  ): Promise<ContextCandidate[]> {
    const candidates: ContextCandidate[] = []
    const local = this.deps.storage.getLocalContext()
    const hasTenantCookies =
      readCookieValue("tenant_org_id") != null ||
      readCookieValue("tenant_company_id") != null
    if (local && this.isFresh(local) && hasTenantCookies) {
      candidates.push({
        orgId: local.orgId,
        companyId: local.companyId ?? null,
        updatedAt: local.updatedAt,
        source: "local",
        hash: local.hash,
      })
    }

    const remote = await this.deps.fetchRemoteContext()
    if (remote && this.isFresh(remote)) {
      candidates.push(remote)
    }

    if (current.orgId && current.companyId) {
      candidates.push({
        orgId: current.orgId,
        companyId: current.companyId,
        updatedAt: 0,
        source: "session",
      })
    }

    if (candidates.length === 0) {
      const suggestion = await this.deps.fetchSuggestion()
      if (suggestion) {
        candidates.push({
          orgId: suggestion.orgId,
          companyId: suggestion.companyId ?? null,
          updatedAt: this.deps.now() - 1,
          source: "suggested",
        })
      }
    }

    return candidates
  }

  private pickBestCandidate(
    candidates: ContextCandidate[],
  ): ContextCandidate | null {
    if (!candidates.length) {
      return null
    }
    if (!this.strategy.preferPriority) {
      return candidates.reduce((latest, current) =>
        current.updatedAt > latest.updatedAt ? current : latest,
      )
    }
    const priorities = new Map<ContextSource, number>()
    this.strategy.priority.forEach((source, index) => {
      priorities.set(source, this.strategy.priority.length - index)
    })
    return candidates
      .slice()
      .sort((a, b) => {
        const priorityDiff =
          (priorities.get(b.source) ?? 0) - (priorities.get(a.source) ?? 0)
        if (priorityDiff !== 0) {
          return priorityDiff
        }
        return (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
      })[0]
  }

  private isFresh(context: { updatedAt: number }): boolean {
    if (!Number.isFinite(context.updatedAt)) {
      return false
    }
    const age = this.deps.now() - context.updatedAt
    return age < this.strategy.ttlMs
  }

  private async validateWithCache(
    orgId: number,
    companyId: number | null,
  ): Promise<ValidationResponse> {
    const key = `${orgId}:${companyId ?? "null"}`
    const cached = this.deps.validationCache.get(key)
    if (cached) {
      return cached
    }

    const result = await this.deps.validateContext(orgId, companyId)
    this.deps.validationCache.set(key, result)
    return result
  }

  private track(event: string, payload: Record<string, unknown>) {
    trackEvent(event, { variant: this.strategy.name, ...payload })
  }
}
