import Link from "next/link"
import { Building2, Layers, UsersRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getAuthHeaders } from "@/utils/auth-token"

import type { OrganizationResponse, OrganizationVerticalInfo } from "./tenancy.api"
import { fetchCompanyVerticalInfo } from "./tenancy.api"
import { getTenantSelection } from "@/utils/tenant-preferences"
import { OrganizationVerticalCard } from "./organization-vertical-card"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:4000"
const VERTICAL_FEATURE_ENABLED =
  process.env.NEXT_PUBLIC_VERTICAL_FEATURE_ENABLED === "true"

async function fetchOrganizations(): Promise<OrganizationResponse[]> {
  const headers = await getAuthHeaders()
  if (!headers.Authorization) {
    return []
  }

  const response = await fetch(`${BACKEND_URL}/api/tenancy`, {
    headers,
    cache: "no-store",
  })

  if (!response.ok) {
    return []
  }

  const data = (await response.json()) as OrganizationResponse[] | null
  return Array.isArray(data) ? data : []
}

export const dynamic = "force-dynamic"

async function fetchCurrentUserRole(): Promise<string | null> {
  const headers = await getAuthHeaders()
  if (!headers.Authorization) {
    return null
  }

  const response = await fetch(`${BACKEND_URL}/api/users/profile`, {
    method: "POST",
    headers,
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json().catch(() => null)) as { role?: string } | null
  if (!data || typeof data.role !== "string") {
    return null
  }

  return data.role.toUpperCase()
}

type VerticalMapEntry = OrganizationVerticalInfo & {
  displayName: string
}

async function fetchOrganizationVerticalMap(
  organizations: OrganizationResponse[],
  tenantSelection?: { orgId: number | null; companyId: number | null },
): Promise<Map<number, VerticalMapEntry>> {
  const map = new Map<number, VerticalMapEntry>()
  if (!VERTICAL_FEATURE_ENABLED || organizations.length === 0) {
    return map
  }

  const entries = await Promise.all(
    organizations.map(async (organization) => {
      let targetCompanyId: number | null = null
      if (tenantSelection?.orgId === organization.id && tenantSelection.companyId) {
        targetCompanyId = tenantSelection.companyId
      } else if (organization.companies && organization.companies.length > 0) {
        targetCompanyId = organization.companies[0]?.id ?? null
      }
      if (!targetCompanyId) {
        return null
      }
      const info = await fetchCompanyVerticalInfo(targetCompanyId).catch(() => null)
      if (!info) {
        return null
      }
      const displayName =
        (info.config && typeof info.config === "object" ? info.config.displayName : undefined) ??
        info.businessVertical
      return [
        organization.id,
        {
          ...info,
          displayName,
        },
      ] as const
    }),
  )

  for (const entry of entries) {
    if (entry) {
      map.set(entry[0], entry[1])
    }
  }

  return map
}

export default async function OrganizationsPage() {
  const [organizations, currentRole, tenantSelection] = await Promise.all([
    fetchOrganizations(),
    fetchCurrentUserRole(),
    getTenantSelection(),
  ])
  const verticalInfoMap = VERTICAL_FEATURE_ENABLED
    ? await fetchOrganizationVerticalMap(organizations, tenantSelection)
    : new Map<number, VerticalMapEntry>()
  const canManageOrganizations = currentRole
    ? ["SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG", "SUPER_ADMIN"].includes(currentRole)
    : false

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 space-y-3">
        <Badge className="rounded-full bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-slate-200">
          Gestion multi-tenant
        </Badge>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Organizaciones registradas
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Consulta las organizaciones activas, su estado operativo y el numero de unidades que
            administran actualmente.
          </p>
        </div>
      </header>

      {organizations.length === 0 ? (
        <Card className="border-dashed border-sky-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-slate-700 dark:text-slate-200">
              <Building2 className="size-5 text-sky-600 dark:text-slate-100" />
              Aun no hay organizaciones registradas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300">
            Crea tu primera organizacion para habilitar el flujo multi-tenant y asigna usuarios
            maestros desde el formulario correspondiente.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {organizations.map((organization) => {
            const activeUnits = organization.units.filter((unit) => unit.status === "ACTIVE").length
            const verticalDetails = verticalInfoMap.get(organization.id)

            return (
              <Card
                key={organization.id}
                className="border-sky-100 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60"
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg text-slate-900 dark:text-slate-100">
                      <Building2 className="size-5 text-sky-600 dark:text-slate-100" />
                      {organization.name}
                    </CardTitle>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Codigo: {organization.code ?? "Sin codigo"}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      organization.status === "ACTIVE"
                        ? "rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                        : "rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                    }
                  >
                    {organization.status === "ACTIVE" ? "Activa" : "Inactiva"}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Layers className="size-4 text-sky-600 dark:text-slate-100" />
                    {organization.units.length} unidades registradas
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <UsersRound className="size-4 text-sky-600 dark:text-slate-100" />
                    {organization.membershipCount} usuarios asociados
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {organization.superAdmin ? (
                      <>
                        Super admin:{" "}
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {organization.superAdmin.username}
                        </span>{" "}
                        <span className="text-slate-500 dark:text-slate-400">
                          ({organization.superAdmin.email})
                        </span>
                      </>
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400">
                        Sin super admin asignado
                      </span>
                    )}
                  </div>
                  {VERTICAL_FEATURE_ENABLED && (organization.companies?.length ?? 0) > 0 && (
                    <OrganizationVerticalCard
                      organizationId={organization.id}
                      companies={organization.companies?.map((company) => ({
                        id: company.id,
                        name: company.name,
                      })) ?? []}
                      initialInfo={verticalDetails ?? null}
                      canManage={canManageOrganizations}
                    />
                  )}
                  <Separator className="bg-sky-100 dark:bg-slate-700" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {activeUnits} unidad(es) activas actualmente.
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/tenancy/${organization.id}`}>Ver detalle</Link>
                  </Button>
                  {canManageOrganizations ? (
                    <Button
                      size="sm"
                      className="bg-slate-900 text-white hover:bg-slate-900/90 dark:bg-slate-100 dark:text-slate-900"
                      asChild
                    >
                      <Link href={`/dashboard/tenancy/${organization.id}/edit`}>Editar</Link>
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Solo super admin pueden editar
                    </span>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
