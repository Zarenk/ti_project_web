"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarDatePicker } from "@/components/calendar-date-picker"
import { DateRange } from "react-day-picker"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { PageGuideButton } from "@/components/page-guide-dialog"
import { TRIAL_BALANCE_GUIDE_STEPS } from "./trial-balance-guide-steps"
import {
  BookOpen,
  CheckCircle2,
  Download,
  Scale,
  Search,
  TrendingDown,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react"
import {
  fetchTrialBalance,
  formatAmount,
  ACCOUNT_TYPE_LABELS,
  type TrialBalanceRow,
  type TrialBalanceResponse,
} from "./trial-balance.api"

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
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function TrialBalanceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
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
      <div className="border rounded-lg">
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
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
        <Scale className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-1">
        {hasFilters ? "Sin resultados" : "Balance de Comprobación vacío"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        {hasFilters
          ? "No se encontraron movimientos con los filtros seleccionados. Intenta ampliar el rango de fechas."
          : "Aún no hay asientos contabilizados. El balance se generará automáticamente al registrar asientos."
        }
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Mobile Row Card                                                    */
/* ------------------------------------------------------------------ */

function MobileRowCard({ row }: { row: TrialBalanceRow }) {
  const typeColor = ACCOUNT_TYPE_COLORS[row.accountType] || ""
  const typeLabel = ACCOUNT_TYPE_LABELS[row.accountType] || row.accountType

  return (
    <div className="p-3 space-y-2 border-b last:border-b-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold">{row.accountCode}</span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeColor}`}>
              {typeLabel}
            </Badge>
          </div>
          <p className="text-sm truncate mt-0.5">{row.accountName}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">Sumas</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Debe:</span>
            <span>{formatAmount(row.debit)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Haber:</span>
            <span>{formatAmount(row.credit)}</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">Saldos</p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deudor:</span>
            <span className={row.debitBalance > 0 ? "font-medium text-emerald-600 dark:text-emerald-400" : ""}>
              {formatAmount(row.debitBalance)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Acreedor:</span>
            <span className={row.creditBalance > 0 ? "font-medium text-red-600 dark:text-red-400" : ""}>
              {formatAmount(row.creditBalance)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function TrialBalancePage() {
  const [data, setData] = useState<TrialBalanceResponse | null>(null)
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
        const result = await fetchTrialBalance({
          from: range?.from?.toISOString().split("T")[0],
          to: range?.to?.toISOString().split("T")[0],
        })
        setData(result)
      } catch (err) {
        console.error("Failed to load trial balance", err)
        setError(err instanceof Error ? err.message : "Error al cargar el balance de comprobación")
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

  // Filter rows by search query
  const filteredRows = useMemo(() => {
    if (!data?.rows) return []
    if (!searchQuery.trim()) return data.rows
    const q = searchQuery.toLowerCase()
    return data.rows.filter(
      (r) =>
        r.accountCode.toLowerCase().includes(q) ||
        r.accountName.toLowerCase().includes(q),
    )
  }, [data, searchQuery])

  // Recalculate totals for filtered rows
  const displayTotals = useMemo(() => {
    if (!searchQuery.trim() && data?.totals) return data.totals
    return filteredRows.reduce(
      (acc, r) => ({
        debit: acc.debit + r.debit,
        credit: acc.credit + r.credit,
        debitBalance: acc.debitBalance + r.debitBalance,
        creditBalance: acc.creditBalance + r.creditBalance,
      }),
      { debit: 0, credit: 0, debitBalance: 0, creditBalance: 0 },
    )
  }, [filteredRows, searchQuery, data])

  const isBalanced = data?.totals
    ? Math.abs(data.totals.debitBalance - data.totals.creditBalance) < 0.005
    : false

  // CSV export
  const handleExportCSV = useCallback(() => {
    if (!filteredRows.length) return

    const header = "Código,Cuenta,Tipo,Debe (Sumas),Haber (Sumas),Saldo Deudor,Saldo Acreedor"
    const lines = filteredRows.map((r) =>
      [
        r.accountCode,
        `"${r.accountName}"`,
        ACCOUNT_TYPE_LABELS[r.accountType] || r.accountType,
        r.debit.toFixed(2),
        r.credit.toFixed(2),
        r.debitBalance.toFixed(2),
        r.creditBalance.toFixed(2),
      ].join(","),
    )
    const totalLine = [
      "",
      "TOTALES",
      "",
      displayTotals.debit.toFixed(2),
      displayTotals.credit.toFixed(2),
      displayTotals.debitBalance.toFixed(2),
      displayTotals.creditBalance.toFixed(2),
    ].join(",")

    const csv = [header, ...lines, totalLine].join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `balance-comprobacion-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredRows, displayTotals])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Balance de Comprobación</h1>
            <PageGuideButton steps={TRIAL_BALANCE_GUIDE_STEPS} tooltipLabel="Guía del balance" />
          </div>
          <p className="text-sm text-muted-foreground">
            Sumas y saldos por cuenta contable
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
                  disabled={!filteredRows.length}
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
        <TrialBalanceSkeleton />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState hasFilters={!!dateRange?.from} />
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
              label="Saldo Deudor"
              value={`S/ ${formatAmount(data.totals.debitBalance)}`}
              icon={TrendingUp}
              color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
            />
            <MetricCard
              label="Saldo Acreedor"
              value={`S/ ${formatAmount(data.totals.creditBalance)}`}
              icon={TrendingDown}
              color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            />
            <MetricCard
              label="Estado"
              value={isBalanced ? "Cuadrado" : "Descuadre"}
              icon={isBalanced ? CheckCircle2 : XCircle}
              color={
                isBalanced
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }
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

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead rowSpan={2} className="w-[80px] border-r align-middle">Código</TableHead>
                  <TableHead rowSpan={2} className="border-r align-middle">Cuenta</TableHead>
                  <TableHead rowSpan={2} className="w-[90px] border-r text-center align-middle">Tipo</TableHead>
                  <TableHead colSpan={2} className="text-center border-r border-b">Sumas</TableHead>
                  <TableHead colSpan={2} className="text-center border-b">Saldos</TableHead>
                </TableRow>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-right w-[120px]">Debe</TableHead>
                  <TableHead className="text-right w-[120px] border-r">Haber</TableHead>
                  <TableHead className="text-right w-[120px]">Deudor</TableHead>
                  <TableHead className="text-right w-[120px]">Acreedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => {
                  const typeColor = ACCOUNT_TYPE_COLORS[row.accountType] || ""
                  const typeLabel = ACCOUNT_TYPE_LABELS[row.accountType] || row.accountType

                  return (
                    <TableRow key={row.accountId} className="hover:bg-muted/20">
                      <TableCell className="font-mono text-xs border-r">
                        {row.accountCode}
                      </TableCell>
                      <TableCell className="text-sm border-r">
                        {row.accountName}
                      </TableCell>
                      <TableCell className="text-center border-r">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeColor}`}>
                          {typeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {row.debit > 0 ? formatAmount(row.debit) : "-"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm border-r">
                        {row.credit > 0 ? formatAmount(row.credit) : "-"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {row.debitBalance > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {formatAmount(row.debitBalance)}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {row.creditBalance > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {formatAmount(row.creditBalance)}
                          </span>
                        ) : "-"}
                      </TableCell>
                    </TableRow>
                  )
                })}

                {/* Totals row */}
                <TableRow className="bg-muted/40 font-semibold border-t-2">
                  <TableCell colSpan={3} className="text-sm border-r">
                    TOTALES ({filteredRows.length} cuentas)
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {formatAmount(displayTotals.debit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm border-r">
                    {formatAmount(displayTotals.credit)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-emerald-600 dark:text-emerald-400">
                    {formatAmount(displayTotals.debitBalance)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm text-red-600 dark:text-red-400">
                    {formatAmount(displayTotals.creditBalance)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden rounded-lg border">
            {filteredRows.map((row) => (
              <MobileRowCard key={row.accountId} row={row} />
            ))}

            {/* Mobile totals */}
            <div className="p-3 bg-muted/40 border-t-2 space-y-2">
              <p className="text-xs font-semibold">
                TOTALES ({filteredRows.length} cuentas)
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs tabular-nums">
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium">Sumas</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Debe:</span>
                    <span className="font-semibold">{formatAmount(displayTotals.debit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Haber:</span>
                    <span className="font-semibold">{formatAmount(displayTotals.credit)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground font-medium">Saldos</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deudor:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatAmount(displayTotals.debitBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acreedor:</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {formatAmount(displayTotals.creditBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {filteredRows.length === 0 && searchQuery && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No se encontraron cuentas que coincidan con &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </>
      )}
    </div>
  )
}
