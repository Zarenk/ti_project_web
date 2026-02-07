"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"

import { toast } from "sonner"

import {
  TENANT_SELECTION_EVENT,
  clearTenantSelection,
  getTenantSelectionWithOwner,
  setTenantSelection,
  type TenantSelection,
  type TenantSelectionChangeDetail,
} from "@/utils/tenant-preferences"
import { getCurrentTenant, listOrganizations } from "@/app/dashboard/tenancy/tenancy.api"
import { ContextRestoreService } from "@/context/context-restore.service"
import { warmOrganizationsCache } from "@/utils/tenant-organizations-cache"
import { useAuth } from "@/context/auth-context"
import { prefetchTenantData } from "@/utils/tenant-prefetch"
import { io } from "socket.io-client"
import { SOCKET_URL } from "@/lib/utils"
import { getAuthToken } from "@/utils/auth-token"

const DISABLE_CONTEXT_SOCKET = process.env.NEXT_PUBLIC_DISABLE_CONTEXT_SOCKET === "true"

type RestoreStatus =
  | { state: "idle"; message?: string }
  | { state: "restoring"; message?: string }
  | { state: "offline"; message?: string }
  | { state: "error"; message?: string }

type TenantSelectionContextValue = {
  selection: TenantSelection
  version: number
  loading: boolean
  refresh: () => Promise<void>
  status: RestoreStatus
}

const DEFAULT_SELECTION: TenantSelection = { orgId: null, companyId: null }

const TenantSelectionContext = createContext<TenantSelectionContextValue | null>(null)

export function TenantSelectionProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [selection, setSelection] = useState<TenantSelection>(DEFAULT_SELECTION)
  const [version, setVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const { role, userId, isPublicSignup } = useAuth()
  const router = useRouter()
  const contextRestore = useMemo(() => {
    if (isPublicSignup) {
      return new ContextRestoreService({
        prefetchTenantData: (selection) =>
          prefetchTenantData(selection, {
            includeActivity: false,
            includePermissions: true,
          }),
      })
    }
    return new ContextRestoreService()
  }, [isPublicSignup])
  const restoreToastShownRef = useRef(false)
  const missingCookiesToastShownRef = useRef(false)
  const normalizedRole = role?.toUpperCase() ?? ""
  const isGlobalSuperAdmin = normalizedRole === "SUPER_ADMIN_GLOBAL"
  const isLandingUser =
    normalizedRole === "SUPER_ADMIN_ORG" && isPublicSignup !== false
  const canQueryOrganizations = isGlobalSuperAdmin
  const [status, setStatus] = useState<RestoreStatus>({
    state: "restoring",
    message: "Restaurando tu espacio de trabajo...",
  })
  const [socketAttempt, setSocketAttempt] = useState(0)
  const [socketDisabled, setSocketDisabled] = useState(false)
  const [pendingRefresh, setPendingRefresh] = useState(false)
  const manualOverrideUntilRef = useRef(0)

  const resolveReasonMessage = (reason: string | null): string => {
    switch (reason) {
      case "ORG_ACCESS_REVOKED":
        return "La organización que usabas ya no está disponible."
      case "ORG_NOT_FOUND":
        return "No pudimos encontrar la organización guardada."
      case "COMPANY_NOT_FOUND":
      case "COMPANY_INVALID":
        return "La empresa seleccionada ya no está disponible."
      case "INTEGRITY_FAILED":
        return "Detectamos cambios no válidos en tu contexto."
      default:
        return "No pudimos restaurar tu contexto. Selecciona una organización manualmente."
    }
  }
  const ensureDefaultSelection = useCallback(
    async (current: TenantSelection): Promise<TenantSelection> => {
      if (!userId) {
        return current
      }
      const restoration = await contextRestore.restore(current)

      if (restoration.selection) {
        setStatus({ state: "idle" })
        if (
          !restoreToastShownRef.current &&
          restoration.source &&
          restoration.source !== "session"
        ) {
          const message =
            restoration.source === "local"
              ? "Restauramos tu contexto desde este dispositivo."
              : "Sincronizamos tu contexto desde la nube."
          toast.success(message)
          restoreToastShownRef.current = true
        }
        const resolved = restoration.selection
        const changed =
          (current.orgId ?? null) !== (resolved.orgId ?? null) ||
          (current.companyId ?? null) !== (resolved.companyId ?? null)

        if (changed) {
          setTenantSelection(resolved, { ownerId: userId ?? null })
        }

        return resolved
      }

      if (
        restoration.reason &&
        restoration.reason !== "NO_CONTEXT" &&
        restoration.reason !== "PREFERENCE_DISABLED" &&
        restoration.source !== "session"
      ) {
        clearTenantSelection({ silent: true })
        setStatus({
          state: "error",
          message: resolveReasonMessage(restoration.reason),
        })
        toast.warning(
          "Tu contexto guardado ya no es v\u00e1lido. Selecciona una organizaci\u00f3n nuevamente.",
        )
      }

      if (restoration.reason === "PREFERENCE_DISABLED") {
        setStatus({ state: "idle" })
        return current
      }

      try {
        setStatus((prev) =>
          prev.state === "restoring"
            ? prev
            : { state: "restoring", message: "Buscando tus organizaciones disponibles..." },
        )
        const summary = await getCurrentTenant()
        const resolvedOrgId = current.orgId ?? summary.organization?.id ?? null
        const resolvedCompanyId =
          current.companyId ??
          summary.company?.id ??
          summary.companies?.[0]?.id ??
          null

        const resolved: TenantSelection = {
          orgId: resolvedOrgId,
          companyId: resolvedCompanyId,
        }

        const changed =
          (resolved.orgId ?? null) !== (current.orgId ?? null) ||
          (resolved.companyId ?? null) !== (current.companyId ?? null)

        if (changed && resolved.orgId && resolved.companyId) {
          setTenantSelection(resolved, { ownerId: userId ?? null })
          setStatus({ state: "idle" })
          return resolved
        }

        setStatus({ state: "idle" })
        return changed ? resolved : current
      } catch {
        setStatus({
          state: "offline",
          message:
            "Trabajando en modo offline. Algunas funciones pueden no estar disponibles.",
        })
        return current
      }
    },
    [contextRestore, userId],
  )
  const applySelection = useCallback((next: TenantSelection) => {
    setSelection((prev) => {
      const changed = prev.orgId !== next.orgId || prev.companyId !== next.companyId
      if (changed) {
        setVersion((current) => current + 1)
        setPendingRefresh(true)
      }
      return changed ? next : prev
    })
  }, [])

  useEffect(() => {
    if (!pendingRefresh) {
      return
    }
    setPendingRefresh(false)
    router.refresh()
  }, [pendingRefresh, router])

  const resolveSelection = useCallback(
    async (provided?: TenantSelection) => {
      const token = await getAuthToken()
      if (!token) {
        applySelection(DEFAULT_SELECTION)
        setStatus({ state: "idle" })
        setLoading(false)
        return
      }
      if (typeof document !== "undefined") {
        const hasTenantCookies =
          document.cookie.includes("tenant_org_id=") ||
          document.cookie.includes("tenant_company_id=")
        if (!hasTenantCookies && !missingCookiesToastShownRef.current) {
          missingCookiesToastShownRef.current = true
          toast.warning(
            "Se borraron las cookies o el contexto expiró. Selecciona una organización nuevamente.",
          )
        }
      }

      if (!isGlobalSuperAdmin) {
        try {
          setLoading(true)
          setStatus({
            state: "restoring",
            message: "Restaurando tu espacio de trabajo...",
          })
          const summary = await getCurrentTenant()
          const resolvedOrgId = summary.organization?.id ?? null
          const resolvedCompanyId =
            summary.company?.id ?? summary.companies?.[0]?.id ?? null
          applySelection({ orgId: resolvedOrgId, companyId: resolvedCompanyId })
          setStatus({ state: "idle" })
        } catch {
          setStatus({
            state: "offline",
            message:
              "Trabajando en modo offline. Algunas funciones pueden no estar disponibles.",
          })
        } finally {
          setLoading(false)
        }
        return
      }

      try {
        setLoading(true)
        setStatus({
          state: "restoring",
          message: "Restaurando tu espacio de trabajo...",
        })
        let baseSelection: TenantSelection
        if (provided) {
          baseSelection = provided
        } else {
          const { selection: storedSelection, ownerId } = await getTenantSelectionWithOwner()
          if (
            ownerId != null &&
            userId != null &&
            ownerId !== userId
          ) {
            clearTenantSelection()
            baseSelection = DEFAULT_SELECTION
          } else {
            baseSelection = storedSelection
          }
        }
        const ensured = await ensureDefaultSelection(baseSelection)
        applySelection(ensured)
      } finally {
        setLoading(false)
      }
    },
    [applySelection, ensureDefaultSelection, userId, isGlobalSuperAdmin],
  )

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      await resolveSelection()
    })()

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TenantSelectionChangeDetail>).detail
      if (detail?.source === "manual") {
        manualOverrideUntilRef.current = Date.now() + 3000
        applySelection({ orgId: detail.orgId ?? null, companyId: detail.companyId ?? null })
        setStatus({ state: "idle" })
        return
      }
      if (Date.now() < manualOverrideUntilRef.current) {
        return
      }
      void resolveSelection(detail ?? undefined)
    }

    window.addEventListener(TENANT_SELECTION_EVENT, handler as EventListener)
    return () => {
      cancelled = true
      window.removeEventListener(TENANT_SELECTION_EVENT, handler as EventListener)
    }
  }, [resolveSelection, applySelection])

  useEffect(() => {
    if (!canQueryOrganizations) {
      return
    }
    if (status.state !== "idle") {
      return
    }
    void warmOrganizationsCache(listOrganizations)
    void prefetchTenantData(selection, {
      includeMessages: true,
      includeOrganizations: true,
    })
  }, [canQueryOrganizations, status.state, selection])

  useEffect(() => {
    if (!userId || DISABLE_CONTEXT_SOCKET || socketDisabled) {
      return
    }
    const contextSocket = io(`${SOCKET_URL}/context`, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      timeout: 5000,
      query: { userId: String(userId) },
    })
    let connectionErrors = 0
    let fallbackInterval: ReturnType<typeof setInterval> | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const enableFallbackPolling = () => {
      if (fallbackInterval) {
        return
      }
      fallbackInterval = window.setInterval(() => {
        void resolveSelection()
      }, 15_000)
    }

    const disableFallbackPolling = () => {
      if (fallbackInterval) {
        clearInterval(fallbackInterval)
        fallbackInterval = null
      }
    }

    const scheduleReconnect = () => {
      if (reconnectTimer) {
        return
      }
      reconnectTimer = window.setTimeout(() => {
        setSocketAttempt((attempt) => attempt + 1)
      }, Math.min(30_000, 5_000 * (connectionErrors + 1)))
    }
    const handleRemoteChange = (payload: { orgId: number; companyId: number | null }) => {
      const sameOrg = (selection.orgId ?? null) === (payload.orgId ?? null)
      const sameCompany = (selection.companyId ?? null) === (payload.companyId ?? null)
      if (sameOrg && sameCompany) {
        return
      }
      void resolveSelection()
    }
    const handleConnect = () => {
      connectionErrors = 0
      disableFallbackPolling()
    }
    const handleConnectError = (error: Error) => {
      connectionErrors += 1
      console.warn("[context-socket] connect_error", error.message)
      if (connectionErrors >= 3) {
        console.warn("[context-socket] disabling realtime sync after repeated failures")
        enableFallbackPolling()
        setSocketDisabled(true)
        contextSocket.disconnect()
      } else {
        scheduleReconnect()
      }
    }
    contextSocket.on("connect", handleConnect)
    contextSocket.on("connect_error", handleConnectError)
    contextSocket.on("context:changed", handleRemoteChange)
    return () => {
      contextSocket.off("context:changed", handleRemoteChange)
      contextSocket.off("connect", handleConnect)
      contextSocket.off("connect_error", handleConnectError)
      contextSocket.disconnect()
      disableFallbackPolling()
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
    }
  }, [userId, selection.orgId, selection.companyId, resolveSelection, socketAttempt, socketDisabled])

  const value = useMemo<TenantSelectionContextValue>(
    () => ({
      selection,
      version,
      loading,
      refresh: () => resolveSelection(),
      status,
    }),
    [selection, version, loading, resolveSelection, status],
  )

  return <TenantSelectionContext.Provider value={value}>{children}</TenantSelectionContext.Provider>
}

export function useTenantSelection(): TenantSelectionContextValue {
  const context = useContext(TenantSelectionContext)
  if (!context) {
    throw new Error("useTenantSelection debe usarse dentro de TenantSelectionProvider")
  }
  return context
}

export function useOptionalTenantSelection(): TenantSelectionContextValue | null {
  return useContext(TenantSelectionContext)
}
