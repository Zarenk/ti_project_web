"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  ArrowRightLeft,
  UserPlus,
  Loader2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ManualPagination } from "@/components/data-table-pagination"
import {
  getGlobalTransferHistory,
  type TransferRecord,
} from "../tenancy/tenancy.api"

export function AdminTransfersTab() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "transfers", page, pageSize],
    queryFn: () => getGlobalTransferHistory(page, pageSize),
  })

  const records = data?.data ?? []
  const total = data?.total ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowRightLeft className="size-5 text-indigo-600 dark:text-indigo-400" />
          Registro global de transferencias
          <Badge variant="secondary" className="ml-1">
            {total}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : records.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay transferencias registradas.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="hidden sm:table-cell">Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="hidden md:table-cell">Rol</TableHead>
                    <TableHead className="hidden md:table-cell">Ejecutado por</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r: TransferRecord) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {r.targetUser?.username ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {r.targetUser?.email ?? ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.type === "ADMIN_MOVE" ? (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <ArrowRightLeft className="size-3" />
                            Mover
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <UserPlus className="size-3" />
                            Agregar
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {r.fromOrganization?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {r.toOrganization.name}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          {r.requestedRole}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {r.resolvedBy?.username ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {r.resolvedAt
                          ? format(new Date(r.resolvedAt), "dd/MM/yy HH:mm", {
                              locale: es,
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {total > pageSize && (
              <div className="mt-4">
                <ManualPagination
                  currentPage={page}
                  totalItems={total}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
