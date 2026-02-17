"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarDatePicker } from "@/components/calendar-date-picker"
import { DateRange } from "react-day-picker"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTenantSelection } from "@/context/tenant-selection-context"
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react"
import {
  fetchLedger,
  formatAmount,
  SOURCE_LABELS,
  ACCOUNT_TYPE_LABELS,
  type LedgerAccount,
  type LedgerResponse,
} from "./ledger.api"

/* ------------------------------------------------------------------ */
/*  Account Type Colors                                                */
/* ------------------------------------------------------------------ */

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  ACTIVO: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  PASIVO: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  PATRIMONIO: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
  INGRESO: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  GASTO: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
}

const SOURCE_COLORS: Record<string, string> = {
  SALE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  PURCHASE: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  ADJUSTMENT: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  MANUAL: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
}

/* ------------------------------------------------------------------ */
/*  Metric Card                                                        */
/* ------------------------------------------------------------------ */

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: string
  icon: React.ElementType
  color: string
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`rounded-lg p-2.5 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-semibold tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Account Section (collapsible T-account)                            */
/* ------------------------------------------------------------------ */

function AccountSection({ account }: { account: LedgerAccount }) {
  const [open, setOpen] = useState(true)

  const typeColor = ACCOUNT_TYPE_COLORS[account.accountType] || ""
  const typeLabel = ACCOUNT_TYPE_LABELS[account.accountType] || account.accountType

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border rounded-lg">
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-3 p-3 sm:p-4 hover:bg-muted/50 transition-colors text-left">
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}

          <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span className="font-mono text-sm font-semibold">
              {account.accountCode}
            </span>
            <span className="text-sm font-medium truncate">
              {account.accountName}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 w-fit ${typeColor}`}
            >
              {typeLabel}
            </Badge>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-sm tabular-nums shrink-0">
            <span className="text-emerald-600 dark:text-emerald-400">
              D: {formatAmount(account.totalDebit)}
            </span>
            <span className="text-red-600 dark:text-red-400">
              H: {formatAmount(account.totalCredit)}
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span className={`font-semibold ${account.balance >= 0 ? "text-foreground" : "text-red-600 dark:text-red-400"}`}>
              Saldo: {formatAmount(Math.abs(account.balance))}
              {account.balance < 0 ? " (H)" : account.balance > 0 ? " (D)" : ""}
            </span>
          </div>
        </button>
      </CollapsibleTrigger>

      {/* Mobile totals */}
      {open && (
        <div className="sm:hidden flex items-center justify-between px-4 pb-2 text-xs tabular-nums text-muted-foreground">
          <span>Debe: {formatAmount(account.totalDebit)}</span>
          <span>Haber: {formatAmount(account.totalCredit)}</span>
          <span className="font-medium text-foreground">
            Saldo: {formatAmount(Math.abs(account.balance))}
            {account.balance < 0 ? " (H)" : account.balance > 0 ? " (D)" : ""}
          </span>
        </div>
      )}

      <CollapsibleContent>
        <div className="border-t">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[100px]">Fecha</TableHead>
                  <TableHead className="w-[80px]">Asiento</TableHead>
                  <TableHead className="w-[70px]">Origen</TableHead>
                  <TableHead>Glosa</TableHead>
                  <TableHead className="text-right w-[110px]">Debe</TableHead>
                  <TableHead className="text-right w-[110px]">Haber</TableHead>
                  <TableHead className="text-right w-[120px]">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {account.movements.map((mov) => (
                  <TableRow key={mov.id} className="hover:bg-muted/20">
                    <TableCell className="text-xs tabular-nums">
                      {new Date(mov.date).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{mov.correlativo}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${SOURCE_COLORS[mov.source] || ""}`}
                      >
                        {SOURCE_LABELS[mov.source] || mov.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[250px]">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-sm truncate">{mov.description}</p>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs">{mov.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {mov.debit > 0 ? formatAmount(mov.debit) : ""}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {mov.credit > 0 ? formatAmount(mov.credit) : ""}
                    </TableCell>
                    <TableCell className={`text-right tabular-nums text-sm font-medium ${mov.runningBalance < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                      {formatAmount(Math.abs(mov.runningBalance))}
                      {mov.runningBalance < 0 ? " H" : mov.runningBalance > 0 ? " D" : ""}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Account totals row */}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell colSpan={4} className="text-sm">
                    Total {account.accountCode} - {account.accountName}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatAmount(account.totalDebit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatAmount(account.totalCredit)}
                  </TableCell>
                  <TableCell className={`text-right tabular-nums text-sm ${account.balance < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                    {formatAmount(Math.abs(account.balance))}
                    {account.balance < 0 ? " H" : account.balance > 0 ? " D" : ""}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y">
            {account.movements.map((mov) => (
              <div key={mov.id} className="p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {new Date(mov.date).toLocaleDateString("es-PE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      })}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{mov.correlativo}</span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1 py-0 ${SOURCE_COLORS[mov.source] || ""}`}
                    >
                      {SOURCE_LABELS[mov.source] || mov.source}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm truncate">{mov.description}</p>
                <div className="flex items-center justify-between text-xs tabular-nums">
                  <div className="flex gap-3">
                    {mov.debit > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        D: {formatAmount(mov.debit)}
                      </span>
                    )}
                    {mov.credit > 0 && (
                      <span className="text-red-600 dark:text-red-400">
                        H: {formatAmount(mov.credit)}
                      </span>
                    )}
                  </div>
                  <span className={`font-medium ${mov.runningBalance < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                    {formatAmount(Math.abs(mov.runningBalance))}
                    {mov.runningBalance < 0 ? " H" : mov.runningBalance > 0 ? " D" : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function LedgerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-28" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="space-y-2">
            {[1, 2].map((j) => (
              <Skeleton key={j} className="h-8 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">
        {hasFilters ? "Sin resultados" : "Libro Mayor vacío"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {hasFilters
          ? "No se encontraron movimientos con los filtros seleccionados. Intenta ampliar el rango de fechas."
          : "Aún no hay asientos contabilizados. Los movimientos aparecerán automáticamente al registrar ventas o compras."
        }
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function LedgerReportPage() {
  const [data, setData] = useState<LedgerResponse | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { version } = useTenantSelection()

  const load = useCallback(
    async (range?: DateRange) => {
      setLoading(true)
      setError(null)
      try {
        const result = await fetchLedger({
          from: range?.from?.toISOString().split("T")[0],
          to: range?.to?.toISOString().split("T")[0],
        })
        setData(result)
      } catch (err) {
        console.error("Failed to load ledger", err)
        setError(err instanceof Error ? err.message : "Error al cargar el libro mayor")
        setData(null)
      } finally {
        setLoading(false)
      }
    },
    [version],
  )

  useEffect(() => {
    load(dateRange)
  }, [dateRange, load])

  // Filter accounts by search query
  const filteredAccounts = useMemo(() => {
    if (!data?.accounts) return []
    if (!searchQuery.trim()) return data.accounts
    const q = searchQuery.toLowerCase()
    return data.accounts.filter(
      (a) =>
        a.accountCode.toLowerCase().includes(q) ||
        a.accountName.toLowerCase().includes(q),
    )
  }, [data, searchQuery])

  const totalAccounts = data?.accounts?.length ?? 0
  const totalMovements = data?.accounts?.reduce((sum, a) => sum + a.movements.length, 0) ?? 0

  // CSV export
  const handleExportCSV = useCallback(() => {
    if (!filteredAccounts.length) return

    const rows: string[] = [
      "Cuenta,Nombre,Fecha,Asiento,Origen,Glosa,Debe,Haber,Saldo",
    ]

    for (const acct of filteredAccounts) {
      for (const mov of acct.movements) {
        const date = new Date(mov.date).toLocaleDateString("es-PE")
        const desc = mov.description.replace(/,/g, ";")
        rows.push(
          `${acct.accountCode},${acct.accountName},${date},${mov.correlativo},${mov.source},"${desc}",${mov.debit.toFixed(2)},${mov.credit.toFixed(2)},${mov.runningBalance.toFixed(2)}`,
        )
      }
    }

    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `libro-mayor-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredAccounts])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Libro Mayor</h1>
          <p className="text-sm text-muted-foreground">
            Movimientos por cuenta contable
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <CalendarDatePicker
            className="h-9 w-[250px]"
            variant="outline"
            date={dateRange || { from: undefined, to: undefined }}
            onDateSelect={setDateRange}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleExportCSV}
                  disabled={!filteredAccounts.length}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Exportar CSV</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 flex items-center gap-2">
          <X className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <LedgerSkeleton />
      ) : !data || totalAccounts === 0 ? (
        <EmptyState hasFilters={!!dateRange?.from} />
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MetricCard
              label="Total Debe"
              value={`S/ ${formatAmount(data.totals.debit)}`}
              icon={TrendingUp}
              color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
            />
            <MetricCard
              label="Total Haber"
              value={`S/ ${formatAmount(data.totals.credit)}`}
              icon={TrendingDown}
              color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            />
            <MetricCard
              label="Cuentas / Movimientos"
              value={`${totalAccounts} / ${totalMovements}`}
              icon={BookOpen}
              color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            />
          </div>

          {/* Search filter */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cuenta (código o nombre)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          {/* Account sections */}
          <div className="space-y-3">
            {filteredAccounts.map((account) => (
              <AccountSection key={account.accountId} account={account} />
            ))}

            {filteredAccounts.length === 0 && searchQuery && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No se encontraron cuentas que coincidan con &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
