"use client"

import { useQuery } from "@tanstack/react-query"
import {
  DollarSign,
  TrendingUp,
  Receipt,
  AlertCircle,
  CreditCard,
  ShoppingCart,
  Package,
  Warehouse,
  Building2,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  MessageSquare,
  Wifi,
  WifiOff,
  Crown,
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
  fetchFinancialHealth,
  fetchSalesInventoryOverview,
  fetchWhatsappOverview,
  fetchPlansOverview,
  type FinancialHealth,
  type SalesInventoryOverview,
  type WhatsappOverview,
  type PlansOverview,
} from "./admin-dashboard.api"

function formatCurrency(val: number, currency = "PEN") {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency, minimumFractionDigits: 2 }).format(val)
}

function formatDateShort(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  PAID: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
  PENDING: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
  FAILED: "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400",
  VOID: "text-slate-600 bg-slate-50 dark:bg-slate-950/30 dark:text-slate-400",
}

export function AdminFinancialTab({ enabled }: { enabled: boolean }) {
  const { data: fin, isLoading: loadingFin } = useQuery({
    queryKey: queryKeys.adminDashboard.financial(),
    queryFn: fetchFinancialHealth,
    enabled,
    refetchInterval: 60_000,
  })

  const { data: salesInv, isLoading: loadingSI } = useQuery({
    queryKey: queryKeys.adminDashboard.salesInventory(),
    queryFn: fetchSalesInventoryOverview,
    enabled,
    refetchInterval: 60_000,
  })

  const { data: wa, isLoading: loadingWA } = useQuery({
    queryKey: queryKeys.adminDashboard.whatsapp(),
    queryFn: fetchWhatsappOverview,
    enabled,
    refetchInterval: 60_000,
  })

  const { data: plans, isLoading: loadingPlans } = useQuery({
    queryKey: queryKeys.adminDashboard.plans(),
    queryFn: fetchPlansOverview,
    enabled,
    refetchInterval: 60_000,
  })

  if (loadingFin) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const salesGrowth = fin && fin.salesLastMonth.total > 0
    ? ((fin.salesThisMonth.total - fin.salesLastMonth.total) / fin.salesLastMonth.total) * 100
    : undefined

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Financial top stats */}
      {fin && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FinStat icon={DollarSign} label="MRR" value={formatCurrency(fin.mrr)} accent />
          <FinStat icon={ShoppingCart} label="Ventas hoy" value={String(fin.salesToday)} />
          <FinStat
            icon={TrendingUp}
            label="Ventas mes"
            value={formatCurrency(fin.salesThisMonth.total)}
            sub={`${fin.salesThisMonth.count} ventas`}
            trend={salesGrowth}
          />
          <FinStat icon={Receipt} label="Facturas pendientes" value={String(fin.platformInvoices.pending.count)} color="text-amber-500" />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 w-full min-w-0">
        {/* Platform invoices summary */}
        {fin && (
          <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                Facturas de Plataforma
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InvoiceStat label="Pagadas" count={fin.platformInvoices.paid.count} total={formatCurrency(fin.platformInvoices.paid.total)} color="text-emerald-600" />
              <InvoiceStat label="Pendientes" count={fin.platformInvoices.pending.count} total={formatCurrency(fin.platformInvoices.pending.total)} color="text-amber-600" />
              <InvoiceStat label="Fallidas" count={fin.platformInvoices.failed.count} total={formatCurrency(fin.platformInvoices.failed.total)} color="text-red-600" />
            </CardContent>
          </Card>
        )}

        {/* Delinquent orgs */}
        {fin && fin.delinquentOrgs.length > 0 && (
          <Card className="border shadow-sm border-red-200/60 dark:border-red-800/40 w-full min-w-0 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                Organizaciones en Mora ({fin.delinquentOrgs.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {fin.delinquentOrgs.map((org) => (
                <div key={org.id} className="flex items-center justify-between gap-2 rounded-lg border p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{org.organization.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Plan: {org.plan.name} — Mora desde: {formatDateShort(org.pastDueSince)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-red-600 flex-shrink-0">{formatCurrency(Number(org.plan.price))}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sales & Inventory */}
      {salesInv && (
        <div className="grid gap-4 md:grid-cols-2 w-full min-w-0">
          <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                Inventario Global
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <MetricBox label="Productos" value={salesInv.totalProducts.toLocaleString("es-PE")} />
                <MetricBox label="Items inventario" value={salesInv.totalInventoryItems.toLocaleString("es-PE")} />
                <MetricBox label="Stock bajo" value={String(salesInv.lowStockCount)} alert={salesInv.lowStockCount > 0} />
                <MetricBox label="Entradas hoy" value={String(salesInv.entriesToday)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Top Organizaciones (Ventas)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {salesInv.topOrgsBySales.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sin datos</p>
              ) : (
                salesInv.topOrgsBySales.map((org, idx) => (
                  <div key={org.organizationId} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right flex-shrink-0">#{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{org.organizationName}</p>
                      <p className="text-[10px] text-muted-foreground">{org.salesCount} ventas</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums flex-shrink-0">{formatCurrency(org.salesTotal)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* WhatsApp & Plans */}
      <div className="grid gap-4 md:grid-cols-2 w-full min-w-0">
        {/* WhatsApp */}
        {wa && (
          <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <MetricBox label="Sesiones" value={String(wa.totalSessions)} />
                <MetricBox label="Conectadas" value={String(wa.connectedSessions)} color="text-emerald-600" />
                <MetricBox label="Mensajes" value={wa.totalMessages.toLocaleString("es-PE")} />
              </div>
              {wa.sessionDetails.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t">
                  {wa.sessionDetails.slice(0, 5).map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      {s.status === "CONNECTED" ? (
                        <Wifi className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <WifiOff className="h-3 w-3 text-red-400 flex-shrink-0" />
                      )}
                      <span className="truncate flex-1 min-w-0">{s.organization.name}</span>
                      <Badge variant="outline" className="text-[9px] h-4 flex-shrink-0">{s.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Plans */}
        {plans && (
          <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-500" />
                Planes de Suscripción
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {plans.plans.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">{formatCurrency(p.price, p.currency)}/{p.interval === "YEARLY" ? "año" : "mes"}</span>
                      {p.statusBreakdown.map((s) => (
                        <Badge key={s.status} variant="outline" className="text-[9px] h-4">
                          {s.status}: {s.count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold tabular-nums">{p.totalSubscriptions}</p>
                    <p className="text-[10px] text-muted-foreground">subs</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent subscription invoices */}
      {fin && fin.recentSubscriptionInvoices.length > 0 && (
        <Card className="border shadow-sm w-full min-w-0 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              Facturas de Suscripción Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organización</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead className="hidden sm:table-cell">Vencimiento</TableHead>
                  <TableHead className="hidden md:table-cell">Pagado</TableHead>
                  <TableHead className="hidden lg:table-cell">Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fin.recentSubscriptionInvoices.map((inv, idx) => (
                  <TableRow
                    key={inv.id}
                    className="animate-in fade-in slide-in-from-bottom-1 duration-300"
                    style={{ animationDelay: `${idx * 25}ms` }}
                  >
                    <TableCell className="text-xs truncate max-w-[140px]">{inv.organization.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[10px]", INVOICE_STATUS_COLORS[inv.status])}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-medium tabular-nums">{formatCurrency(Number(inv.amount), inv.currency)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(inv.dueDate)}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(inv.paidAt)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(inv.createdAt)}</TableCell>
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

function FinStat({
  icon: Icon,
  label,
  value,
  sub,
  color,
  accent,
  trend,
}: {
  icon: typeof DollarSign
  label: string
  value: string
  sub?: string
  color?: string
  accent?: boolean
  trend?: number
}) {
  return (
    <Card className={cn("border shadow-sm transition-all duration-300 hover:shadow-md", accent && "border-primary/30 bg-primary/5")}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-lg sm:text-xl font-bold tabular-nums truncate">{value}</p>
          </div>
          <div className={cn("flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted/60", color)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {(sub || trend !== undefined) && (
          <div className="mt-1 flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
            {trend !== undefined && (
              <span className={cn("flex items-center gap-0.5 font-medium",
                trend > 0 ? "text-emerald-600 dark:text-emerald-400" : trend < 0 ? "text-red-500" : ""
              )}>
                {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : trend < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                {trend > 0 ? "+" : ""}{Math.round(trend)}%
              </span>
            )}
            {sub && <span>{sub}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InvoiceStat({ label, count, total, color }: { label: string; count: number; total: string; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/30 p-2.5">
      <div className="flex items-center gap-2">
        <span className={cn("text-sm font-medium", color)}>{label}</span>
        <Badge variant="secondary" className="text-[10px] h-4">{count}</Badge>
      </div>
      <span className="text-sm font-semibold tabular-nums">{total}</span>
    </div>
  )
}

function MetricBox({ label, value, color, alert }: { label: string; value: string; color?: string; alert?: boolean }) {
  return (
    <div className={cn("rounded-lg bg-muted/40 p-2.5 text-center", alert && "bg-red-50 dark:bg-red-950/20")}>
      <p className={cn("text-lg font-bold tabular-nums", color, alert && "text-red-600")}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  )
}
