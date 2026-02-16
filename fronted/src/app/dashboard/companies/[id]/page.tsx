import Link from "next/link"
import { notFound } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  getCompanyDetail,
  fetchCompanyVerticalInfo,
  type CompanyDetail,
} from "@/app/dashboard/tenancy/tenancy.api"
import { VerticalManagementPanel } from "@/app/dashboard/tenancy/vertical-management-panel"
import { VerticalStatusIndicator } from "@/app/dashboard/tenancy/vertical-status-indicator"

const VERTICAL_FEATURE_ENABLED =
  process.env.NEXT_PUBLIC_VERTICAL_FEATURE_ENABLED === "true"

type PageParams = {
  params: { id: string }
}

async function loadCompany(companyId: number): Promise<CompanyDetail | null> {
  try {
    return await getCompanyDetail(companyId)
  } catch {
    return null
  }
}

export default async function CompanyVerticalPage({ params }: PageParams) {
  const companyId = Number(params.id)
  if (!Number.isFinite(companyId) || companyId <= 0) {
    notFound()
  }

  const company = await loadCompany(companyId)
  if (!company) {
    notFound()
  }

  const verticalInfo = VERTICAL_FEATURE_ENABLED
    ? await fetchCompanyVerticalInfo(companyId).catch(() => null)
    : null

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Empresa</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {company.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Organizacion:{" "}
            <span className="font-medium text-foreground">
              {company.organization?.name ?? "Sin organizacion"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className={
              company.status === "ACTIVE"
                ? "rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                : "rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
            }
          >
            {company.status === "ACTIVE" ? "Activa" : "Inactiva"}
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/tenancy">Volver a organizaciones</Link>
          </Button>
        </div>
      </div>

      {!VERTICAL_FEATURE_ENABLED && (
        <Card className="border-dashed border-slate-300 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-base font-medium text-foreground">
              Verticales personalizados
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Esta funcionalidad se encuentra deshabilitada. Solicita a un administrador que
            habilite <code>NEXT_PUBLIC_VERTICAL_FEATURE_ENABLED</code> para gestionar los tipos de
            empresa desde esta vista.
          </CardContent>
        </Card>
      )}

      {VERTICAL_FEATURE_ENABLED && verticalInfo ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Configuracion de vertical
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VerticalManagementPanel
                organizationId={company.organization?.id ?? company.organizationId}
                companyId={companyId}
                info={verticalInfo}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">
                Estado de migracion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VerticalStatusIndicator
                organizationId={company.organization?.id ?? company.organizationId}
                companyId={companyId}
                info={verticalInfo}
              />
            </CardContent>
          </Card>
        </div>
      ) : VERTICAL_FEATURE_ENABLED ? (
        <Card className="border-dashed border-slate-300 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              No se pudo cargar el vertical
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Intenta nuevamente mas tarde o verifica que tengas permisos para gestionar esta empresa.
            <Separator className="my-3" />
            <Button asChild size="sm">
              <Link href="/dashboard/tenancy">Volver al listado</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
