import Link from "next/link"
import { Building2, Pencil, Eye } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { listOrganizations, getCurrentUserRole } from "./tenancy.api"
import { OrganizationFilterBar } from "./organization-filter-bar"

export const dynamic = "force-dynamic"

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) ?? {}
  const [organizations, currentRole] = await Promise.all([
    listOrganizations(),
    getCurrentUserRole(),
  ])

  const query =
    typeof resolvedSearchParams.q === "string"
      ? resolvedSearchParams.q.trim().toLowerCase()
      : ""
  const pageParam =
    typeof resolvedSearchParams.page === "string"
      ? Number(resolvedSearchParams.page)
      : 1
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1
  const pageSize = 10

  const filteredOrganizations = organizations.filter((org) => {
    if (!query) return true
    const name = org.name?.toLowerCase() ?? ""
    const code = org.code?.toLowerCase() ?? ""
    return name.includes(query) || code.includes(query)
  })

  const totalPages = Math.max(1, Math.ceil(filteredOrganizations.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const pageOffset = (safePage - 1) * pageSize
  const pagedOrganizations = filteredOrganizations.slice(pageOffset, pageOffset + pageSize)

  const canManage = currentRole
    ? ["SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG", "SUPER_ADMIN"].includes(currentRole)
    : false

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Organizaciones
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {organizations.length} organizacion{organizations.length === 1 ? "" : "es"} registrada{organizations.length === 1 ? "" : "s"}
        </p>
      </header>

      <OrganizationFilterBar query={query} total={filteredOrganizations.length} />

      <div className="mt-4 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organizacion</TableHead>
              <TableHead>Codigo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Unidades</TableHead>
              <TableHead className="text-center">Usuarios</TableHead>
              <TableHead className="hidden lg:table-cell">Super Admin</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedOrganizations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  {organizations.length === 0
                    ? "Aun no hay organizaciones registradas."
                    : "No hay resultados para la busqueda actual."}
                </TableCell>
              </TableRow>
            ) : (
              pagedOrganizations.map((org) => {
                const activeUnits = org.units.filter((u) => u.status === "ACTIVE").length
                return (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/tenancy/${org.id}`}
                        className="hover:underline"
                      >
                        {org.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {org.code ?? "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          org.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
                        }
                      >
                        {org.status === "ACTIVE" ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{activeUnits}</span>
                      <span className="text-muted-foreground"> / {org.units.length}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {org.membershipCount}
                    </TableCell>
                    <TableCell className="hidden max-w-[200px] truncate lg:table-cell">
                      {org.superAdmin ? (
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default truncate text-sm">
                                {org.superAdmin.email}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {org.superAdmin.username} ({org.superAdmin.email})
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          Sin asignar
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/dashboard/tenancy/${org.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        {canManage && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/dashboard/tenancy/${org.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {filteredOrganizations.length > pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Pagina {safePage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={safePage <= 1} asChild>
              <Link
                href={`?${new URLSearchParams({
                  ...(query ? { q: query } : {}),
                  page: String(Math.max(safePage - 1, 1)),
                }).toString()}`}
              >
                Anterior
              </Link>
            </Button>
            <Button variant="outline" size="sm" disabled={safePage >= totalPages} asChild>
              <Link
                href={`?${new URLSearchParams({
                  ...(query ? { q: query } : {}),
                  page: String(Math.min(safePage + 1, totalPages)),
                }).toString()}`}
              >
                Siguiente
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
