"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  ShieldAlert,
  Lock,
  LogIn,
  Trash2,
  Search,
  Eye,
  Loader2,
  SlidersHorizontal,
  ChevronDown,
  X,
  Activity,
} from "lucide-react"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { ManualPagination } from "@/components/data-table-pagination"

import {
  fetchSecurityOverview,
  fetchAuditLog,
  type SecurityOverview,
  type AuditLogEntry,
} from "./admin-dashboard.api"

function formatDateShort(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  CREATED: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400" },
  UPDATED: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400" },
  DELETED: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-600 dark:text-red-400" },
  LOGIN: { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-600 dark:text-violet-400" },
  LOGOUT: { bg: "bg-slate-50 dark:bg-slate-950/30", text: "text-slate-600 dark:text-slate-400" },
  OTHER: { bg: "bg-gray-50 dark:bg-gray-950/30", text: "text-gray-600 dark:text-gray-400" },
}

export function AdminSecurityTab({ enabled }: { enabled: boolean }) {
  // Overview
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: queryKeys.adminDashboard.security(),
    queryFn: fetchSecurityOverview,
    enabled,
    refetchInterval: 30_000,
  })

  // Audit log pagination
  const [auditPage, setAuditPage] = useState(1)
  const [auditAction, setAuditAction] = useState("ALL")
  const [auditSearch, setAuditSearch] = useState("")
  const [auditSearchInput, setAuditSearchInput] = useState("")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const { data: auditData, isLoading: loadingAudit } = useQuery({
    queryKey: queryKeys.adminDashboard.auditLog({ page: auditPage, action: auditAction, search: auditSearch }),
    queryFn: () => fetchAuditLog({ page: auditPage, limit: 20, action: auditAction, search: auditSearch }),
    enabled,
  })

  const handleSearch = () => {
    setAuditSearch(auditSearchInput)
    setAuditPage(1)
  }

  const activeFilterCount = (auditSearch.trim() ? 1 : 0) + (auditAction !== "ALL" ? 1 : 0)

  if (loadingOverview) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Security stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SecurityStat icon={LogIn} label="Logins hoy" value={overview?.loginsToday ?? 0} />
        <SecurityStat icon={ShieldAlert} label="Logins fallidos" value={overview?.failedLoginsToday ?? 0} color="text-red-500" />
        <SecurityStat icon={Lock} label="Usuarios bloqueados" value={overview?.lockedUsers ?? 0} color="text-amber-500" />
        <SecurityStat icon={Trash2} label="Deletes hoy" value={overview?.destructiveActionsToday ?? 0} color="text-red-500" />
      </div>

      {/* Action breakdown (7d) */}
      {overview && overview.auditByAction7d.length > 0 && (
        <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Acciones (últimos 7 días) — {overview.recentAuditActions.toLocaleString("es-PE")} total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {overview.auditByAction7d.map((a) => {
                const colors = ACTION_COLORS[a.action] ?? ACTION_COLORS.OTHER
                return (
                  <div key={a.action} className={cn("flex items-center gap-2 rounded-lg px-3 py-2", colors.bg)}>
                    <span className={cn("text-xs font-medium", colors.text)}>{a.action}</span>
                    <span className="text-sm font-bold tabular-nums">{a.count.toLocaleString("es-PE")}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent logins */}
      {overview && overview.recentLogins.length > 0 && (
        <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <LogIn className="h-4 w-4 text-primary" />
              Logins / Logouts Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acción</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Organización</TableHead>
                  <TableHead className="hidden md:table-cell">IP</TableHead>
                  <TableHead className="hidden lg:table-cell">Detalle</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.recentLogins.map((l, idx) => {
                  const isFailed = l.summary?.toLowerCase().includes("fail")
                  return (
                    <TableRow
                      key={l.id}
                      className={cn(
                        "animate-in fade-in slide-in-from-bottom-1 duration-300",
                        isFailed && "bg-red-50/50 dark:bg-red-950/10"
                      )}
                      style={{ animationDelay: `${idx * 25}ms` }}
                    >
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", l.action === "LOGIN" ? "text-violet-600" : "text-slate-500")}>
                          {l.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs truncate max-w-[160px]">{l.actorEmail ?? "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground truncate max-w-[120px]">
                        {l.organization?.name ?? "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <code className="rounded bg-muted px-1 py-0.5 text-[10px] font-mono">{l.ip ?? "—"}</code>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground truncate max-w-[200px]">
                        {l.summary ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(l.createdAt)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Full Audit Log */}
      <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Log de Auditoría Completo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Mobile: compact search + filter toggle */}
          <div className="flex gap-2 sm:hidden w-full min-w-0">
            <Input
              placeholder="Buscar email, entidad..."
              value={auditSearchInput}
              onChange={(e) => setAuditSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="h-9 text-sm flex-1 min-w-0"
            />
            <Button
              variant={mobileFiltersOpen ? "secondary" : "outline"}
              size="sm"
              className="h-9 gap-1.5 cursor-pointer flex-shrink-0 relative"
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="text-xs">Filtros</span>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", mobileFiltersOpen && "rotate-180")} />
            </Button>
          </div>

          {/* Mobile: collapsible */}
          <div className={cn("sm:hidden overflow-hidden transition-all duration-300 ease-in-out",
            mobileFiltersOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}>
            <div className="space-y-2 pt-1 pb-0.5">
              <Select value={auditAction} onValueChange={(v) => { setAuditAction(v); setAuditPage(1) }}>
                <SelectTrigger className="h-9 text-sm cursor-pointer"><SelectValue placeholder="Acción" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="cursor-pointer">Todas</SelectItem>
                  <SelectItem value="CREATED" className="cursor-pointer">Creado</SelectItem>
                  <SelectItem value="UPDATED" className="cursor-pointer">Actualizado</SelectItem>
                  <SelectItem value="DELETED" className="cursor-pointer">Eliminado</SelectItem>
                  <SelectItem value="LOGIN" className="cursor-pointer">Login</SelectItem>
                  <SelectItem value="LOGOUT" className="cursor-pointer">Logout</SelectItem>
                </SelectContent>
              </Select>
              {(auditSearch || auditAction !== "ALL") && (
                <Button
                  variant="ghost" size="sm"
                  onClick={() => { setAuditSearch(""); setAuditSearchInput(""); setAuditAction("ALL"); setAuditPage(1); setMobileFiltersOpen(false) }}
                  className="h-8 w-full text-xs text-muted-foreground cursor-pointer"
                >
                  <X className="h-3 w-3 mr-1" /> Limpiar filtros
                </Button>
              )}
            </div>
          </div>

          {/* Desktop: full filter bar */}
          <div className="hidden sm:flex items-center gap-3 w-full min-w-0">
            <div className="relative flex-1 min-w-0 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email, entidad..."
                value={auditSearchInput}
                onChange={(e) => setAuditSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-9 h-9"
              />
            </div>
            <Select value={auditAction} onValueChange={(v) => { setAuditAction(v); setAuditPage(1) }}>
              <SelectTrigger className="w-[140px] h-9 cursor-pointer"><SelectValue placeholder="Acción" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="cursor-pointer">Todas</SelectItem>
                <SelectItem value="CREATED" className="cursor-pointer">Creado</SelectItem>
                <SelectItem value="UPDATED" className="cursor-pointer">Actualizado</SelectItem>
                <SelectItem value="DELETED" className="cursor-pointer">Eliminado</SelectItem>
                <SelectItem value="LOGIN" className="cursor-pointer">Login</SelectItem>
                <SelectItem value="LOGOUT" className="cursor-pointer">Logout</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9 cursor-pointer" onClick={handleSearch}>
              <Search className="h-3.5 w-3.5 mr-1" /> Buscar
            </Button>
          </div>

          {/* Audit table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acción</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead className="hidden sm:table-cell">Entidad</TableHead>
                  <TableHead className="hidden md:table-cell">Org / Empresa</TableHead>
                  <TableHead className="hidden lg:table-cell">Resumen</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingAudit ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><div className="h-5 w-full animate-pulse rounded bg-muted" /></TableCell>
                    </TableRow>
                  ))
                ) : !auditData?.items?.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      <Eye className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                      Sin registros de auditoría
                    </TableCell>
                  </TableRow>
                ) : (
                  auditData.items.map((entry, idx) => (
                    <AuditRow key={entry.id} entry={entry} index={idx} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {auditData && auditData.totalPages > 1 && (
            <ManualPagination
              currentPage={auditData.page}
              totalPages={auditData.totalPages}
              pageSize={20}
              totalItems={auditData.total}
              onPageChange={setAuditPage}
              onPageSizeChange={() => {}}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SecurityStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof LogIn
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
            <p className="text-xl sm:text-2xl font-bold tabular-nums">{value}</p>
          </div>
          <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted/60", color)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AuditRow({ entry, index }: { entry: AuditLogEntry; index: number }) {
  const colors = ACTION_COLORS[entry.action] ?? ACTION_COLORS.OTHER
  return (
    <TableRow
      className="animate-in fade-in slide-in-from-bottom-1 duration-300"
      style={{ animationDelay: `${index * 25}ms` }}
    >
      <TableCell>
        <Badge variant="outline" className={cn("text-[10px]", colors.text, colors.bg)}>
          {entry.action}
        </Badge>
      </TableCell>
      <TableCell className="text-xs truncate max-w-[140px]">{entry.actorEmail ?? "Sistema"}</TableCell>
      <TableCell className="hidden sm:table-cell">
        {entry.entityType ? (
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-[10px]">{entry.entityType}</Badge>
            {entry.entityId && <code className="text-[10px] text-muted-foreground">#{entry.entityId}</code>}
          </div>
        ) : "—"}
      </TableCell>
      <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-[120px]">
        {entry.organization?.name ?? "—"}
        {entry.company?.name ? ` / ${entry.company.name}` : ""}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {entry.summary ? (
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground truncate max-w-[200px] inline-block cursor-default">
                  {entry.summary}
                </span>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-sm text-xs whitespace-pre-wrap">
                {entry.summary}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : "—"}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(entry.createdAt)}</TableCell>
    </TableRow>
  )
}
