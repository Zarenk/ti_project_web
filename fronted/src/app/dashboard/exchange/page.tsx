"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import {
  CalendarIcon,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Plus,
  History,
  DollarSign,
  Euro,
  Minus,
  Search,
} from "lucide-react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts"
import {
  ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { DataTablePagination } from "@/components/data-table-pagination"
import { CalendarDatePicker } from "@/components/calendar-date-picker"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { useTenantSelection } from "@/context/tenant-selection-context"

import {
  createTipoCambio,
  getAllTipoCambio,
  getLatestExchangeRateByCurrency,
} from "./exchange.api"

/* ── Types ────────────────────────────────────────────────── */

interface TipoCambio {
  id: number
  fecha: string
  moneda: string
  valor: number
}

type CurrencyCode = "USD" | "EUR"

const CURRENCIES: { value: CurrencyCode; label: string; icon: typeof DollarSign }[] = [
  { value: "USD", label: "Dólar", icon: DollarSign },
  { value: "EUR", label: "Euro", icon: Euro },
]

/* ── Chart tooltip ────────────────────────────────────────── */

function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="font-medium">{entry.name}:</span>
          <span className="tabular-nums">S/. {Number(entry.value).toFixed(4)}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Main Page ────────────────────────────────────────────── */

export default function ExchangeRatePage() {
  const { version } = useTenantSelection()

  // ─ History data
  const [data, setData] = useState<TipoCambio[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ─ Form state
  const [fecha, setFecha] = useState<Date>(new Date())
  const [moneda, setMoneda] = useState<CurrencyCode>("USD")
  const [valor, setValor] = useState("")
  const [loadingRate, setLoadingRate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  // ─ Filters
  const [chartCurrency, setChartCurrency] = useState<CurrencyCode | "ALL">("ALL")
  const [globalFilter, setGlobalFilter] = useState("")
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined)

  // ─ Fetch all history
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const json = await getAllTipoCambio()
      setData(Array.isArray(json) ? json : [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo cargar el historial."
      setError(msg)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData, version])

  // ─ Fetch latest rate when currency changes
  const fetchLatestRate = useCallback(async (currency: string) => {
    setLoadingRate(true)
    try {
      const latest = await getLatestExchangeRateByCurrency(currency)
      if (latest !== null) {
        setValor(latest.toFixed(4))
      } else {
        setValor("")
      }
    } catch {
      setValor("")
    } finally {
      setLoadingRate(false)
    }
  }, [])

  useEffect(() => {
    void fetchLatestRate(moneda)
  }, [moneda, version, fetchLatestRate])

  // ─ Reset on tenant change
  useEffect(() => {
    setGlobalFilter("")
    setSelectedDateRange(undefined)
  }, [version])

  // ─ Submit new rate
  const handleSubmit = async () => {
    const parsed = Number.parseFloat(valor)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Ingresa un valor numérico válido mayor a 0.")
      return
    }
    setSubmitting(true)
    try {
      await createTipoCambio({
        fecha: format(fecha, "yyyy-MM-dd"),
        moneda,
        valor: parsed,
      })
      toast.success("Tipo de cambio registrado.")
      setValor("")
      setFecha(new Date())
      void fetchData()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al registrar."
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // ─ Derived: stats
  const latestByMoney = useMemo(() => {
    const map = new Map<string, TipoCambio>()
    const sorted = [...data].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    )
    for (const item of sorted) {
      if (!map.has(item.moneda)) map.set(item.moneda, item)
    }
    return map
  }, [data])

  const trendByMoney = useMemo(() => {
    const map = new Map<string, { current: number; previous: number | null }>()
    for (const currency of ["USD", "EUR"]) {
      const sorted = data
        .filter((d) => d.moneda === currency)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      if (sorted.length >= 1) {
        map.set(currency, {
          current: sorted[0].valor,
          previous: sorted.length >= 2 ? sorted[1].valor : null,
        })
      }
    }
    return map
  }, [data])

  // ─ Derived: chart data
  const chartData = useMemo(() => {
    const filtered =
      chartCurrency === "ALL" ? data : data.filter((d) => d.moneda === chartCurrency)

    const grouped = new Map<string, { date: string; USD?: number; EUR?: number }>()
    for (const item of filtered) {
      const dateKey = format(new Date(item.fecha), "dd MMM yy", { locale: es })
      const existing = grouped.get(dateKey) || { date: dateKey }
      existing[item.moneda as "USD" | "EUR"] = item.valor
      grouped.set(dateKey, existing)
    }

    return Array.from(grouped.values()).sort((a, b) => {
      const dA = data.find((d) => format(new Date(d.fecha), "dd MMM yy", { locale: es }) === a.date)
      const dB = data.find((d) => format(new Date(d.fecha), "dd MMM yy", { locale: es }) === b.date)
      return new Date(dA?.fecha ?? 0).getTime() - new Date(dB?.fecha ?? 0).getTime()
    })
  }, [data, chartCurrency])

  const showUSD = chartCurrency === "ALL" || chartCurrency === "USD"
  const showEUR = chartCurrency === "ALL" || chartCurrency === "EUR"

  // ─ Derived: table data
  const filteredTableData = useMemo(() => {
    if (!selectedDateRange?.from || !selectedDateRange?.to) return data
    const from = new Date(selectedDateRange.from)
    const to = new Date(selectedDateRange.to)
    return data.filter((item) => {
      const d = new Date(item.fecha)
      return d >= from && d <= to
    })
  }, [data, selectedDateRange])

  const columns = useMemo<ColumnDef<TipoCambio, any>[]>(
    () => [
      {
        accessorKey: "fecha",
        header: "Fecha",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {format(new Date(row.original.fecha), "dd MMM yyyy", { locale: es })}
          </span>
        ),
      },
      {
        accessorKey: "moneda",
        header: "Moneda",
        cell: ({ row }) => {
          const m = row.original.moneda
          return (
            <Badge
              variant="outline"
              className={cn(
                "font-mono text-xs",
                m === "USD" && "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
                m === "EUR" && "border-blue-500/30 text-blue-600 dark:text-blue-400",
              )}
            >
              {m === "USD" ? <DollarSign className="mr-1 h-3 w-3" /> : <Euro className="mr-1 h-3 w-3" />}
              {m}
            </Badge>
          )
        },
      },
      {
        accessorKey: "valor",
        header: "Valor en Soles",
        cell: ({ row }) => (
          <span className="text-sm font-medium tabular-nums">
            S/. {row.original.valor.toFixed(4)}
          </span>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: filteredTableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  })

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tipo de Cambio</h1>
          <p className="text-sm text-muted-foreground">
            Registra y consulta los tipos de cambio del día
          </p>
        </div>
      </div>

      {/* ── Top row: Form + Current rates ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Register form */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4" />
              Registrar tipo de cambio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              {/* Date */}
              <div className="min-w-[150px] flex-1 space-y-1.5">
                <Label className="text-xs">Fecha</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full cursor-pointer justify-start text-left text-sm font-normal"
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                      {format(fecha, "dd MMM yyyy", { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fecha}
                      onSelect={(d) => {
                        if (d) {
                          setFecha(d)
                          setCalendarOpen(false)
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Currency */}
              <div className="min-w-[130px] space-y-1.5">
                <Label className="text-xs">Moneda</Label>
                <Select
                  value={moneda}
                  onValueChange={(v) => setMoneda(v as CurrencyCode)}
                  disabled={loadingRate}
                >
                  <SelectTrigger className="w-full cursor-pointer">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="cursor-pointer">
                        <span className="flex items-center gap-2">
                          <c.icon className="h-3.5 w-3.5" />
                          {c.value} — {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Value */}
              <div className="min-w-[140px] flex-1 space-y-1.5">
                <Label className="text-xs">Valor en Soles (S/.)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    S/.
                  </span>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder={loadingRate ? "Cargando..." : "0.0000"}
                    disabled={loadingRate}
                    className="pl-9 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </div>

              {/* Submit */}
              <Button
                onClick={handleSubmit}
                disabled={submitting || loadingRate || !valor}
                className="cursor-pointer"
              >
                {submitting ? "Registrando..." : "Registrar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current rate cards */}
        <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-1">
          {CURRENCIES.map((cur) => {
            const trend = trendByMoney.get(cur.value)
            const latest = latestByMoney.get(cur.value)
            const diff =
              trend && trend.previous != null
                ? trend.current - trend.previous
                : null
            const pct =
              diff != null && trend!.previous
                ? (diff / trend!.previous) * 100
                : null

            return (
              <Card key={cur.value} className="relative overflow-hidden">
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      cur.value === "USD"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                    )}
                  >
                    <cur.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">{cur.label} ({cur.value})</p>
                    {loading ? (
                      <Skeleton className="mt-1 h-6 w-20" />
                    ) : latest ? (
                      <p className="text-lg font-bold tabular-nums leading-tight">
                        S/. {latest.valor.toFixed(4)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin datos</p>
                    )}
                  </div>
                  {diff != null && (
                    <div
                      className={cn(
                        "flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
                        diff > 0
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : diff < 0
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {diff > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : diff < 0 ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : (
                        <Minus className="h-3 w-3" />
                      )}
                      <span className="tabular-nums">
                        {pct != null ? `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%` : "0%"}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* ── Chart ── */}
      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            Evolución del tipo de cambio
          </CardTitle>
          <Select
            value={chartCurrency}
            onValueChange={(v) => setChartCurrency(v as CurrencyCode | "ALL")}
          >
            <SelectTrigger className="w-[140px] cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="cursor-pointer">Todas</SelectItem>
              <SelectItem value="USD" className="cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" /> USD
                </span>
              </SelectItem>
              <SelectItem value="EUR" className="cursor-pointer">
                <span className="flex items-center gap-1.5">
                  <Euro className="h-3 w-3" /> EUR
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[280px] w-full rounded-lg" />
          ) : chartData.length === 0 ? (
            <div className="flex h-[280px] flex-col items-center justify-center text-muted-foreground">
              <ArrowRightLeft className="mb-2 h-8 w-8 opacity-30" />
              <p className="text-sm">No hay datos para mostrar</p>
              <p className="text-xs">Registra un tipo de cambio para ver el gráfico</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted-foreground/10" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => `S/.${v}`}
                />
                <RechartsTooltip content={<ChartTooltipContent />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                {showUSD && (
                  <Line
                    type="monotone"
                    dataKey="USD"
                    name="USD — Dólar"
                    stroke="hsl(152, 57%, 42%)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(152, 57%, 42%)" }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                )}
                {showEUR && (
                  <Line
                    type="monotone"
                    dataKey="EUR"
                    name="EUR — Euro"
                    stroke="hsl(217, 91%, 60%)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(217, 91%, 60%)" }}
                    activeDot={{ r: 5 }}
                    connectNulls
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── History table ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Historial
            {!loading && (
              <Badge variant="secondary" className="ml-1 text-xs font-normal">
                {filteredTableData.length} registros
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar moneda..."
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-full sm:w-[250px]">
              <CalendarDatePicker
                className="w-full"
                variant="outline"
                date={selectedDateRange || { from: undefined, to: undefined }}
                onDateSelect={setSelectedDateRange}
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => void fetchData()}>
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                        No hay datos disponibles.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && filteredTableData.length > 0 && (
            <DataTablePagination table={table} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
