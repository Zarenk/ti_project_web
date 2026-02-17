"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  Hash,
  RotateCcw,
  ShoppingCart,
  Trash2,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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
import { cn } from "@/lib/utils"

import {
  type EntrySource,
  type EntryStatus,
  type JournalEntry,
  SOURCE_CONFIG,
  STATUS_CONFIG,
  deleteEntry,
  fetchEntry,
  formatAmount,
  formatCurrency,
  postEntry,
  voidEntry,
} from "../entries.api"

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SOURCE_ICONS: Record<EntrySource, React.ReactNode> = {
  SALE: <ShoppingCart className="h-4 w-4" />,
  PURCHASE: <FileText className="h-4 w-4" />,
  ADJUSTMENT: <RotateCcw className="h-4 w-4" />,
  MANUAL: <BookOpen className="h-4 w-4" />,
}

const STATUS_ICONS: Record<EntryStatus, React.ReactNode> = {
  DRAFT: <Clock className="h-4 w-4" />,
  POSTED: <CheckCircle2 className="h-4 w-4" />,
  VOID: <XCircle className="h-4 w-4" />,
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [entry, setEntry] = useState<JournalEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmAction, setConfirmAction] = useState<"post" | "void" | "delete" | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchEntry(Number(id))
      setEntry(data)
    } catch {
      toast.error("No se pudo cargar el asiento")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleAction = async () => {
    if (!confirmAction || !entry) return
    try {
      if (confirmAction === "post") {
        await postEntry(entry.id)
        toast.success("Asiento contabilizado")
      } else if (confirmAction === "void") {
        await voidEntry(entry.id)
        toast.success("Asiento anulado")
      } else {
        await deleteEntry(entry.id)
        toast.success("Asiento eliminado")
        router.push("/dashboard/accounting/entries")
        return
      }
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error en la operación")
    } finally {
      setConfirmAction(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full rounded-lg" />
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <BookOpen className="h-10 w-10 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground">Asiento no encontrado</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/accounting/entries">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver al listado
          </Link>
        </Button>
      </div>
    )
  }

  const balanced = Math.abs(Number(entry.debitTotal) - Number(entry.creditTotal)) < 0.01

  return (
    <div className="space-y-4">
      {/* Back + title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
            <Link href="/dashboard/accounting/entries">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                Asiento {entry.correlativo}
              </h1>
              <Badge variant={STATUS_CONFIG[entry.status]?.variant} className="gap-1">
                {STATUS_ICONS[entry.status]}
                {STATUS_CONFIG[entry.status]?.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              CUO: {entry.cuo}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-11 sm:ml-0">
          {entry.status === "DRAFT" && (
            <>
              <Button size="sm" onClick={() => setConfirmAction("post")}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Contabilizar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmAction("delete")}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Eliminar
              </Button>
            </>
          )}
          {entry.status === "POSTED" && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmAction("void")}
            >
              <XCircle className="mr-1.5 h-4 w-4" />
              Anular
            </Button>
          )}
        </div>
      </div>

      {/* Status timeline */}
      <StatusTimeline status={entry.status} />

      {/* Metadata card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Información del Asiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <InfoItem
              icon={<Calendar className="h-4 w-4" />}
              label="Fecha"
              value={new Date(entry.date).toLocaleDateString("es-PE", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
            <InfoItem
              icon={<Hash className="h-4 w-4" />}
              label="Correlativo"
              value={entry.correlativo}
              mono
            />
            <InfoItem
              icon={SOURCE_ICONS[entry.source]}
              label="Origen"
              value={SOURCE_CONFIG[entry.source]?.label}
              badge
              badgeColor={SOURCE_CONFIG[entry.source]?.color}
            />
            <InfoItem
              icon={<Coins className="h-4 w-4" />}
              label="Moneda"
              value={entry.moneda === "PEN" ? "Soles (PEN)" : "Dólares (USD)"}
            />
          </div>

          {entry.description && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Descripción / Glosa</p>
                <p className="text-sm">{entry.description}</p>
              </div>
            </>
          )}

          {entry.tipoCambio && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Tipo de Cambio</p>
                <p className="text-sm font-mono">{entry.tipoCambio}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Lines card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Detalle de Líneas</CardTitle>
            <Badge variant={balanced ? "default" : "destructive"} className="gap-1">
              {balanced ? (
                <><CheckCircle2 className="h-3 w-3" /> Balanceado</>
              ) : (
                <><XCircle className="h-3 w-3" /> Desbalanceado</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Cuenta</TableHead>
                  <TableHead className="w-[180px]">Nombre</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right w-[120px]">Debe</TableHead>
                  <TableHead className="text-right w-[120px]">Haber</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.lines.map((line, idx) => (
                  <TableRow key={line.id ?? idx}>
                    <TableCell>
                      <code className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">
                        {line.account?.code ?? "—"}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {line.account?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {line.description || "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {Number(line.debit) > 0 ? (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          {formatAmount(Number(line.debit))}
                        </span>
                      ) : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {Number(line.credit) > 0 ? (
                        <span className="text-orange-700 dark:text-orange-400">
                          {formatAmount(Number(line.credit))}
                        </span>
                      ) : ""}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Totals */}
                <TableRow className="border-t-2 bg-muted/30 font-semibold">
                  <TableCell colSpan={3} className="text-sm">
                    Totales
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(Number(entry.debitTotal) || 0, entry.moneda)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(Number(entry.creditTotal) || 0, entry.moneda)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Mobile lines */}
          <div className="sm:hidden divide-y">
            {entry.lines.map((line, idx) => (
              <div key={line.id ?? idx} className="px-4 py-3 space-y-1">
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {line.account?.code ?? "—"}
                  </code>
                  <span className="text-xs text-muted-foreground truncate">
                    {line.account?.name ?? "—"}
                  </span>
                </div>
                {line.description && (
                  <p className="text-xs text-muted-foreground">{line.description}</p>
                )}
                <div className="flex items-center gap-3 font-mono text-sm">
                  {Number(line.debit) > 0 && (
                    <span className="text-emerald-700 dark:text-emerald-400">
                      Debe: {formatAmount(Number(line.debit))}
                    </span>
                  )}
                  {Number(line.credit) > 0 && (
                    <span className="text-orange-700 dark:text-orange-400">
                      Haber: {formatAmount(Number(line.credit))}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div className="px-4 py-3 bg-muted/30 font-semibold">
              <div className="flex justify-between text-sm">
                <span>Total Debe</span>
                <span className="font-mono">
                  {formatCurrency(Number(entry.debitTotal) || 0, entry.moneda)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Total Haber</span>
                <span className="font-mono">
                  {formatCurrency(Number(entry.creditTotal) || 0, entry.moneda)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SUNAT info */}
      <Card className="shadow-sm">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <span>Estado SUNAT: <strong>{entry.sunatStatus === "1" ? "Registrado" : entry.sunatStatus === "8" ? "Anulado" : "Pendiente"}</strong></span>
            {entry.createdAt && (
              <span>Creado: {new Date(entry.createdAt).toLocaleString("es-PE")}</span>
            )}
            {entry.updatedAt && (
              <span>Actualizado: {new Date(entry.updatedAt).toLocaleString("es-PE")}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "post" && "¿Contabilizar asiento?"}
              {confirmAction === "void" && "¿Anular asiento?"}
              {confirmAction === "delete" && "¿Eliminar asiento?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "post" && "El asiento pasará a estado Contabilizado y no podrá editarse."}
              {confirmAction === "void" && "El asiento será anulado. Esta acción no se puede deshacer."}
              {confirmAction === "delete" && "El asiento borrador será eliminado permanentemente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>
              {confirmAction === "post" && "Contabilizar"}
              {confirmAction === "void" && "Anular"}
              {confirmAction === "delete" && "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function StatusTimeline({ status }: { status: EntryStatus }) {
  const steps = [
    { key: "DRAFT" as const, label: "Borrador", icon: Clock },
    { key: "POSTED" as const, label: "Contabilizado", icon: CheckCircle2 },
  ]

  const isVoid = status === "VOID"
  const activeIndex = status === "DRAFT" ? 0 : 1

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1">
      {steps.map((step, i) => {
        const isActive = !isVoid && i <= activeIndex
        const Icon = step.icon
        return (
          <div key={step.key} className="flex items-center gap-1">
            {i > 0 && (
              <div className={cn("h-0.5 w-6 rounded-full", isActive ? "bg-emerald-500" : "bg-muted")} />
            )}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="h-3 w-3" />
              {step.label}
            </div>
          </div>
        )
      })}
      {isVoid && (
        <>
          <div className="h-0.5 w-6 rounded-full bg-red-300 dark:bg-red-800" />
          <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
            <XCircle className="h-3 w-3" />
            Anulado
          </div>
        </>
      )}
    </div>
  )
}

function InfoItem({
  icon,
  label,
  value,
  mono,
  badge,
  badgeColor,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
  badge?: boolean
  badgeColor?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      {badge ? (
        <Badge variant="outline" className={cn("text-xs gap-1", badgeColor)}>
          {value}
        </Badge>
      ) : (
        <p className={cn("text-sm font-medium", mono && "font-mono")}>{value}</p>
      )}
    </div>
  )
}
