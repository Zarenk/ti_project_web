import Link from "next/link"
import { Building2, Layers, UsersRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getAuthHeaders } from "@/utils/auth-token"

import type { OrganizationResponse } from "./tenancy.api"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:4000"

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

export default async function OrganizationsPage() {
  const organizations = await fetchOrganizations()

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 space-y-3">
        <Badge className="rounded-full bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-slate-200">
          Gestión multi-tenant
        </Badge>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
            Organizaciones registradas
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Consulta las organizaciones activas, su estado operativo y el número de unidades que
            administran actualmente.
          </p>
        </div>
      </header>

      {organizations.length === 0 ? (
        <Card className="border-dashed border-sky-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-slate-700 dark:text-slate-200">
              <Building2 className="size-5 text-sky-600 dark:text-slate-100" />
              Aún no hay organizaciones registradas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300">
            Crea tu primera organización para habilitar el flujo multi-tenant y asigna usuarios
            maestros desde el formulario correspondiente.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {organizations.map((organization) => {
            const activeUnits = organization.units.filter((unit) => unit.status === "ACTIVE").length

            return (
              <Link
                key={organization.id}
                href={`/dashboard/tenancy/${organization.id}`}
                className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:rounded-lg"
              >
                <Card className="border-sky-100 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900/60">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg text-slate-900 dark:text-slate-100">
                        <Building2 className="size-5 text-sky-600 dark:text-slate-100" />
                        {organization.name}
                      </CardTitle>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Código: {organization.code ?? "—"}
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
                    <Separator className="bg-sky-100 dark:bg-slate-700" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {activeUnits} unidad(es) activas actualmente.
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}