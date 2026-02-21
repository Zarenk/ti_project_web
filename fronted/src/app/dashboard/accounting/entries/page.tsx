"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRightLeft,
  Banknote,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  FileText,
  Filter,
  Hash,
  Package,
  Plus,
  RotateCcw,
  ShoppingCart,
  Smartphone,
  Trash2,
  User,
  Wallet,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"
import { PageGuideButton } from "@/components/page-guide-dialog"
import { ENTRIES_GUIDE_STEPS } from "./entries-guide-steps"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"
import { useTenantSelection } from "@/context/tenant-selection-context"

import {
  type EntryFilters,
  type EntrySource,
  type EntryStatus,
  type JournalEntry,
  SOURCE_CONFIG,
  STATUS_CONFIG,
  deleteEntry,
  fetchEntries,
  formatAmount,
  postEntry,
  voidEntry,
} from "./entries.api"
import { EntryForm } from "./entry-form"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 20

const SOURCE_ICONS: Record<EntrySource, React.ReactNode> = {
  SALE: <ShoppingCart className="h-3.5 w-3.5" />,
  PURCHASE: <FileText className="h-3.5 w-3.5" />,
  ADJUSTMENT: <RotateCcw className="h-3.5 w-3.5" />,
  MANUAL: <BookOpen className="h-3.5 w-3.5" />,
}

const STATUS_ICONS: Record<EntryStatus, React.ReactNode> = {
  DRAFT: <Clock className="h-3.5 w-3.5" />,
  POSTED: <CheckCircle2 className="h-3.5 w-3.5" />,
  VOID: <XCircle className="h-3.5 w-3.5" />,
}

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function buildDateRange(date: string, view: "day" | "month" | "year") {
  const [y, m, d] = date.split("-").map(Number)
  if (view === "day") {
    return {
      from: new Date(y, m - 1, d, 0, 0, 0).toISOString(),
      to: new Date(y, m - 1, d, 23, 59, 59, 999).toISOString(),
    }
  }
  if (view === "month") {
    return {
      from: new Date(y, m - 1, 1, 0, 0, 0).toISOString(),
      to: new Date(y, m, 0, 23, 59, 59, 999).toISOString(),
    }
  }
  return {
    from: new Date(y, 0, 1, 0, 0, 0).toISOString(),
    to: new Date(y, 11, 31, 23, 59, 59, 999).toISOString(),
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AccountingEntriesPage() {
  const { version } = useTenantSelection()

  // Data
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [periodView, setPeriodView] = useState<"day" | "month" | "year">("month")
  const [selectedDate, setSelectedDate] = useState(todayISO)
  const [sourceFilter, setSourceFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)

  // UI state
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [formOpen, setFormOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    id: number
    type: "post" | "void" | "delete"
  } | null>(null)

  /* ---- Fetch ---- */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const range = buildDateRange(selectedDate, periodView)
      const filters: EntryFilters = {
        from: range.from,
        to: range.to,
        page,
        size: PAGE_SIZE,
      }
      if (sourceFilter !== "all") filters.sources = [sourceFilter as EntrySource]
      if (statusFilter !== "all") filters.statuses = [statusFilter as EntryStatus]

      const res = await fetchEntries(filters)
      setEntries(res.data)
      setTotal(res.total)
    } catch {
      toast.error("Error al cargar asientos")
      setEntries([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [selectedDate, periodView, sourceFilter, statusFilter, page])

  useEffect(() => { load() }, [load, version])

  /* ---- Computed metrics ---- */
  const metrics = useMemo(() => {
    let debit = 0
    let credit = 0
    let drafts = 0
    let posted = 0
    for (const e of entries) {
      debit += Number(e.debitTotal) || 0
      credit += Number(e.creditTotal) || 0
      if (e.status === "DRAFT") drafts += 1
      if (e.status === "POSTED") posted += 1
    }
    return { debit, credit, drafts, posted, total: entries.length }
  }, [entries])

  const balanced = Math.abs(metrics.debit - metrics.credit) < 0.01

  /* ---- Actions ---- */
  const handleAction = async () => {
    if (!confirmAction) return
    const { id, type } = confirmAction
    try {
      if (type === "post") {
        await postEntry(id)
        toast.success("Asiento contabilizado")
      } else if (type === "void") {
        await voidEntry(id)
        toast.success("Asiento anulado")
      } else {
        await deleteEntry(id)
        toast.success("Asiento eliminado")
      }
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error en la operación")
    } finally {
      setConfirmAction(null)
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const confirmLabels = {
    post: {
      title: "¿Contabilizar asiento?",
      desc: "El asiento pasará a estado Contabilizado y no podrá editarse.",
      action: "Contabilizar",
    },
    void: {
      title: "¿Anular asiento?",
      desc: "El asiento será anulado. Esta acción no se puede deshacer.",
      action: "Anular",
    },
    delete: {
      title: "¿Eliminar asiento?",
      desc: "El asiento borrador será eliminado permanentemente.",
      action: "Eliminar",
    },
  }

  /* ---- Render ---- */
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
                Libro Diario
              </h1>
              <PageGuideButton steps={ENTRIES_GUIDE_STEPS} tooltipLabel="Guía de asientos" />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Registro cronológico de asientos contables
            </p>
          </div>
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo Asiento
          </Button>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard label="Total asientos" value={String(metrics.total)} sub="en el periodo" />
          <MetricCard
            label="Borradores"
            value={String(metrics.drafts)}
            sub="pendientes"
            accent={metrics.drafts > 0 ? "amber" : undefined}
          />
          <MetricCard
            label="Total Debe"
            value={formatAmount(metrics.debit)}
            sub={metrics.debit > 0 ? "S/" : ""}
            mono
          />
          <MetricCard
            label="Total Haber"
            value={formatAmount(metrics.credit)}
            sub={metrics.credit > 0 ? "S/" : ""}
            mono
          />
        </div>

        {/* Filters + balance indicator */}
        <Card className="shadow-sm">
          <CardContent className="py-3 px-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />

              <Select value={periodView} onValueChange={(v) => { setPeriodView(v as "day" | "month" | "year"); setPage(1) }}>
                <SelectTrigger className="w-[110px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Día</SelectItem>
                  <SelectItem value="month">Mes</SelectItem>
                  <SelectItem value="year">Año</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setPage(1) }}
                className="w-[160px] h-8 text-sm"
              />

              <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[130px] h-8 text-sm">
                  <SelectValue placeholder="Origen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo origen</SelectItem>
                  <SelectItem value="SALE">Ventas</SelectItem>
                  <SelectItem value="PURCHASE">Compras</SelectItem>
                  <SelectItem value="ADJUSTMENT">Ajustes</SelectItem>
                  <SelectItem value="MANUAL">Manuales</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[140px] h-8 text-sm">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo estado</SelectItem>
                  <SelectItem value="DRAFT">Borrador</SelectItem>
                  <SelectItem value="POSTED">Contabilizado</SelectItem>
                  <SelectItem value="VOID">Anulado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Balance bar */}
            {!loading && entries.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 bg-muted/20">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span>
                    <span className="text-muted-foreground">Debe:</span>{" "}
                    <span className="font-medium font-mono">{formatAmount(metrics.debit)}</span>
                  </span>
                  <span>
                    <span className="text-muted-foreground">Haber:</span>{" "}
                    <span className="font-medium font-mono">{formatAmount(metrics.credit)}</span>
                  </span>
                </div>
                <Badge
                  variant={balanced ? "default" : "destructive"}
                  className="flex items-center gap-1"
                >
                  {balanced ? (
                    <><CheckCircle2 className="h-3 w-3" /> Balanceado</>
                  ) : (
                    <><XCircle className="h-3 w-3" /> Desbalanceado</>
                  )}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desktop/Tablet Table */}
        <Card className="shadow-sm hidden sm:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead className="w-[100px]">Fecha</TableHead>
                    <TableHead className="w-[90px]">Correlativo</TableHead>
                    <TableHead className="min-w-[180px]">Descripción</TableHead>
                    <TableHead className="w-[90px]">Origen</TableHead>
                    <TableHead className="w-[120px]">Estado</TableHead>
                    <TableHead className="text-right w-[110px]">Debe</TableHead>
                    <TableHead className="text-right w-[110px]">Haber</TableHead>
                    <TableHead className="text-right w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <BookOpen className="h-8 w-8 opacity-40" />
                          <p className="text-sm">No hay asientos para el periodo seleccionado</p>
                          <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Crear asiento manual
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => (
                      <React.Fragment key={entry.id}>
                        <TableRow
                          className={cn(
                            "cursor-pointer hover:bg-muted/50 transition-colors",
                            entry.status === "VOID" && "opacity-50",
                          )}
                          onClick={() => toggleExpand(entry.id)}
                        >
                          <TableCell className="px-2">
                            {expandedIds.has(entry.id) ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(entry.date).toLocaleDateString("es-PE")}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{entry.correlativo}</code>
                          </TableCell>
                          <TableCell>
                            <DescriptionCell entry={entry} />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-xs gap-1", SOURCE_CONFIG[entry.source]?.color)}>
                              {SOURCE_ICONS[entry.source]}
                              {SOURCE_CONFIG[entry.source]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_CONFIG[entry.status]?.variant} className="gap-1">
                              {STATUS_ICONS[entry.status]}
                              {STATUS_CONFIG[entry.status]?.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatAmount(Number(entry.debitTotal) || 0)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatAmount(Number(entry.creditTotal) || 0)}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <EntryActions
                              entry={entry}
                              onAction={(type) => setConfirmAction({ id: entry.id, type })}
                            />
                          </TableCell>
                        </TableRow>

                        {/* Expanded lines */}
                        {expandedIds.has(entry.id) && (
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={9} className="bg-muted/20 p-0">
                              <ExpandedLines entry={entry} />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Card List */}
        <div className="sm:hidden space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="shadow-sm">
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))
          ) : entries.length === 0 ? (
            <Card className="shadow-sm">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-8 w-8 mx-auto opacity-40 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No hay asientos</p>
              </CardContent>
            </Card>
          ) : (
            entries.map((entry) => (
              <MobileEntryCard
                key={entry.id}
                entry={entry}
                expanded={expandedIds.has(entry.id)}
                onToggle={() => toggleExpand(entry.id)}
                onAction={(type) => setConfirmAction({ id: entry.id, type })}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {!loading && total > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Siguiente <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Confirm dialog */}
        <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmAction ? confirmLabels[confirmAction.type].title : ""}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction ? confirmLabels[confirmAction.type].desc : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleAction}>
                {confirmAction ? confirmLabels[confirmAction.type].action : "Confirmar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create form */}
        <EntryForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSuccess={load}
        />
      </div>
    </TooltipProvider>
  )
}

/* ------------------------------------------------------------------ */
/*  Description parsing & payment icons                                */
/* ------------------------------------------------------------------ */

interface ParsedDescription {
  type: string       // "Venta" | "Compra" | raw
  reference: string  // "F001-00001" | "1024"
  counterpart: string // "NEO CORE" | "Cliente Test"
  paymentMethod: string // "Contado" | "Efectivo" | "Yape" | "Crédito"
  entryTag: string | null // "[entry:1024]"
}

function parseDescription(desc: string): ParsedDescription {
  // Clean the [entry:ID] tag
  const tagMatch = desc.match(/\[entry:\d+\]/)
  const entryTag = tagMatch ? tagMatch[0] : null
  const cleaned = desc.replace(/\s*\[entry:\d+\]/, "").trim()

  // Pattern: "Tipo -Referencia | Contraparte | Método de pago"
  const parts = cleaned.split("|").map((s) => s.trim())

  let type = ""
  let reference = ""
  if (parts[0]) {
    const firstPart = parts[0]
    const dashIdx = firstPart.indexOf("-")
    if (dashIdx > 0) {
      type = firstPart.slice(0, dashIdx).trim()
      reference = firstPart.slice(dashIdx + 1).trim()
    } else {
      type = firstPart
    }
  }

  return {
    type,
    reference,
    counterpart: parts[1] ?? "",
    paymentMethod: parts[2] ?? "",
    entryTag,
  }
}

const PAYMENT_METHOD_MAP: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  efectivo: {
    icon: <Banknote className="h-3.5 w-3.5" />,
    label: "Efectivo",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  contado: {
    icon: <Banknote className="h-3.5 w-3.5" />,
    label: "Contado",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  yape: {
    icon: <Smartphone className="h-3.5 w-3.5" />,
    label: "Yape",
    color: "text-purple-600 dark:text-purple-400",
  },
  plin: {
    icon: <Smartphone className="h-3.5 w-3.5" />,
    label: "Plin",
    color: "text-sky-600 dark:text-sky-400",
  },
  transferencia: {
    icon: <ArrowRightLeft className="h-3.5 w-3.5" />,
    label: "Transferencia",
    color: "text-blue-600 dark:text-blue-400",
  },
  tarjeta: {
    icon: <CreditCard className="h-3.5 w-3.5" />,
    label: "Tarjeta",
    color: "text-orange-600 dark:text-orange-400",
  },
  "tarjeta de crédito": {
    icon: <CreditCard className="h-3.5 w-3.5" />,
    label: "Tarjeta de crédito",
    color: "text-orange-600 dark:text-orange-400",
  },
  "tarjeta de débito": {
    icon: <CreditCard className="h-3.5 w-3.5" />,
    label: "Tarjeta de débito",
    color: "text-orange-600 dark:text-orange-400",
  },
  crédito: {
    icon: <Wallet className="h-3.5 w-3.5" />,
    label: "Crédito",
    color: "text-amber-600 dark:text-amber-400",
  },
  credito: {
    icon: <Wallet className="h-3.5 w-3.5" />,
    label: "Crédito",
    color: "text-amber-600 dark:text-amber-400",
  },
  deposito: {
    icon: <Building2 className="h-3.5 w-3.5" />,
    label: "Depósito",
    color: "text-blue-600 dark:text-blue-400",
  },
  depósito: {
    icon: <Building2 className="h-3.5 w-3.5" />,
    label: "Depósito",
    color: "text-blue-600 dark:text-blue-400",
  },
}

function getPaymentInfo(method: string) {
  const key = method.toLowerCase().trim()
  return PAYMENT_METHOD_MAP[key] ?? {
    icon: <Banknote className="h-3.5 w-3.5" />,
    label: method || "N/A",
    color: "text-muted-foreground",
  }
}

function getTypeIcon(type: string) {
  const lower = type.toLowerCase()
  if (lower.includes("venta")) return <ShoppingCart className="h-3.5 w-3.5 text-emerald-500" />
  if (lower.includes("compra")) return <Package className="h-3.5 w-3.5 text-orange-500" />
  if (lower.includes("ajuste")) return <RotateCcw className="h-3.5 w-3.5 text-purple-500" />
  return <FileText className="h-3.5 w-3.5 text-sky-500" />
}

/* ---- Desktop: HoverCard description ---- */

function DescriptionCell({ entry }: { entry: JournalEntry }) {
  if (!entry.description) {
    return <span className="text-sm text-muted-foreground">—</span>
  }

  const parsed = parseDescription(entry.description)
  const payment = getPaymentInfo(parsed.paymentMethod)
  const typeIcon = getTypeIcon(parsed.type)

  // Display text without [entry:ID] tag
  const displayText = entry.description.replace(/\s*\[entry:\d+\]/, "").trim()

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div className="group flex items-center gap-1.5 max-w-[300px] cursor-default">
          <span className={cn("shrink-0", payment.color)}>
            {payment.icon}
          </span>
          <p className="text-sm truncate group-hover:text-foreground transition-colors">
            {displayText}
          </p>
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        className="w-80 p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 bg-muted/40 border-b">
          <div className="flex items-center gap-2">
            {typeIcon}
            <span className="font-medium text-sm">{parsed.type || "Asiento"}</span>
            {parsed.reference && (
              <code className="ml-auto text-xs bg-background/80 px-1.5 py-0.5 rounded font-mono">
                {parsed.reference}
              </code>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="px-4 py-3 space-y-2.5">
          {/* Counterpart */}
          {parsed.counterpart && (
            <div className="flex items-start gap-2.5">
              <User className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {parsed.type.toLowerCase().includes("venta") ? "Cliente" : "Proveedor"}
                </p>
                <p className="text-sm font-medium">{parsed.counterpart}</p>
              </div>
            </div>
          )}

          {/* Payment method */}
          {parsed.paymentMethod && (
            <div className="flex items-start gap-2.5">
              <span className={cn("mt-0.5 shrink-0", payment.color)}>
                {payment.icon}
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Método de pago
                </p>
                <p className={cn("text-sm font-medium", payment.color)}>{payment.label}</p>
              </div>
            </div>
          )}

          {/* Reference */}
          {parsed.reference && (
            <div className="flex items-start gap-2.5">
              <Hash className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  Referencia
                </p>
                <p className="text-sm font-mono">{parsed.reference}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer: amounts */}
        <div className="px-4 py-2.5 border-t bg-muted/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 font-mono">
            <span className="text-muted-foreground">Debe:</span>
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              {formatAmount(Number(entry.debitTotal) || 0)}
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono">
            <span className="text-muted-foreground">Haber:</span>
            <span className="font-medium text-orange-700 dark:text-orange-400">
              {formatAmount(Number(entry.creditTotal) || 0)}
            </span>
          </div>
          <Badge
            variant={Math.abs(Number(entry.debitTotal) - Number(entry.creditTotal)) < 0.01 ? "default" : "destructive"}
            className="text-[10px] h-5 px-1.5"
          >
            {Math.abs(Number(entry.debitTotal) - Number(entry.creditTotal)) < 0.01
              ? "Cuadra"
              : "Descuadra"}
          </Badge>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

/* ---- Mobile: Inline parsed description ---- */

function MobileDescriptionCell({ entry }: { entry: JournalEntry }) {
  if (!entry.description) return null

  const parsed = parseDescription(entry.description)
  const payment = getPaymentInfo(parsed.paymentMethod)

  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <span className={cn("shrink-0", payment.color)}>
        {payment.icon}
      </span>
      <p className="text-sm truncate">
        {entry.description.replace(/\s*\[entry:\d+\]/, "").trim()}
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MetricCard({
  label,
  value,
  sub,
  accent,
  mono,
}: {
  label: string
  value: string
  sub?: string
  accent?: "amber"
  mono?: boolean
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="py-3 px-4">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            "text-lg font-semibold mt-0.5 tracking-tight",
            mono && "font-mono",
            accent === "amber" && "text-amber-600 dark:text-amber-400",
          )}
        >
          {value}
        </p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function EntryActions({
  entry,
  onAction,
}: {
  entry: JournalEntry
  onAction: (type: "post" | "void" | "delete") => void
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={`/dashboard/accounting/entries/${entry.id}`}
            className={cn(
              "inline-flex items-center justify-center rounded-md h-8 w-8",
              "text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent>Ver detalle</TooltipContent>
      </Tooltip>

      {entry.status === "DRAFT" && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAction("post")}>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Contabilizar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAction("delete")}>
                <Trash2 className="h-3.5 w-3.5 text-destructive/70" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Eliminar</TooltipContent>
          </Tooltip>
        </>
      )}
      {entry.status === "POSTED" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAction("void")}>
              <XCircle className="h-3.5 w-3.5 text-destructive/70" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Anular</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

function ExpandedLines({ entry }: { entry: JournalEntry }) {
  return (
    <div className="px-6 py-3 space-y-2">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>CUO: <code className="font-mono">{entry.cuo}</code></span>
        <span>Moneda: <strong>{entry.moneda}</strong></span>
        {entry.tipoCambio && <span>T.C.: <strong>{entry.tipoCambio}</strong></span>}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-xs text-muted-foreground">
            <th className="text-left py-1 pr-3 w-[100px]">Cuenta</th>
            <th className="text-left py-1 pr-3 w-[140px]">Nombre</th>
            <th className="text-left py-1 pr-3">Descripción</th>
            <th className="text-right py-1 pr-3 w-[100px]">Debe</th>
            <th className="text-right py-1 w-[100px]">Haber</th>
          </tr>
        </thead>
        <tbody>
          {entry.lines.map((line, idx) => (
            <tr key={line.id ?? idx} className="border-b last:border-0">
              <td className="py-1.5 pr-3">
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {line.account?.code ?? "—"}
                </code>
              </td>
              <td className="py-1.5 pr-3 text-xs text-muted-foreground truncate max-w-[140px]">
                {line.account?.name ?? "—"}
              </td>
              <td className="py-1.5 pr-3 text-xs truncate max-w-[200px]">
                {line.description || "—"}
              </td>
              <td className="py-1.5 pr-3 text-right font-mono text-xs">
                {Number(line.debit) > 0 ? formatAmount(Number(line.debit)) : ""}
              </td>
              <td className="py-1.5 text-right font-mono text-xs">
                {Number(line.credit) > 0 ? formatAmount(Number(line.credit)) : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MobileEntryCard({
  entry,
  expanded,
  onToggle,
  onAction,
}: {
  entry: JournalEntry
  expanded: boolean
  onToggle: () => void
  onAction: (type: "post" | "void" | "delete") => void
}) {
  return (
    <Card className={cn("shadow-sm transition-shadow", entry.status === "VOID" && "opacity-60")}>
      <CardContent className="p-3 space-y-2">
        {/* Top row: date + status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <code className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">{entry.correlativo}</code>
            <span className="text-xs text-muted-foreground">
              {new Date(entry.date).toLocaleDateString("es-PE")}
            </span>
          </div>
          <Badge variant={STATUS_CONFIG[entry.status]?.variant} className="gap-1 text-xs">
            {STATUS_ICONS[entry.status]}
            {STATUS_CONFIG[entry.status]?.label}
          </Badge>
        </div>

        {/* Description */}
        {entry.description && (
          <MobileDescriptionCell entry={entry} />
        )}

        {/* Source + amounts */}
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className={cn("text-xs gap-1", SOURCE_CONFIG[entry.source]?.color)}>
            {SOURCE_ICONS[entry.source]}
            {SOURCE_CONFIG[entry.source]?.label}
          </Badge>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span>D: {formatAmount(Number(entry.debitTotal) || 0)}</span>
            <span>H: {formatAmount(Number(entry.creditTotal) || 0)}</span>
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between pt-1 border-t">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onToggle}>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Ocultar" : "Ver líneas"}
          </Button>
          <div className="flex items-center gap-1">
            <Link href={`/dashboard/accounting/entries/${entry.id}`}>
              <Button variant="ghost" size="sm" className="h-7 text-xs">Detalle</Button>
            </Link>
            {entry.status === "DRAFT" && (
              <>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-emerald-600" onClick={() => onAction("post")}>
                  Contabilizar
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => onAction("delete")}>
                  Eliminar
                </Button>
              </>
            )}
            {entry.status === "POSTED" && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => onAction("void")}>
                Anular
              </Button>
            )}
          </div>
        </div>

        {/* Expanded lines */}
        {expanded && (
          <div className="border-t pt-2 space-y-1.5">
            {entry.lines.map((line, idx) => (
              <div key={line.id ?? idx} className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <code className="shrink-0 bg-muted px-1 py-0.5 rounded text-[10px]">
                    {line.account?.code ?? "—"}
                  </code>
                  <span className="truncate text-muted-foreground">{line.account?.name ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 font-mono shrink-0">
                  {Number(line.debit) > 0 && (
                    <span className="text-emerald-700 dark:text-emerald-400">
                      D {formatAmount(Number(line.debit))}
                    </span>
                  )}
                  {Number(line.credit) > 0 && (
                    <span className="text-orange-700 dark:text-orange-400">
                      H {formatAmount(Number(line.credit))}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
