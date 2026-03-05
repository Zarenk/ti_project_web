"use client"

import { useEffect, useState } from "react"
import {
  ShoppingCart,
  Calendar,
  Eye,
  User,
  Store,
  CreditCard,
  FileText,
  Package,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Send,
  ReceiptText,
  Ban,
  MessageCircle,
  Loader2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import { toast } from "sonner"
import { format } from "date-fns"
import { Sale } from "./columns"
import { deleteSale, sendInvoiceWhatsApp, getWhatsAppSendCounts } from "./sales.api"
import { DeleteActionsGuard } from "@/components/delete-actions-guard"
import { useModulePermission } from "@/hooks/use-module-permission"

const SUNAT_STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; badgeClass: string }> = {
  ACCEPTED: {
    label: "Aceptado",
    icon: CheckCircle2,
    badgeClass: "border-emerald-500/30 bg-emerald-500/90 text-white dark:bg-emerald-600/90",
  },
  SENT: {
    label: "Enviado",
    icon: Send,
    badgeClass: "border-emerald-500/30 bg-emerald-500/90 text-white dark:bg-emerald-600/90",
  },
  SENDING: {
    label: "Enviando",
    icon: RefreshCw,
    badgeClass: "border-blue-500/30 bg-blue-500/90 text-white dark:bg-blue-600/90",
  },
  PENDING: {
    label: "Pendiente",
    icon: Clock,
    badgeClass: "border-amber-500/30 bg-amber-500/90 text-white dark:bg-amber-600/90",
  },
  FAILED: {
    label: "Rechazado",
    icon: XCircle,
    badgeClass: "border-rose-500/30 bg-rose-500/90 text-white dark:bg-rose-600/90",
  },
  ERROR: {
    label: "Error",
    icon: XCircle,
    badgeClass: "border-rose-500/30 bg-rose-500/90 text-white dark:bg-rose-600/90",
  },
  RETRYING: {
    label: "Reintentando",
    icon: RefreshCw,
    badgeClass: "border-indigo-500/30 bg-indigo-500/90 text-white dark:bg-indigo-600/90",
  },
}

interface SalesGalleryProps {
  data: Sale[]
  onViewDetail: (sale: Sale) => void
  onDeleted: (id: number) => void
}

export function SalesGallery({ data, onViewDetail, onDeleted }: SalesGalleryProps) {
  const [whatsappCounts, setWhatsappCounts] = useState<Record<number, number>>({})
  const [whatsAppConnected, setWhatsAppConnected] = useState<boolean | null>(null)
  const checkPermission = useModulePermission()
  const whatsappAllowed = checkPermission("whatsapp")

  // Check WhatsApp connection status
  useEffect(() => {
    if (!whatsappAllowed) return
    fetch("/api/whatsapp/status")
      .then((res) => res.json())
      .then((d) => setWhatsAppConnected(d?.isConnected === true))
      .catch(() => setWhatsAppConnected(false))
  }, [whatsappAllowed])

  // Fetch WhatsApp send counts for all visible sales (only if user has whatsapp permission)
  useEffect(() => {
    if (data.length === 0 || !whatsappAllowed) return
    const saleIds = data.map((s) => s.id)
    getWhatsAppSendCounts(saleIds).then(setWhatsappCounts)
  }, [data, whatsappAllowed])

  const incrementCount = (saleId: number) => {
    setWhatsappCounts((prev) => ({ ...prev, [saleId]: (prev[saleId] ?? 0) + 1 }))
  }

  return (
    <TooltipProvider delayDuration={200}>
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <ShoppingCart className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No hay ventas registradas.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((sale) => (
            <SaleCard
              key={sale.id}
              sale={sale}
              onViewDetail={onViewDetail}
              onDeleted={onDeleted}
              whatsappSendCount={whatsappCounts[sale.id] ?? 0}
              onWhatsAppSent={() => incrementCount(sale.id)}
              whatsappAllowed={whatsappAllowed}
              whatsAppConnected={whatsAppConnected}
            />
          ))}
        </div>
      )}
    </TooltipProvider>
  )
}

function SaleCard({
  sale,
  onViewDetail,
  onDeleted,
  whatsappSendCount,
  onWhatsAppSent,
  whatsappAllowed,
  whatsAppConnected,
}: {
  sale: Sale
  onViewDetail: (sale: Sale) => void
  onDeleted: (id: number) => void
  whatsappSendCount: number
  onWhatsAppSent: () => void
  whatsappAllowed: boolean
  whatsAppConnected: boolean | null
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [whatsappPopoverOpen, setWhatsappPopoverOpen] = useState(false)
  const [whatsappPhone, setWhatsappPhone] = useState("")
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)

  const detailsCount = sale.details?.length ?? 0
  const paymentMethods = (sale.payments ?? [])
    .map((p) => p.paymentMethod?.name)
    .filter((name): name is string => typeof name === "string" && name.trim().length > 0)
  const uniqueMethods = [...new Set(paymentMethods)]

  const sunatNormalized = sale.sunatStatus?.status?.toUpperCase()
  const sunatConfig = sunatNormalized ? SUNAT_STATUS_CONFIG[sunatNormalized] : undefined

  const formattedDate = (() => {
    try {
      return format(new Date(sale.createdAt), "dd/MM/yyyy HH:mm")
    } catch {
      return "—"
    }
  })()

  const formattedTotal = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: sale.tipoMoneda && sale.tipoMoneda.length === 3 ? sale.tipoMoneda : "PEN",
    minimumFractionDigits: 2,
  }).format(sale.total)

  const handleRemoveSale = async () => {
    setIsDeleting(true)
    try {
      await deleteSale(sale.id)
      toast.success("Venta eliminada correctamente.")
      setIsDialogOpen(false)
      onDeleted(sale.id)
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la venta. Inténtalo nuevamente."
      toast.error(message)
    } finally {
      setIsDeleting(false)
    }
  }

  const isAnulada = sale.status === "ANULADA"

  const sunatAccepted = (sale.sunatStatus?.status ?? "").toUpperCase() === "ACCEPTED"
    || (sale.sunatStatus?.status ?? "").toUpperCase() === "SENT"

  const handleSendWhatsApp = async () => {
    const phone = whatsappPhone.trim()
    if (!phone) {
      toast.warning("Ingresa un número de teléfono")
      return
    }
    setIsSendingWhatsApp(true)
    try {
      await sendInvoiceWhatsApp(sale.id, phone)
      onWhatsAppSent()
      toast.success("Comprobante enviado por WhatsApp")
      setWhatsappPopoverOpen(false)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al enviar por WhatsApp"
      toast.error(message)
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  return (
    <>
      <div
        className={`group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20 cursor-pointer${isAnulada ? " opacity-60" : ""}`}
        onClick={() => onViewDetail(sale)}
      >
        {/* Top area: total + badges */}
        <div className="relative flex flex-col items-center justify-center gap-1 bg-muted/50 px-4 py-5">
          <p className={`text-2xl font-bold tabular-nums text-foreground${isAnulada ? " line-through" : ""}`}>
            {formattedTotal}
          </p>
          <p className="text-[11px] text-muted-foreground">
            #{sale.id} &middot; {detailsCount} producto{detailsCount !== 1 ? "s" : ""}
          </p>

          {/* Floating badges */}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            {sale.tipoComprobante && (
              <Badge variant="secondary" className="text-[10px] shadow-sm backdrop-blur-sm border-primary/30 bg-primary/90 text-primary-foreground">
                {sale.tipoComprobante}
              </Badge>
            )}
            {isAnulada ? (
              <Badge variant="secondary" className="text-[10px] gap-1 shadow-sm backdrop-blur-sm border-rose-500/30 bg-rose-500/90 text-white dark:bg-rose-600/90">
                <Ban className="h-2.5 w-2.5" />
                Anulada
              </Badge>
            ) : sunatNormalized && sunatConfig ? (
              <Badge variant="secondary" className={`text-[10px] gap-1 shadow-sm backdrop-blur-sm ${sunatConfig.badgeClass}`}>
                <sunatConfig.icon className={`h-2.5 w-2.5${sunatNormalized === "SENDING" || sunatNormalized === "RETRYING" ? " animate-spin" : ""}`} />
                {sunatConfig.label}
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Header: client name */}
        <div className="p-3 pb-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <h3 className="truncate text-sm font-semibold leading-tight">
                {sale.client?.name || "—"}
              </h3>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px]">
              <p className="text-xs font-medium">
                {sale.client?.name || "Sin cliente"}
                {sale.client?.documentNumber ? ` — ${sale.client.documentNumber}` : ""}
                {sale.client?.ruc ? ` — RUC: ${sale.client.ruc}` : ""}
                {sale.client?.dni ? ` — DNI: ${sale.client.dni}` : ""}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Details */}
        <div className="space-y-1 px-3 pb-2">
          {/* Store */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <Store className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                <span className="truncate text-[11px] text-muted-foreground">
                  {sale.store?.name || "Sin tienda"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Tienda: {sale.store?.name || "Sin tienda"}</p>
            </TooltipContent>
          </Tooltip>

          {/* User/seller */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <User className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                <span className="truncate text-[11px] text-muted-foreground">
                  {sale.user?.username || "—"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Vendedor: {sale.user?.username || "—"}</p>
            </TooltipContent>
          </Tooltip>

          {/* Payment methods */}
          {(sale.payments ?? []).length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                  <span className="truncate text-[11px] text-muted-foreground">
                    {uniqueMethods.length > 0 ? uniqueMethods.join(", ") : "Pago registrado"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px]">
                <p className="text-xs">
                  {(sale.payments ?? []).map((p) =>
                    `${p.paymentMethod?.name ?? "Método no especificado"}: ${new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(p.amount ?? 0)}`
                  ).join(" | ")}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Comprobante */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5">
                <FileText className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                {sale.invoices ? (
                  <span className="truncate text-[11px] text-muted-foreground">
                    {sale.invoices.tipoComprobante ?? "Comprobante"}{sale.invoices.serie && sale.invoices.nroCorrelativo ? ` ${sale.invoices.serie}-${sale.invoices.nroCorrelativo}` : ""}
                  </span>
                ) : (
                  <span className="truncate text-[11px] text-muted-foreground/50 italic">
                    Sin comprobante
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px]">
              {sale.invoices ? (
                <div className="space-y-0.5 text-xs">
                  <p className="font-medium">{sale.invoices.tipoComprobante ?? "Comprobante"}</p>
                  {sale.invoices.serie && sale.invoices.nroCorrelativo && (
                    <p>Serie-Correlativo: {sale.invoices.serie}-{sale.invoices.nroCorrelativo}</p>
                  )}
                  {sale.invoices.fechaEmision && (
                    <p>Emisión: {(() => { try { return format(new Date(sale.invoices.fechaEmision), "dd/MM/yyyy") } catch { return sale.invoices.fechaEmision } })()}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs">Esta venta no tiene comprobante asociado</p>
              )}
            </TooltipContent>
          </Tooltip>

          {/* Credit note indicator */}
          {sale.creditNotes && sale.creditNotes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <ReceiptText className="h-3 w-3 shrink-0 text-amber-500" />
              <span className="truncate text-[11px] font-medium text-amber-600 dark:text-amber-400">
                NC: {sale.creditNotes[0].serie}-{sale.creditNotes[0].correlativo}
                {" — "}
                {sale.creditNotes[0].status === "ACCEPTED" ? "Aceptada" : sale.creditNotes[0].status === "REJECTED" ? "Rechazada" : "Emitida"}
              </span>
            </div>
          )}

          {/* Items detail */}
          {detailsCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-start gap-1.5 w-full min-w-0">
                  <Package className="h-3 w-3 shrink-0 text-muted-foreground/60 mt-0.5" />
                  <div className="min-w-0 w-full">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {detailsCount} producto{detailsCount > 1 ? "s" : ""}:
                    </span>
                    {(sale.details ?? []).slice(0, 3).map((d, i) => {
                      const name = d.productName ?? d.product?.name ?? "Producto"
                      const qty = d.quantity ?? 0
                      const price = d.price ?? 0
                      const series = (d.series ?? [])
                        .map((s) => (typeof s === "string" ? s : s?.number ?? ""))
                        .filter(Boolean)
                      return (
                        <p key={d.id ?? i} className="text-[10px] text-muted-foreground/70 truncate">
                          {name} (x{qty} · S/.{price.toFixed(2)})
                          {series.length > 0 && <span className="text-muted-foreground/50"> S/N: {series[0]}{series.length > 1 ? `+${series.length - 1}` : ""}</span>}
                        </p>
                      )
                    })}
                    {detailsCount > 3 && (
                      <p className="text-[10px] text-muted-foreground/50">
                        +{detailsCount - 3} más...
                      </p>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[320px]">
                <div className="space-y-1.5">
                  {(sale.details ?? []).slice(0, 5).map((d, i) => {
                    const name = d.productName ?? d.product?.name ?? "Producto"
                    const qty = d.quantity ?? 0
                    const price = d.price ?? 0
                    const series = (d.series ?? [])
                      .map((s) => (typeof s === "string" ? s : s?.number ?? ""))
                      .filter(Boolean)
                    return (
                      <div key={d.id ?? i} className="text-xs">
                        <p className="font-medium">{name}</p>
                        <p className="text-muted-foreground">
                          Cant: {qty} &middot; S/. {price.toFixed(2)}
                          {series.length > 0 && (
                            <span> &middot; Serie: {series.join(", ")}</span>
                          )}
                        </p>
                      </div>
                    )
                  })}
                  {detailsCount > 5 && (
                    <p className="text-[10px] text-muted-foreground">
                      y {detailsCount - 5} producto{detailsCount - 5 > 1 ? "s" : ""} más...
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Date footer */}
        <div className="mt-auto border-t px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/60" />
            <span className="text-[10px] text-muted-foreground">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 border-t px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 text-[11px] cursor-pointer"
                onClick={() => onViewDetail(sale)}
              >
                <Eye className="h-3 w-3" />
                Ver Detalles
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Ver detalle completo de la venta</p>
            </TooltipContent>
          </Tooltip>
          {!isAnulada && sunatAccepted && whatsappAllowed && (
            whatsAppConnected === false ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-[11px] opacity-50 cursor-not-allowed text-muted-foreground"
                      disabled
                    >
                      <MessageCircle className="h-3 w-3" />
                      Enviar
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">WhatsApp no conectado. Conecta tu WhatsApp en Ajustes para enviar.</p>
                </TooltipContent>
              </Tooltip>
            ) : (
            <Popover open={whatsappPopoverOpen} onOpenChange={(popOpen) => {
              setWhatsappPopoverOpen(popOpen)
              if (popOpen) setWhatsappPhone((sale.client as any)?.phone || "")
            }}>
              <Tooltip>
                <PopoverTrigger asChild>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="relative h-7 gap-1 text-[11px] cursor-pointer text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                    >
                      <MessageCircle className="h-3 w-3" />
                      Enviar
                      {whatsappSendCount > 0 && (
                        <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[9px] font-bold text-white">
                          {whatsappSendCount}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                </PopoverTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">
                    {whatsappSendCount > 0
                      ? `Enviado ${whatsappSendCount} ${whatsappSendCount === 1 ? "vez" : "veces"} por WhatsApp`
                      : "Enviar comprobante por WhatsApp"}
                  </p>
                </TooltipContent>
              </Tooltip>
              <PopoverContent className="w-64 p-3 space-y-2" align="end">
                <div className="space-y-0.5">
                  <Label htmlFor={`wa-phone-${sale.id}`} className="text-xs font-medium">
                    Número de WhatsApp
                  </Label>
                </div>
                <Input
                  id={`wa-phone-${sale.id}`}
                  type="tel"
                  placeholder="Ej: 51987654321"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isSendingWhatsApp) handleSendWhatsApp()
                  }}
                />
                <Button
                  size="sm"
                  onClick={handleSendWhatsApp}
                  disabled={isSendingWhatsApp || !whatsappPhone.trim()}
                  className="w-full h-7 cursor-pointer gap-1.5 text-xs"
                >
                  {isSendingWhatsApp ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  Enviar
                </Button>
              </PopoverContent>
            </Popover>
            )
          )}
          {(() => {
            const blockDeletion = sale.invoices && sunatAccepted;

            if (blockDeletion) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-[11px] opacity-50 cursor-not-allowed"
                        disabled
                      >
                        <Trash2 className="h-3 w-3" />
                        Eliminar
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Aceptada por SUNAT. Emita una nota de crédito para anular.</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <DeleteActionsGuard>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 text-[11px] cursor-pointer text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                      onClick={() => setIsDialogOpen(true)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-3 w-3" />
                      {isDeleting ? "Eliminando..." : "Eliminar"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">
                      {sale.invoices ? "Eliminar venta y comprobante con error SUNAT" : "Eliminar esta venta"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </DeleteActionsGuard>
            );
          })()}
        </div>
      </div>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Deseas eliminar esta venta?</AlertDialogTitle>
            <AlertDialogDescription>
              {sale.invoices
                ? "Esta venta tiene un comprobante con error SUNAT. Se eliminará el comprobante junto con la venta. Esta acción no se puede deshacer."
                : "Esta acción no se puede deshacer y removerá la venta del historial."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveSale} disabled={isDeleting}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}