"use client"

import { useQuery } from "@tanstack/react-query"
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Building2,
} from "lucide-react"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

import { fetchSunatOverview, type SunatOverview } from "./admin-dashboard.api"

function formatDateShort(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const STATUS_COLORS: Record<string, string> = {
  ACCEPTED: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
  REJECTED: "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400",
  FAILED: "text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400",
  PENDING: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400",
  SENDING: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
  SENT: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30 dark:text-cyan-400",
}

export function AdminSunatTab({ enabled }: { enabled: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.adminDashboard.sunat(),
    queryFn: fetchSunatOverview,
    enabled,
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SunatStat icon={FileText} label="Total transmisiones" value={data.totalTransmissions} />
        <SunatStat icon={CheckCircle2} label="Aceptadas hoy" value={data.acceptedToday} color="text-emerald-500" />
        <SunatStat icon={XCircle} label="Rechazadas hoy" value={data.rejectedToday} color="text-red-500" />
        <SunatStat icon={AlertTriangle} label="Fallidas (7d)" value={data.failedLast7d} color="text-orange-500" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 w-full min-w-0">
        {/* Status breakdown */}
        <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Distribución por Estado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.statusBreakdown.map((s) => {
              const total = data.totalTransmissions || 1
              const pct = (s.count / total) * 100
              return (
                <div key={s.status} className="flex items-center gap-3">
                  <Badge variant="outline" className={cn("text-[10px] w-20 justify-center", STATUS_COLORS[s.status])}>
                    {s.status}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold tabular-nums w-12 text-right">{s.count}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Credit notes & pending */}
        <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-primary" />
              Notas de Crédito & Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">{data.creditNotes.total}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">NC Total</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-2xl font-bold tabular-nums">{data.creditNotes.thisMonth}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">NC Este Mes</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20 p-3">
              <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{data.pendingTransmissions} pendientes</p>
                <p className="text-[10px] text-muted-foreground">Transmisiones en cola</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent failed */}
      {data.recentFailed.length > 0 && (
        <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Transmisiones Fallidas / Rechazadas Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden sm:table-cell">Serie</TableHead>
                  <TableHead className="hidden md:table-cell">Empresa</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="hidden sm:table-cell">Reintentos</TableHead>
                  <TableHead className="hidden lg:table-cell">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentFailed.map((t, idx) => (
                  <TableRow
                    key={t.id}
                    className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[t.status])}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{t.documentType}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <code className="text-xs font-mono">{t.serie ?? "—"}-{t.correlativo ?? "—"}</code>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-[120px]">
                      {t.company?.name ?? t.organization?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-red-500 truncate max-w-[160px] inline-block cursor-default">
                              {t.cdrDescription ?? t.errorMessage ?? "—"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs text-xs">
                            <p><strong>CDR:</strong> {t.cdrCode ?? "N/A"} - {t.cdrDescription ?? "N/A"}</p>
                            {t.errorMessage && <p className="mt-1"><strong>Error:</strong> {t.errorMessage}</p>}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs tabular-nums">{t.retryCount}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateShort(t.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function SunatStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof FileText
  label: string
  value: number
  color?: string
}) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-xl sm:text-2xl font-bold tabular-nums">{value.toLocaleString("es-PE")}</p>
          </div>
          <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted/60", color)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
