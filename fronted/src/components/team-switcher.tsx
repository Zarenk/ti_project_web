"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, ChevronsUpDown, Plus } from "lucide-react"
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
import { ModeToggle } from "./mode-toggle"
import {
  createCompany,
  listOrganizations,
  type CompanyResponse,
  type OrganizationResponse,
} from "@/app/dashboard/tenancy/tenancy.api"
import {
  TENANT_SELECTION_EVENT,
  getTenantSelection,
  setTenantSelection,
  type TenantSelection,
} from "@/utils/tenant-preferences"
import { useAuth } from "@/context/auth-context"

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
  const { role } = useAuth()
  const router = useRouter()
  const normalizedRole = role ? role.toUpperCase() : null
  const isSuperUser = normalizedRole ? SUPER_ROLES.has(normalizedRole) : false
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

  const [organizations, setOrganizations] = useState<ExtendedOrganization[]>([])
  const [loading, setLoading] = useState(true)
  const [activeOrgId, setActiveOrgId] = useState<number | null>(null)
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [companyLegalName, setCompanyLegalName] = useState("")
  const [companyTaxId, setCompanyTaxId] = useState("")
  const [companyStatus, setCompanyStatus] = useState("ACTIVE")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        setLoading(true)
        const [orgs, selection] = await Promise.all([
          listOrganizations(),
          getTenantSelection(),
        ])

        if (cancelled) return

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

        if (
          resolvedOrgId !== selection.orgId ||
          resolvedCompanyId !== selection.companyId
        ) {
          setTenantSelection({ orgId: resolvedOrgId, companyId: resolvedCompanyId })
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error)
          toast.error("No se pudieron cargar las empresas disponibles.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    bootstrap()

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TenantSelection>).detail
      setActiveOrgId(detail.orgId ?? null)
      setActiveCompanyId(detail.companyId ?? null)
    }

    window.addEventListener(TENANT_SELECTION_EVENT, handler as EventListener)
    return () => {
      cancelled = true
      window.removeEventListener(TENANT_SELECTION_EVENT, handler as EventListener)
    }
  }, [])

  useEffect(() => {
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
      setTenantSelection({ orgId: org.id, companyId: nextCompanyId })
      return
    }

    if (
      activeCompanyId !== null &&
      !org.companies.some((company) => company.id === activeCompanyId)
    ) {
      const fallbackCompanyId = org.companies[0]?.id ?? null
      setActiveCompanyId(fallbackCompanyId)
      setTenantSelection({ orgId: org.id, companyId: fallbackCompanyId })
    }
  }, [organizations, activeOrgId, activeCompanyId])

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
    (organizationId: number, companyId: number | null) => {
      setActiveOrgId(organizationId)
      setActiveCompanyId(companyId)
      setTenantSelection({ orgId: organizationId, companyId })
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

      setSubmitting(true)
      try {
        const payload = {
          name: trimmedName,
          legalName: companyLegalName.trim() || undefined,
          taxId: companyTaxId.trim() || undefined,
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
        setTenantSelection({ orgId: activeOrganization.id, companyId: created.id })
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
    [activeOrganization, companyLegalName, companyName, companyStatus, companyTaxId],
  )

  const canAddCompanies = isSuperUser && Boolean(activeOrganization)

  if (loading && organizations.length === 0) {
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

  if (!activeOrganization) {
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
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="flex-1 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <Building2 className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {activeCompany?.name ?? "Sin empresas"}
                    </span>
                    <span className="truncate text-xs">{activeOrganization.name}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{roleLabel}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
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
                          className="gap-2 p-2"
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
                        className="gap-2 p-2"
                        onClick={() => {
                          setActiveOrgId(organization.id)
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
              <Label htmlFor="company-name">Nombre comercial</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Mi Empresa S.A."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-legal-name">Razon social (opcional)</Label>
              <Input
                id="company-legal-name"
                value={companyLegalName}
                onChange={(event) => setCompanyLegalName(event.target.value)}
                placeholder="Mi Empresa Sociedad Anonima"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-tax-id">RUC / NIT (opcional)</Label>
              <Input
                id="company-tax-id"
                value={companyTaxId}
                onChange={(event) => setCompanyTaxId(event.target.value)}
                placeholder="Ingrese el identificador fiscal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-status">Estado</Label>
              <Input
                id="company-status"
                value={companyStatus}
                onChange={(event) => setCompanyStatus(event.target.value)}
                placeholder="ACTIVE"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creando..." : "Crear empresa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
