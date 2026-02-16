"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { pdf } from "@react-pdf/renderer"
import { AlertCircle, CheckCircle2, Clock3, Save } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { cn } from "@/lib/utils"
import { QuotePdfDocument } from "../QuotePdfDocument"
import {
  createQuoteDraft,
  getQuoteById,
  getQuoteMeta,
  sendQuoteWhatsApp,
  type QuoteDraftPayload,
} from "../quotes.api"
import {
  getQuoteEvents,
  getQuotesHistory,
  type QuoteHistoryEvent,
  type QuoteHistoryItem,
} from "../quotes-history.api"

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  ISSUED: "Emitida",
  CANCELLED: "Cancelada",
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  ISSUED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
}

const LAST_EVENT_LABELS: Record<string, string> = {
  DRAFT_SAVED: "Borrador guardado",
  ISSUE_ATTEMPT: "Intento de emisión",
  ISSUED: "Emitida",
  ISSUE_FAILED: "Error de emisión",
}

const EVENT_META: Record<
  string,
  {
    label: string
    badgeClass: string
    Icon: typeof Save
    cardClass: string
  }
> = {
  DRAFT_SAVED: {
    label: "Borrador guardado",
    badgeClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200",
    Icon: Save,
    cardClass: "border-cyan-200/70 dark:border-cyan-900/60",
  },
  ISSUE_ATTEMPT: {
    label: "Intento de emisión",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
    Icon: Clock3,
    cardClass: "border-amber-200/70 dark:border-amber-900/60",
  },
  ISSUED: {
    label: "Emitida",
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
    Icon: CheckCircle2,
    cardClass: "border-emerald-200/70 dark:border-emerald-900/60",
  },
  ISSUE_FAILED: {
    label: "Error de emisión",
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
    Icon: AlertCircle,
    cardClass: "border-rose-200/70 dark:border-rose-900/60",
  },
}

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message
  }
  return fallback
}

export default function QuotesHistoryPage() {
  const router = useRouter()
  const { selection: tenantSelection } = useTenantSelection()
  const [rows, setRows] = useState<QuoteHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState("")
  const [query, setQuery] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [whatsAppDialogOpen, setWhatsAppDialogOpen] = useState(false)
  const [pendingWhatsAppQuoteId, setPendingWhatsAppQuoteId] = useState<number | null>(null)
  const [whatsAppPhoneInput, setWhatsAppPhoneInput] = useState("")
  const [eventsDialogOpen, setEventsDialogOpen] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsRows, setEventsRows] = useState<QuoteHistoryEvent[]>([])
  const [eventsQuoteNumber, setEventsQuoteNumber] = useState<string>("")
  const [eventsCodeFilter, setEventsCodeFilter] = useState<string>("ALL")
  const [expandedDiffId, setExpandedDiffId] = useState<string | null>(null)

  const filters = useMemo(
    () => ({
      status: status || undefined,
      q: query || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [from, query, status, to],
  )

  useEffect(() => {
    let active = true
    setLoading(true)
    getQuotesHistory(filters)
      .then((data) => {
        if (!active) return
        setRows(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!active) return
        setRows([])
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [filters])

  const buildPdfFromQuote = async (quoteId: number) => {
    const detail = await getQuoteById(quoteId)
    const meta = await getQuoteMeta(tenantSelection.companyId)
    const data = {
      companyName: meta.company.name,
      companyLogoUrl: meta.company.logoUrl,
      companyAddress: meta.company.address,
      companyPhone: meta.company.phone,
      companyEmail: meta.company.email,
      clientName: detail.clientNameSnapshot || "",
      contactName: detail.contactSnapshot || "",
      validity: detail.validity,
      currency: detail.currency,
      conditions: detail.conditions || "",
      issuedAt: new Date(detail.issuedAt ?? detail.createdAt).toLocaleDateString("es-PE"),
      quoteNumber: detail.quoteNumber || `#${detail.id}`,
      items: detail.items.map((item) => ({
        name: item.name,
        price: item.unitPrice,
        quantity: item.quantity,
        description: item.description ?? undefined,
        specs: Array.isArray(item.specs) ? item.specs : [],
      })),
      subtotal: detail.subtotal,
      margin: detail.marginAmount,
      tax: detail.taxAmount,
      total: detail.total,
    }
    return pdf(<QuotePdfDocument data={data} />).toBlob()
  }

  const handlePrint = async (quoteId: number) => {
    setProcessingId(quoteId)
    try {
      const blob = await buildPdfFromQuote(quoteId)
      const url = URL.createObjectURL(blob)
      const printWindow = window.open(url, "_blank", "noopener,noreferrer")
      if (printWindow) {
        printWindow.addEventListener("load", () => {
          printWindow.print()
        })
      }
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, "No se pudo imprimir."))
    } finally {
      setProcessingId(null)
    }
  }

  const handleViewPdf = async (quoteId: number) => {
    setProcessingId(quoteId)
    try {
      const blob = await buildPdfFromQuote(quoteId)
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, "No se pudo abrir la cotizacion."))
    } finally {
      setProcessingId(null)
    }
  }

  const openWhatsAppDialog = (quoteId: number) => {
    setPendingWhatsAppQuoteId(quoteId)
    setWhatsAppPhoneInput("")
    setWhatsAppDialogOpen(true)
  }

  const closeWhatsAppDialog = () => {
    if (pendingWhatsAppQuoteId && processingId === pendingWhatsAppQuoteId) return
    setWhatsAppDialogOpen(false)
    setPendingWhatsAppQuoteId(null)
    setWhatsAppPhoneInput("")
  }

  const handleResendWhatsApp = async () => {
    if (!pendingWhatsAppQuoteId) return
    const phone = whatsAppPhoneInput.trim()
    if (!phone) {
      toast.error("Ingresa un numero de WhatsApp.")
      return
    }

    const quoteId = pendingWhatsAppQuoteId
    setProcessingId(quoteId)
    try {
      const blob = await buildPdfFromQuote(quoteId)
      await sendQuoteWhatsApp({ phone, filename: `cotizacion-${quoteId}.pdf`, file: blob })
      toast.success("Cotizacion enviada por WhatsApp.")
      closeWhatsAppDialog()
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, "No se pudo reenviar por WhatsApp."))
    } finally {
      setProcessingId(null)
    }
  }

  const handleDuplicate = async (quoteId: number) => {
    setProcessingId(quoteId)
    try {
      const detail = await getQuoteById(quoteId)
      const payload: QuoteDraftPayload = {
        clientNameSnapshot: detail.clientNameSnapshot ?? null,
        contactSnapshot: detail.contactSnapshot ?? null,
        currency: detail.currency,
        validity: detail.validity,
        conditions: detail.conditions ?? null,
        taxRate: detail.taxRate,
        subtotal: detail.subtotal,
        taxAmount: detail.taxAmount,
        marginAmount: detail.marginAmount,
        total: detail.total,
        items: detail.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          description: item.description ?? null,
          specs: Array.isArray(item.specs) ? item.specs : [],
          unitPrice: item.unitPrice,
          costPrice: item.costPrice ?? null,
          quantity: item.quantity,
          type: item.type,
          category: item.category,
        })),
      }
      const draft = await createQuoteDraft(payload)
      toast.success("Borrador duplicado.")
      router.push(`/dashboard/quotes?quoteId=${draft.id}`)
    } catch (error: unknown) {
      toast.error(resolveErrorMessage(error, "No se pudo duplicar la cotizacion."))
    } finally {
      setProcessingId(null)
    }
  }

  const openEventsDialog = async (row: QuoteHistoryItem) => {
    setEventsDialogOpen(true)
    setEventsLoading(true)
    setEventsQuoteNumber(row.quoteNumber || `#${row.id}`)
    setEventsCodeFilter("ALL")
    setExpandedDiffId(null)
    try {
      const data = await getQuoteEvents(row.id)
      setEventsRows(Array.isArray(data) ? data : [])
    } catch (error: unknown) {
      setEventsRows([])
      toast.error(resolveErrorMessage(error, "No se pudo cargar el historial de eventos."))
    } finally {
      setEventsLoading(false)
    }
  }

  const eventCodeOptions = useMemo(() => {
    const unique = new Set<string>()
    eventsRows.forEach((event) => {
      if (event.eventCode) unique.add(event.eventCode)
    })
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "es"))
  }, [eventsRows])

  const filteredEvents = useMemo(() => {
    if (eventsCodeFilter === "ALL") return eventsRows
    return eventsRows.filter((event) => event.eventCode === eventsCodeFilter)
  }, [eventsCodeFilter, eventsRows])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#F7FAFC_0%,_#F0F5FA_55%,_#E9EFF6_100%)] px-6 py-6 dark:bg-[radial-gradient(circle_at_top,_#0B1118_0%,_#0F1722_60%,_#0A0F14_100%)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Ventas</p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Historial de Cotizaciones</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Todas las cotizaciones emitidas, borradores y canceladas.
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/dashboard/quotes">Volver a cotizaciones</Link>
        </Button>
      </div>

      <Card className="mx-auto mt-6 max-w-6xl border border-slate-200/70 bg-white/90 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/70">
        <CardHeader>
          <CardTitle className="text-base text-slate-900 dark:text-slate-100">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1.2fr_0.6fr_0.6fr_0.6fr_auto]">
          <Input
            placeholder="Buscar por numero o cliente"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-cyan-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">Todos</option>
            <option value="DRAFT">Borrador</option>
            <option value="ISSUED">Emitida</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
          <Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          <Button variant="outline" onClick={() => setQuery("")}>
            Limpiar
          </Button>
        </CardContent>
      </Card>

      <Card className="mx-auto mt-6 max-w-6xl border border-slate-200/70 bg-white/90 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/70">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-slate-900 dark:text-slate-100">Cotizaciones</CardTitle>
          <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {rows.length} registros
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 text-xs font-semibold uppercase text-slate-400 sm:grid-cols-[1.1fr_0.9fr_0.8fr_0.8fr_0.9fr_0.6fr_1.4fr]">
            <span>Numero</span>
            <span>Cliente</span>
            <span>Fecha</span>
            <span>Estado</span>
            <span>Último evento</span>
            <span className="text-right">Total</span>
            <span className="text-right">Acciones</span>
          </div>
          <Separator className="my-3" />
          {loading ? (
            <div className="py-8 text-sm text-muted-foreground">Cargando historial...</div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-sm text-muted-foreground">No hay cotizaciones registradas.</div>
          ) : (
            rows.map((row) => (
              <div
                key={row.id}
                className="grid items-center gap-2 rounded-xl border border-slate-200/60 bg-white/70 px-3 py-3 text-sm text-slate-700 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/40 dark:border-slate-800/60 dark:bg-slate-950/40 dark:text-slate-200"
                style={{ gridTemplateColumns: "1.1fr 0.9fr 0.8fr 0.8fr 0.9fr 0.6fr 1.4fr" }}
              >
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {row.quoteNumber || `#${row.id}`}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {row.clientNameSnapshot || "Sin cliente"}
                </span>
                <span>{new Date(row.createdAt).toLocaleDateString("es-PE")}</span>
                <span
                  className={cn(
                    "inline-flex w-fit rounded-full px-2 py-1 text-[11px] font-semibold",
                    STATUS_STYLES[row.status],
                  )}
                >
                  {STATUS_LABELS[row.status] ?? row.status}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {row.lastEventCode ? (
                    <span className="flex flex-col gap-0.5">
                      <span>{LAST_EVENT_LABELS[row.lastEventCode] ?? row.lastEventCode}</span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {row.lastEventAt ? new Date(row.lastEventAt).toLocaleString("es-PE") : "Sin fecha"}
                      </span>
                    </span>
                  ) : (
                    "Sin eventos"
                  )}
                </span>
                <span className="text-right font-semibold">
                  {row.currency} {Number(row.total ?? 0).toFixed(2)}
                </span>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => void openEventsDialog(row)}
                  >
                    Eventos
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => handleViewPdf(row.id)}
                    disabled={processingId === row.id}
                  >
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => handlePrint(row.id)}
                    disabled={processingId === row.id}
                  >
                    Imprimir
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => openWhatsAppDialog(row.id)}
                    disabled={processingId === row.id}
                  >
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => handleDuplicate(row.id)}
                    disabled={processingId === row.id}
                  >
                    Duplicar
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={whatsAppDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeWhatsAppDialog()
            return
          }
          setWhatsAppDialogOpen(true)
        }}
      >
        <DialogContent className="border-slate-200/80 bg-white/95 sm:max-w-md dark:border-slate-800/80 dark:bg-slate-950/95">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Reenviar por WhatsApp</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Envia la cotizacion seleccionada en PDF al numero indicado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="quote-whatsapp-phone" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Numero de WhatsApp
            </label>
            <Input
              id="quote-whatsapp-phone"
              autoFocus
              placeholder="Ej. +51987654321"
              value={whatsAppPhoneInput}
              onChange={(event) => setWhatsAppPhoneInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void handleResendWhatsApp()
                }
              }}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" className="cursor-pointer" onClick={closeWhatsAppDialog}>
              Cancelar
            </Button>
            <Button
              className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400"
              onClick={() => void handleResendWhatsApp()}
              disabled={!!pendingWhatsAppQuoteId && processingId === pendingWhatsAppQuoteId}
            >
              {pendingWhatsAppQuoteId && processingId === pendingWhatsAppQuoteId
                ? "Enviando..."
                : "Enviar por WhatsApp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={eventsDialogOpen} onOpenChange={setEventsDialogOpen}>
        <DialogContent className="border-slate-200/80 bg-white/95 sm:max-w-2xl dark:border-slate-800/80 dark:bg-slate-950/95">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">
              Eventos de cotización {eventsQuoteNumber}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Trazabilidad de guardado, emisión y errores de la cotización seleccionada.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="event-code-filter"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Filtrar evento
            </label>
            <select
              id="event-code-filter"
              value={eventsCodeFilter}
              onChange={(event) => setEventsCodeFilter(event.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 shadow-sm outline-none transition focus:border-cyan-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="ALL">Todos</option>
              {eventCodeOptions.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {filteredEvents.length} evento(s)
            </span>
          </div>

          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {eventsLoading ? (
              <div className="py-6 text-sm text-muted-foreground">Cargando eventos...</div>
            ) : filteredEvents.length === 0 ? (
              <div className="py-6 text-sm text-muted-foreground">No hay eventos registrados para esta cotización.</div>
            ) : (
              filteredEvents.map((event) => {
                const createdAt = new Date(event.createdAt).toLocaleString("es-PE")
                const meta = EVENT_META[event.eventCode ?? ""] ?? {
                  label: event.eventCode ?? event.action,
                  badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
                  Icon: Clock3,
                  cardClass: "border-slate-200/70 dark:border-slate-800/70",
                }
                const EventIcon = meta.Icon
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "rounded-xl border bg-white/80 p-3 text-sm dark:bg-slate-900/60",
                      meta.cardClass,
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={meta.badgeClass}>
                        <span className="inline-flex items-center gap-1">
                          <EventIcon className="h-3.5 w-3.5" />
                          {meta.label}
                        </span>
                      </Badge>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{createdAt}</span>
                    </div>
                    <p className="mt-1 text-slate-800 dark:text-slate-100">
                      {event.summary || "Sin resumen"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Usuario: {event.actorEmail || (event.actorId ? `ID ${event.actorId}` : "Sistema")}
                    </p>
                    {event.diff ? (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 cursor-pointer text-xs"
                          onClick={() =>
                            setExpandedDiffId((prev) => (prev === event.id ? null : event.id))
                          }
                        >
                          {expandedDiffId === event.id ? "Ocultar JSON" : "Ver JSON"}
                        </Button>
                        {expandedDiffId === event.id ? (
                          <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                            {JSON.stringify(event.diff, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => setEventsDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
