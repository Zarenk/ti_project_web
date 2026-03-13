"use client"

import { useState, useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import {
  CreditCard,
  Plus,
  RefreshCw,
  Filter,
  ChevronDown,
  Copy,
  ExternalLink,
  CheckCircle2,
  BarChart3,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  Collapsible,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ManualPagination } from "@/components/data-table-pagination"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { queryKeys } from "@/lib/query-keys"
import { usePaymentSocket, type PaymentStatusUpdate } from "@/hooks/use-payment-socket"

import {
  getPaymentOrders,
  getCommissionReport,
  confirmManualPayment,
  type PaymentStatus,
  type PaymentProvider,
  type PaymentOrder,
} from "./payments.api"
import { PaymentStatusBadge } from "./components/payment-status-badge"
import { PaymentLinkDialog } from "./components/payment-link-dialog"

const STATUS_OPTIONS: { value: PaymentStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Pendiente" },
  { value: "PROCESSING", label: "Procesando" },
  { value: "SETTLING", label: "Liquidando" },
  { value: "COMPLETED", label: "Completado" },
  { value: "FAILED", label: "Fallido" },
  { value: "EXPIRED", label: "Expirado" },
  { value: "REFUNDED", label: "Reembolsado" },
]

const PROVIDER_OPTIONS: { value: PaymentProvider | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "mercadopago", label: "MercadoPago" },
  { value: "culqi", label: "Culqi" },
  { value: "manual", label: "Manual" },
]

export default function PaymentsPage() {
  const { selection } = useTenantSelection()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "ALL">("ALL")
  const [providerFilter, setProviderFilter] = useState<PaymentProvider | "ALL">("ALL")
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const orgId = selection?.orgId ?? null
  const companyId = selection?.companyId ?? null

  const filters = {
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    provider: providerFilter !== "ALL" ? providerFilter : undefined,
    page,
    pageSize,
  }

  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.payments.list(orgId, companyId, filters),
    queryFn: () => getPaymentOrders(filters),
    enabled: !!orgId,
  })

  const { data: commissions } = useQuery({
    queryKey: queryKeys.payments.commissions(orgId, companyId),
    queryFn: () => getCommissionReport(),
    enabled: !!orgId,
  })

  const handleSocketUpdate = useCallback(
    (payload: PaymentStatusUpdate) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.root(orgId, companyId),
      })
      const statusLabel =
        payload.status === "COMPLETED"
          ? "completado"
          : payload.status === "FAILED"
            ? "fallido"
            : payload.status.toLowerCase()
      toast.info(`Pago ${payload.code}: ${statusLabel}`)
    },
    [queryClient, orgId, companyId],
  )

  const { connected: socketConnected } = usePaymentSocket({
    enabled: !!orgId,
    onStatusUpdate: handleSocketUpdate,
  })

  const handleConfirmManual = async (order: PaymentOrder) => {
    try {
      await confirmManualPayment(order.code, {})
      queryClient.invalidateQueries({
        queryKey: queryKeys.payments.root(orgId, companyId),
      })
      toast.success(`Pago ${order.code} confirmado`)
    } catch (err: any) {
      toast.error(err.message || "Error al confirmar pago")
    }
  }

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Link copiado")
    } catch {
      toast.error("No se pudo copiar")
    }
  }

  const payments = data?.data ?? []
  const totalPages = data ? Math.ceil(data.total / (data.pageSize || pageSize)) : 1

  return (
    <div className="w-full min-w-0 space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 flex-shrink-0" />
          <h1 className="text-xl font-bold md:text-2xl">Pagos Digitales</h1>
          {socketConnected && (
            <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" title="Conexión en tiempo real activa" />
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: queryKeys.payments.root(orgId, companyId),
              })
            }
            disabled={isFetching}
            className="cursor-pointer"
          >
            <RefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={() => setLinkDialogOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Crear Link de Pago
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {commissions && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Bruto</p>
              <p className="text-lg font-bold">
                S/ {commissions.totalGross.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Neto</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                S/ {commissions.totalNet.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Comisiones</p>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                S/ {commissions.totalCommission.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Proveedores</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {commissions.byProvider.map((p) => (
                  <span
                    key={p.provider}
                    className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-xs capitalize"
                  >
                    {p.provider} ({p.count})
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters (collapsible on mobile, always visible on desktop) */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" size="sm" className="cursor-pointer md:hidden w-full justify-between">
            <span className="flex items-center gap-1.5">
              <Filter className="h-4 w-4" /> Filtros
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <div className={`flex flex-col gap-2 md:flex md:flex-row md:items-center mt-2 md:mt-0 ${filtersOpen ? "" : "hidden md:flex"}`}>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as PaymentStatus | "ALL")
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full md:w-40 cursor-pointer">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="cursor-pointer">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={providerFilter}
            onValueChange={(v) => {
              setProviderFilter(v as PaymentProvider | "ALL")
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full md:w-40 cursor-pointer">
              <SelectValue placeholder="Proveedor" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="cursor-pointer">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Collapsible>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No hay órdenes de pago</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => setLinkDialogOpen(true)}
                className="mt-2 cursor-pointer"
              >
                Crear tu primer link de pago
              </Button>
            </div>
          ) : (
            <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Código</TableHead>
                  <TableHead className="min-w-[100px]">Estado</TableHead>
                  <TableHead className="min-w-[100px]">Proveedor</TableHead>
                  <TableHead className="text-right min-w-[80px]">Monto</TableHead>
                  <TableHead className="hidden md:table-cell min-w-[120px]">Cliente</TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[130px]">Fecha</TableHead>
                  <TableHead className="min-w-[80px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs font-medium">
                      {order.code}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="capitalize text-sm">
                      {order.provider}
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {order.currency} {Number(order.amount).toFixed(2)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground truncate max-w-[150px]">
                      {order.clientName || "-"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(order.createdAt), "dd MMM yyyy HH:mm", {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                          {order.paymentUrl && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 cursor-pointer"
                                  onClick={() => handleCopyLink(order.paymentUrl!)}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar link</TooltipContent>
                            </Tooltip>
                          )}
                          {order.provider === "manual" &&
                            order.status === "PENDING" && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 cursor-pointer text-green-600"
                                    onClick={() => handleConfirmManual(order)}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Confirmar pago manual</TooltipContent>
                              </Tooltip>
                            )}
                          {order.paymentUrl && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <a
                                  href={order.paymentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent cursor-pointer"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>Abrir link</TooltipContent>
                            </Tooltip>
                          )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.total > 0 && (
        <ManualPagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={data.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      )}

      {/* Payment Link Dialog */}
      <PaymentLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        onCreated={() => {
          queryClient.invalidateQueries({
            queryKey: queryKeys.payments.root(orgId, companyId),
          })
        }}
      />
    </div>
  )
}
