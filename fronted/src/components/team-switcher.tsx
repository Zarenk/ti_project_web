"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react"
import { toast } from "sonner"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ModeToggle } from "./mode-toggle"
import {
  createCompany,
  listOrganizations,
  getCurrentTenant,
  type CompanyResponse,
  type OrganizationResponse,
  type CurrentTenantResponse,
} from "@/app/dashboard/tenancy/tenancy.api"
import {
  TENANT_ORGANIZATIONS_EVENT,
  TENANT_SELECTION_EVENT,
  getTenantSelection,
  setManualTenantSelection,
  type TenantSelection,
  type TenantSelectionChangeDetail,
} from "@/utils/tenant-preferences"
import { useAuth } from "@/context/auth-context"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { trackEvent } from "@/lib/analytics"
import {
  getOrganizationsCache,
  setOrganizationsCache,
} from "@/utils/tenant-organizations-cache"
import { getAuthToken } from "@/utils/auth-token"
import { VERTICAL_CONFIG_INVALIDATE_EVENT } from "@/hooks/use-vertical-config"

type ExtendedOrganization = OrganizationResponse & {
  companies: CompanyResponse[]
}

const SUPER_ROLES = new Set(["SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG"])

function normalizeOrganizations(orgs: OrganizationResponse[]): ExtendedOrganization[] {
  return orgs.map((org) => ({
    ...org,
    companies: Array.isArray(org.companies) ? org.companies : [],
  }))
}

export function TeamSwitcher(): React.ReactElement | null {
  const { isMobile } = useSidebar()
  const { role, isPublicSignup, userId } = useAuth()
  const { selection } = useTenantSelection()
  const router = useRouter()
  const normalizedRole = role ? role.toUpperCase() : null
  const isGlobalSuperAdmin = normalizedRole === "SUPER_ADMIN_GLOBAL"
  const isOrgSuperAdmin = normalizedRole === "SUPER_ADMIN_ORG"
  const isLandingUser = isOrgSuperAdmin && isPublicSignup !== false
  const showGlobalSwitcher = isGlobalSuperAdmin
  const roleLabel = useMemo(() => {
    if (!normalizedRole) return "Nivel: desconocido"
    const labels: Record<string, string> = {
      SUPER_ADMIN_GLOBAL: "Nivel: S. Admin Global",
      SUPER_ADMIN_ORG: "Nivel: S. Admin Organizacional",
      ADMIN: "Nivel: Administrador",
      EMPLOYEE: "Nivel: Empleado",
      CLIENT: "Nivel: Cliente",
      GUEST: "Nivel: Invitado",
    }
    if (labels[normalizedRole]) {
      return labels[normalizedRole]
    }
    const readable = normalizedRole
      .split("_")
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(" ")
    return `Nivel: ${readable}`
  }, [normalizedRole])

  const resolveVerticalLabel = useCallback((value?: string | null) => {
    if (!value) return "General"
    const normalized = value.toString().trim().toUpperCase()
    const labels: Record<string, string> = {
      GENERAL: "General",
      RETAIL: "Retail",
      RESTAURANTS: "Restaurante",
      SERVICES: "Servicios",
      MANUFACTURING: "Manufactura",
    }
    return labels[normalized] ?? normalized.toLowerCase()
  }, [])

  const [organizations, setOrganizations] = useState<ExtendedOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [activeOrgId, setActiveOrgId] = useState<number | null>(null)
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [companyLegalName, setCompanyLegalName] = useState("")
  const [companyTaxId, setCompanyTaxId] = useState("")
  const [companyStatus, setCompanyStatus] = useState("ACTIVE")

  const normalizedTaxId = companyTaxId.replace(/\D/g, "")
  const isTaxIdValid = normalizedTaxId.length === 0 || normalizedTaxId.length === 11
  const hasCompanyName = Boolean(companyName.trim())
  const hasCompanyStatus = Boolean(companyStatus.trim())

  const renderFieldChip = (filled: boolean, required?: boolean) => (
    <span
      className={`ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        filled
          ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
          : required
            ? "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
            : "border-border/60 bg-muted/30 text-muted-foreground"
      }`}
    >
      {filled ? <Check className="h-3 w-3" /> : null}
      {filled ? "Listo" : required ? "Requerido" : "Opcional"}
    </span>
  )
  const [submitting, setSubmitting] = useState(false)
  const [tenantSummary, setTenantSummary] = useState<CurrentTenantResponse | null>(null)

  const cancelRef = useRef(false)

  const fetchOrganizations = useCallback(
      async (providedSelection?: TenantSelection) => {
        if (!showGlobalSwitcher) return
        const token = await getAuthToken()
        if (!token || userId == null) {
          setOrganizations([])
          setActiveOrgId(null)
        setActiveCompanyId(null)
        setLoading(false)
        return
      }
      try {
        setLoading(true)
        const selection =
          providedSelection ?? (await getTenantSelection())

        if (!providedSelection) {
          const cached = getOrganizationsCache()
          if (cached) {
            const normalizedCached = normalizeOrganizations(cached)
            setOrganizations(normalizedCached)
            setLoading(false)
          }
        }

        const orgs = await listOrganizations()
        if (cancelRef.current) return

        setOrganizationsCache(orgs)
        const normalized = normalizeOrganizations(orgs)
        setOrganizations(normalized)

        const resolvedOrgId =
          selection.orgId ??
          normalized.find((org) => org.companies.length > 0)?.id ??
          normalized[0]?.id ??
          null

        const resolvedCompanyId =
          selection.companyId ??
          normalized.find((org) => org.id === resolvedOrgId)?.companies?.[0]?.id ??
          null

        setActiveOrgId(resolvedOrgId)
        setActiveCompanyId(resolvedCompanyId)

        const selectionOrg = selection.orgId
        const selectionCompany = selection.companyId
        const selectionOrgExists =
          selectionOrg != null &&
          normalized.some((org) => org.id === selectionOrg)
        const selectionCompanyExists =
          selectionOrgExists &&
          selectionCompany != null &&
          normalized
            .find((org) => org.id === selectionOrg)
            ?.companies?.some((company) => company.id === selectionCompany)

        const isSelectionValid = selectionOrgExists && selectionCompanyExists
        if (!isSelectionValid && resolvedOrgId && resolvedCompanyId) {
          setManualTenantSelection({ orgId: resolvedOrgId, companyId: resolvedCompanyId })
        }
      } catch (error) {
        if (!cancelRef.current) {
          console.error(error)
          toast.error("No se pudieron cargar las empresas disponibles.")
        }
      } finally {
        if (!cancelRef.current) {
          setLoading(false)
        }
      }
    },
    [showGlobalSwitcher, userId],
  )

  useEffect(() => {
    cancelRef.current = false

    if (showGlobalSwitcher) {
      void fetchOrganizations()
    } else {
      setActiveOrgId(selection.orgId ?? null)
      setActiveCompanyId(selection.companyId ?? null)
    }

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TenantSelectionChangeDetail>).detail
      if (showGlobalSwitcher) {
        void fetchOrganizations(detail)
      } else if (detail) {
        setActiveOrgId(detail.orgId ?? null)
        setActiveCompanyId(detail.companyId ?? null)
      }
    }

    if (typeof window !== "undefined") {
      window.addEventListener(TENANT_SELECTION_EVENT, handler as EventListener)
    }

    return () => {
      cancelRef.current = true
      if (typeof window !== "undefined") {
        window.removeEventListener(TENANT_SELECTION_EVENT, handler as EventListener)
      }
    }
  }, [fetchOrganizations, showGlobalSwitcher, selection.orgId, selection.companyId])

  useEffect(() => {
    if (!showGlobalSwitcher) return
    const handler = () => {
      void fetchOrganizations()
    }
    if (typeof window !== "undefined") {
      window.addEventListener(TENANT_ORGANIZATIONS_EVENT, handler)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(TENANT_ORGANIZATIONS_EVENT, handler)
      }
    }
  }, [fetchOrganizations, showGlobalSwitcher])

  // Re-fetch sidebar data when vertical changes
  useEffect(() => {
    const handler = () => {
      if (showGlobalSwitcher) {
        void fetchOrganizations()
      } else {
        // Non-super admin: re-fetch tenant summary to get updated vertical
        ;(async () => {
          try {
            const token = await getAuthToken()
            if (!token || userId == null) return
            const summary = await getCurrentTenant()
            setTenantSummary(summary)
          } catch {
            // Silently ignore - sidebar will show stale data until next navigation
          }
        })()
      }
    }
    window.addEventListener(VERTICAL_CONFIG_INVALIDATE_EVENT, handler)
    return () => window.removeEventListener(VERTICAL_CONFIG_INVALIDATE_EVENT, handler)
  }, [fetchOrganizations, showGlobalSwitcher, userId])

  useEffect(() => {
    if (showGlobalSwitcher || role === null) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const token = await getAuthToken()
        if (!token || userId == null) {
          if (!cancelled) {
            setTenantSummary(null)
            setLoading(false)
          }
          return
        }
        const summary = await getCurrentTenant()
        if (cancelled) return
        setTenantSummary(summary)
        const resolvedOrgId = summary.organization?.id ?? null
        const resolvedCompanyId = summary.company?.id ?? null
        setActiveOrgId(resolvedOrgId)
        setActiveCompanyId(resolvedCompanyId)
        if (
          selection.orgId !== resolvedOrgId ||
          selection.companyId !== resolvedCompanyId
        ) {
          setManualTenantSelection({ orgId: resolvedOrgId, companyId: resolvedCompanyId })
        }
      } catch (error) {
        if (!cancelled) {
          console.error("No se pudo obtener la organizacion actual", error)
          setTenantSummary(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showGlobalSwitcher, role, selection.orgId, selection.companyId, userId])

  useEffect(() => {
    if (!showGlobalSwitcher) return

    if (organizations.length === 0) {
      setActiveOrgId(null)
      setActiveCompanyId(null)
      return
    }

    const org =
      (activeOrgId !== null && organizations.find((item) => item.id === activeOrgId)) ??
      organizations[0]

    if (!org) {
      return
    }

    if (org.id !== activeOrgId) {
      setActiveOrgId(org.id)
      const nextCompanyId = org.companies[0]?.id ?? null
      setActiveCompanyId(nextCompanyId)
      const selectionOrgExists = organizations.some((item) => item.id === activeOrgId)
      const selectionCompanyExists =
        selectionOrgExists &&
        activeCompanyId != null &&
        organizations
          .find((item) => item.id === activeOrgId)
          ?.companies?.some((company) => company.id === activeCompanyId)
      if (!selectionOrgExists || !selectionCompanyExists) {
        setManualTenantSelection({ orgId: org.id, companyId: nextCompanyId })
      }
      return
    }

    if (
      activeCompanyId !== null &&
      !org.companies.some((company) => company.id === activeCompanyId)
    ) {
      const fallbackCompanyId = org.companies[0]?.id ?? null
      setActiveCompanyId(fallbackCompanyId)
      setManualTenantSelection({ orgId: org.id, companyId: fallbackCompanyId })
    }
  }, [organizations, activeOrgId, activeCompanyId, showGlobalSwitcher])

  const activeOrganization = useMemo(() => {
    if (organizations.length === 0) return null
    return (
      organizations.find((organization) => organization.id === activeOrgId) ??
      organizations[0]
    )
  }, [organizations, activeOrgId])

  const activeCompany = useMemo(() => {
    if (!activeOrganization) {
      return null
    }

    if (activeCompanyId === null) {
      return activeOrganization.companies[0] ?? null
    }

    return (
      activeOrganization.companies.find(
        (company) => company.id === activeCompanyId,
      ) ?? activeOrganization.companies[0] ?? null
    )
  }, [activeOrganization, activeCompanyId])

  const handleSelectCompany = useCallback(
    (organizationId: number | null, companyId: number | null) => {
      if (organizationId == null) {
        return
      }
      setActiveOrgId(organizationId)
      setActiveCompanyId(companyId)
      setManualTenantSelection({ orgId: organizationId, companyId })
      trackEvent("context_manual_change", {
        orgId: organizationId,
        companyId,
      })
      router.refresh()
    },
    [router],
  )

  const handleCreateCompany = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!activeOrganization) {
        toast.error("Selecciona una organizacion antes de crear empresas.")
        return
      }

      const trimmedName = companyName.trim()
      if (!trimmedName) {
        toast.error("El nombre de la empresa es obligatorio.")
        return
      }

      if (!isTaxIdValid) {
        toast.error("El RUC debe tener 11 numeros.")
        return
      }

      setSubmitting(true)
      try {
        const payload = {
          name: trimmedName,
          legalName: companyLegalName.trim() || undefined,
          taxId: normalizedTaxId || undefined,
          status: companyStatus.trim() || undefined,
          organizationId: activeOrganization.id,
        }

        const created = await createCompany(payload)
        setOrganizations((previous) =>
          previous.map((organization) =>
            organization.id === activeOrganization.id
              ? {
                  ...organization,
                  companies: [...organization.companies, created],
                }
              : organization,
          ),
        )

        setActiveOrgId(activeOrganization.id)
        setActiveCompanyId(created.id)
        setManualTenantSelection({ orgId: activeOrganization.id, companyId: created.id })
        router.refresh()

        setDialogOpen(false)
        setCompanyName("")
        setCompanyLegalName("")
        setCompanyTaxId("")
        setCompanyStatus("ACTIVE")

        toast.success("Empresa creada correctamente.")
      } catch (error) {
        console.error(error)
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo crear la empresa.",
        )
      } finally {
        setSubmitting(false)
      }
    },
    [
      activeOrganization,
      companyLegalName,
      companyName,
      companyStatus,
      normalizedTaxId,
      isTaxIdValid,
    ],
  )

  const canAddCompanies = showGlobalSwitcher && Boolean(activeOrganization)

  const resolvedNonSuperOrgId = tenantSummary?.organization?.id ?? activeOrgId
  const employeeCompanies = tenantSummary?.companies ?? []

  const handleEmployeeCompanySelect = useCallback(
    (companyId: number) => {
      if (resolvedNonSuperOrgId == null) {
        toast.error("No se pudo identificar la organizacion actual.")
        return
      }
      if (companyId === activeCompanyId) {
        return
      }
      handleSelectCompany(resolvedNonSuperOrgId, companyId)
      setTenantSummary((previous) => {
        if (!previous) return previous
        const nextCompany =
          previous.companies.find((company) => company.id === companyId) ??
          previous.company ??
          null
        return {
          ...previous,
          company: nextCompany,
        }
      })
    },
    [activeCompanyId, handleSelectCompany, resolvedNonSuperOrgId],
  )

  if (!showGlobalSwitcher) {
    if (loading && !tenantSummary) {
      return (
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex w-full items-center gap-2">
              <SidebarMenuButton size="lg" className="flex-1 justify-between">
                <span className="text-sm font-medium">Cargando organizacion...</span>
              </SidebarMenuButton>
              <ModeToggle />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      )
    }

    if (!tenantSummary?.organization) {
      return (
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex w-full items-center gap-2">
              <SidebarMenuButton size="lg" className="flex-1 justify-between">
                <span className="text-sm font-medium">
                  No se pudo cargar la organizacion activa
                </span>
              </SidebarMenuButton>
              <ModeToggle />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      )
    }

    const organizationLabel =
      tenantSummary.organization.name ??
      (selection.orgId != null ? `Organizacion ID ${selection.orgId}` : "Sin organizacion")

    const resolvedEmployeeCompany =
      employeeCompanies.find((company) => company.id === activeCompanyId) ??
      tenantSummary.company ??
      null

    const companyLabel =
      resolvedEmployeeCompany?.name ??
      (selection.companyId != null ? `Empresa ID ${selection.companyId}` : "Sin empresa asociada")
    const companyVerticalLabel = resolveVerticalLabel(
      resolvedEmployeeCompany?.businessVertical ??
        tenantSummary?.company?.businessVertical ??
        tenantSummary?.organization?.businessVertical,
    )
    const verticalTone = (
      resolvedEmployeeCompany?.businessVertical ??
      tenantSummary?.company?.businessVertical ??
      tenantSummary?.organization?.businessVertical ??
      companyVerticalLabel
    )
      .toString()
      .trim()
      .toUpperCase()
    const isRestaurantVertical = /RESTAURANT|RESTAURANTE/.test(verticalTone)
    const isRetailVertical = /RETAIL/.test(verticalTone)
    const isComputersVertical = /COMPUTER|COMPUTERS/.test(verticalTone)
    const isGeneralVertical = /GENERAL/.test(verticalTone)
    const verticalBarClass =
      isRestaurantVertical
        ? "bg-amber-400/90"
        : isRetailVertical || isComputersVertical
          ? "bg-sky-400/90"
          : isGeneralVertical
            ? "bg-emerald-400/90"
            : "bg-transparent"

    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <div className="flex-1">
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                          size="lg"
                          className="relative h-auto flex-1 cursor-pointer py-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                            <Building2 className="size-4" />
                          </div>
                          <div className="grid min-w-0 flex-1 text-left text-sm leading-snug">
                            <span className="line-clamp-1 font-medium">{companyLabel}</span>
                            <span className="line-clamp-1 text-xs">{organizationLabel}</span>
                            <span className="line-clamp-1 text-[10px] text-muted-foreground">
                              Tipo de empresa: {companyVerticalLabel}
                            </span>
                            <span className="line-clamp-1 text-[10px] text-muted-foreground">
                              {roleLabel}
                            </span>
                          </div>
                          <ChevronsUpDown className="ml-auto" />
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none absolute inset-x-0 bottom-0 h-0.5 ${verticalBarClass}`}
                          />
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    align="start"
                    sideOffset={12}
                    className="hidden w-64 rounded-xl border border-slate-200/60 bg-white/95 p-3 text-slate-900 shadow-xl dark:border-slate-700/60 dark:bg-slate-900/95 dark:text-slate-100 md:block"
                  >
                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Empresa
                        </p>
                        <p className="font-semibold">{companyLabel}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Organizaci&oacute;n
                        </p>
                        <p className="font-semibold">{organizationLabel}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Vertical
                        </span>
                        <span className="rounded-full border border-slate-200/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:border-slate-700/60">
                          {companyVerticalLabel}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Rol
                        </span>
                        <span className="rounded-full border border-slate-200/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:border-slate-700/60">
                          {roleLabel.replace("Nivel:", "").trim() || roleLabel}
                        </span>
                      </div>
                      {resolvedEmployeeCompany?.id ? (
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                          <span>ID empresa</span>
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {resolvedEmployeeCompany.id}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                align="start"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  {organizationLabel}
                </DropdownMenuLabel>
                {employeeCompanies.length > 0 ? (
                  employeeCompanies.map((company) => (
                    <DropdownMenuItem
                      key={company.id}
                      onClick={() => handleEmployeeCompanySelect(company.id)}
                      className="cursor-pointer gap-2 p-2"
                    >
                      <div className="flex size-6 items-center justify-center rounded-md border">
                        <Building2 className="size-3.5 shrink-0" />
                      </div>
                      <div className="flex-1 truncate">{company.name}</div>
                      {company.id === activeCompanyId ? (
                        <span className="text-[11px] text-muted-foreground">Actual</span>
                      ) : null}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled className="text-muted-foreground">
                    Sin empresas disponibles
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <ModeToggle />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (showGlobalSwitcher && loading && organizations.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex w-full items-center gap-2">
            <SidebarMenuButton size="lg" className="flex-1 justify-between">
              <span className="text-sm font-medium">Cargando empresas...</span>
            </SidebarMenuButton>
            <ModeToggle />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (showGlobalSwitcher && !activeOrganization) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex w-full items-center gap-2">
            <SidebarMenuButton size="lg" className="flex-1 justify-between">
              <span className="text-sm font-medium">Sin organizaciones</span>
            </SidebarMenuButton>
            <ModeToggle />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <div className="flex-1">
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                          size="lg"
                          className="relative h-auto flex-1 cursor-pointer py-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                            <Building2 className="size-4" />
                          </div>
                          <div className="grid min-w-0 flex-1 text-left text-sm leading-snug">
                            <span className="truncate font-medium">
                              {activeCompany?.name ?? "Sin empresas"}
                            </span>
                            <span className="truncate text-xs">{activeOrganization.name}</span>
                            <span className="line-clamp-1 text-[10px] text-muted-foreground">
                              Tipo de empresa: {resolveVerticalLabel(activeCompany?.businessVertical)}
                            </span>
                            <span className="line-clamp-1 text-[10px] text-muted-foreground">{roleLabel}</span>
                          </div>
                          <ChevronsUpDown className="ml-auto" />
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none absolute inset-x-0 bottom-0 h-0.5 ${
                              /RESTAURANT|RESTAURANTE/.test(
                                (
                                  activeCompany?.businessVertical ??
                                  activeOrganization?.businessVertical ??
                                  resolveVerticalLabel(
                                    activeCompany?.businessVertical ??
                                      activeOrganization?.businessVertical,
                                  )
                                )
                                  .toString()
                                  .trim()
                                  .toUpperCase(),
                              )
                                ? "bg-amber-400/90"
                                : /RETAIL|COMPUTER|COMPUTERS/.test(
                                      (
                                        activeCompany?.businessVertical ??
                                        activeOrganization?.businessVertical ??
                                        resolveVerticalLabel(
                                          activeCompany?.businessVertical ??
                                            activeOrganization?.businessVertical,
                                        )
                                      )
                                        .toString()
                                        .trim()
                                        .toUpperCase(),
                                    )
                                  ? "bg-sky-400/90"
                                  : /GENERAL/.test(
                                        (
                                          activeCompany?.businessVertical ??
                                          activeOrganization?.businessVertical ??
                                          resolveVerticalLabel(
                                            activeCompany?.businessVertical ??
                                              activeOrganization?.businessVertical,
                                          )
                                        )
                                          .toString()
                                          .trim()
                                          .toUpperCase(),
                                      )
                                    ? "bg-emerald-400/90"
                                    : "bg-transparent"
                            }`}
                          />
                        </SidebarMenuButton>
                      </DropdownMenuTrigger>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    align="start"
                    sideOffset={12}
                    className="hidden w-64 rounded-xl border border-slate-200/60 bg-white/95 p-3 text-slate-900 shadow-xl dark:border-slate-700/60 dark:bg-slate-900/95 dark:text-slate-100 md:block"
                  >
                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Empresa
                        </p>
                        <p className="font-semibold">
                          {activeCompany?.name ?? "Sin empresas"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Organizaci&oacute;n
                        </p>
                        <p className="font-semibold">{activeOrganization.name}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Vertical
                        </span>
                        <span className="rounded-full border border-slate-200/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:border-slate-700/60">
                          {resolveVerticalLabel(activeCompany?.businessVertical)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Rol
                        </span>
                        <span className="rounded-full border border-slate-200/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide dark:border-slate-700/60">
                          {roleLabel.replace("Nivel:", "").trim() || roleLabel}
                        </span>
                      </div>
                      {activeCompany?.id ? (
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                          <span>ID empresa</span>
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {activeCompany.id}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                align="start"
                side={isMobile ? "bottom" : "right"}
                sideOffset={4}
              >
                {organizations.map((organization) => (
                  <React.Fragment key={organization.id}>
                    <DropdownMenuLabel className="text-muted-foreground text-xs">
                      {organization.name}
                    </DropdownMenuLabel>
                    {organization.companies.length > 0 ? (
                      organization.companies.map((company) => (
                        <DropdownMenuItem
                          key={company.id}
                          onClick={() => handleSelectCompany(organization.id, company.id)}
                          className="cursor-pointer gap-2 p-2"
                        >
                          <div className="flex size-6 items-center justify-center rounded-md border">
                            <Building2 className="size-3.5 shrink-0" />
                          </div>
                          {company.name}
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled className="text-muted-foreground">
                        Sin empresas registradas
                      </DropdownMenuItem>
                    )}
                      {canAddCompanies ? (
                        <DropdownMenuItem
                          className="cursor-pointer gap-2 p-2"
                          onClick={() => {
                            setActiveOrgId(organization.id)
                            setActiveCompanyId(null)
                            setManualTenantSelection({ orgId: organization.id, companyId: null })
                            setDialogOpen(true)
                          }}
                        >
                        <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                          <Plus className="size-4" />
                        </div>
                        <div className="text-muted-foreground font-medium">Agregar empresa</div>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                  </React.Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <ModeToggle />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar empresa</DialogTitle>
            <DialogDescription>
              La nueva empresa se asociará a la organización{" "}
              <strong>{activeOrganization.name}</strong>.
            </DialogDescription>
          </DialogHeader>
            <form onSubmit={handleCreateCompany} className="mt-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">
                  Nombre comercial
                  {renderFieldChip(hasCompanyName, true)}
                </Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Mi Empresa S.A."
                  required
                  className="cursor-text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-legal-name">
                  Razon social (opcional)
                  {renderFieldChip(Boolean(companyLegalName.trim()))}
                </Label>
                <Input
                  id="company-legal-name"
                  value={companyLegalName}
                  onChange={(event) => setCompanyLegalName(event.target.value)}
                  placeholder="Mi Empresa Sociedad Anonima"
                  className="cursor-text"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-tax-id">
                  RUC / NIT (opcional)
                  {renderFieldChip(normalizedTaxId.length === 11)}
                </Label>
                <Input
                  id="company-tax-id"
                  value={normalizedTaxId}
                  onChange={(event) =>
                    setCompanyTaxId(event.target.value.replace(/\D/g, "").slice(0, 11))
                  }
                  placeholder="Ingrese el identificador fiscal"
                  inputMode="numeric"
                  pattern="\d{11}"
                  maxLength={11}
                  aria-invalid={!isTaxIdValid}
                  className={`cursor-text ${!isTaxIdValid ? "border-destructive" : ""}`}
                />
                {!isTaxIdValid ? (
                  <p className="text-xs text-destructive">
                    El RUC debe tener exactamente 11 numeros.
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-status">
                  Estado
                  {renderFieldChip(hasCompanyStatus, true)}
                </Label>
                <Input
                  id="company-status"
                  value={companyStatus}
                  onChange={(event) => setCompanyStatus(event.target.value)}
                  placeholder="ACTIVE"
                  className="cursor-text"
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting} className="cursor-pointer">
                  {submitting ? "Creando..." : "Crear empresa"}
                </Button>
              </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
