import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getAuthHeaders } from "@/utils/auth-token"

import type { OrganizationResponse } from "../../tenancy.api"
import { getOrganization } from "../../tenancy.api"
import { EditOrganizationForm } from "./edit-organization-form"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:4000"

async function fetchOrganizationById(id: string): Promise<OrganizationResponse | null> {
  try {
    return await getOrganization(id)
  } catch {
    return null
  }
}

async function fetchCurrentUserRole(): Promise<string | null> {
  let headers: Record<string, string>
  try {
    headers = await getAuthHeaders()
  } catch {
    return null
  }
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

function canManage(role: string | null) {
  if (!role) return false
  return ["SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG", "SUPER_ADMIN"].includes(role)
}

export const dynamic = "force-dynamic"

export default async function EditOrganizationPage({
  params,
}: {
  params: { id: string }
}) {
  const [organization, role] = await Promise.all([
    fetchOrganizationById(params.id),
    fetchCurrentUserRole(),
  ])

  if (!organization) {
    notFound()
  }

  const allowed = canManage(role)

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" className="gap-2 px-0 text-slate-600 dark:text-slate-300" asChild>
          <Link href={`/dashboard/tenancy/${organization.id}`}>
            <ArrowLeft className="size-4" />
            Regresar
          </Link>
        </Button>
        <Badge className="rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          Organizacion #{organization.id}
        </Badge>
      </div>

      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Editar organizacion
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Solo los super administradores pueden ajustar la informacion basica de cada organizacion.
          Los cambios se reflejan en el dashboard y en el switch de organizaciones.
        </p>
      </div>

      {allowed ? (
        <EditOrganizationForm organization={organization} canEdit />
      ) : (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10">
          <CardHeader>
            <CardTitle className="text-base text-amber-900 dark:text-amber-100">
              Sin permisos suficientes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-800 dark:text-amber-100/80">
            Necesitas privilegios de super administrador para editar organizaciones. Contacta al
            administrador global si consideras que deberias acceder.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
