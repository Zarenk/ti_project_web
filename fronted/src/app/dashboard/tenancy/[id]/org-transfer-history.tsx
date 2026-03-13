"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  History,
  Loader2,
  UserPlus,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useAuth } from "@/context/auth-context"
import {
  getTransferHistory,
  type TransferRecord,
} from "../tenancy.api"

interface OrgTransferHistoryProps {
  organizationId: number
  /** Increment this to trigger a reload of the transfer history */
  refreshKey?: number
}

export function OrgTransferHistory({ organizationId, refreshKey }: OrgTransferHistoryProps) {
  const { role } = useAuth()
  const isSuperAdmin =
    role === "SUPER_ADMIN_GLOBAL" || role === "SUPER_ADMIN_ORG"

  const [records, setRecords] = useState<TransferRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    if (!isSuperAdmin) return
    try {
      setLoading(true)
      const data = await getTransferHistory(organizationId)
      setRecords(data)
    } catch {
      // silent — secondary panel
    } finally {
      setLoading(false)
    }
  }, [organizationId, isSuperAdmin])

  // Load on first open
  useEffect(() => {
    if (open && records.length === 0) {
      void load()
    }
  }, [open, load, records.length])

  // Reload when refreshKey changes (after a transfer)
  useEffect(() => {
    if (refreshKey && refreshKey > 0) {
      void load()
      if (!open) setOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  if (!isSuperAdmin) return null

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-5 text-indigo-600 dark:text-indigo-400" />
              Historial de transferencias
              {records.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {records.length}
                </Badge>
              )}
            </CardTitle>
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : records.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay transferencias registradas.
              </p>
            ) : (
              <div className="space-y-2">
                {records.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      {r.direction === "OUT" ? (
                        <ArrowUpRight className="mt-0.5 size-4 flex-shrink-0 text-rose-500" />
                      ) : r.direction === "IN" ? (
                        <ArrowDownLeft className="mt-0.5 size-4 flex-shrink-0 text-emerald-500" />
                      ) : (
                        <ArrowRightLeft className="mt-0.5 size-4 flex-shrink-0 text-sky-500" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium break-words">
                          <span className="font-semibold">
                            {r.targetUser?.username ?? "Usuario desconocido"}
                          </span>
                          {" "}
                          <span className="text-muted-foreground">
                            ({r.targetUser?.email})
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.type === "ADMIN_MOVE" ? (
                            <>
                              <ArrowRightLeft className="mr-1 inline size-3" />
                              Movido de{" "}
                              <span className="font-medium">
                                {r.fromOrganization?.name ?? "—"}
                              </span>
                              {" → "}
                              <span className="font-medium">
                                {r.toOrganization.name}
                              </span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-1 inline size-3" />
                              Agregado a{" "}
                              <span className="font-medium">
                                {r.toOrganization.name}
                              </span>
                            </>
                          )}
                          {" como "}
                          <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0">
                            {r.requestedRole}
                          </Badge>
                        </p>
                        {r.reason && (
                          <p className="mt-0.5 text-xs italic text-muted-foreground">
                            &quot;{r.reason}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2 text-xs text-muted-foreground sm:flex-col sm:items-end">
                      <span>
                        {r.resolvedAt
                          ? format(new Date(r.resolvedAt), "dd/MM/yyyy HH:mm", {
                              locale: es,
                            })
                          : "—"}
                      </span>
                      {r.resolvedBy && (
                        <span className="text-[10px]">
                          por {r.resolvedBy.username}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
