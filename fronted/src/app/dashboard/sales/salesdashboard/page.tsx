"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Calendar, DollarSign, ShoppingCart, TrendingUp, Users, BarChart3, Receipt } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

import { TopProductsChart } from "./top-products-chart"
import { DatePickerWithRange } from "./date-range-picker"
import { RevenueByCategory } from "./revenue-by-category"
import { SalesTable } from "./sales-table"
import { SalesChart } from "./sales-chart"
import { DateRange } from "react-day-picker"
import { getMonthlyClientsStats, getMonthlySalesCount, getMonthlySalesTotal, getMonthlySalesProfit, getSalesTransactions, getSalesTotalByDateRange, getSalesCountByDateRange, getClientStatsByDateRange, getSalesProfitByDateRange, getSalesTaxByRange } from "../sales.api"
import { TopProductsTable } from "./top-products-table"
import { TopClientsTable } from "./top-clients-table"
import { endOfDay, differenceInCalendarDays, subDays } from "date-fns"
import { useTenantSelection } from "@/context/tenant-selection-context"
import TransactionHistoryTable from "../components/TransactionHistoryTable"
import { ProfitProductsTable } from "./profit-products-table"
import { DailyProfitChart } from "./daily-profit-chart"
import { MODULE_PERMISSION_LABELS, useEnforcedModulePermission } from "@/hooks/use-enforced-module-permission"
import { useAuth } from "@/context/auth-context"
import { Skeleton } from "@/components/ui/skeleton"

export default function SalesDashboard() {
    const router = useRouter()
    const { allowed: historyAllowed, loading: permissionLoading } = useEnforcedModulePermission("salesHistory")
    const permissionToastShown = useRef(false)
    const { selection, version, loading: tenantLoading } = useTenantSelection();
    const { authPending, sessionExpiring } = useAuth()
    const selectionKey = `${selection.orgId ?? "none"}-${selection.companyId ?? "none"}-${version}`;

    const [dateRange, setDateRange] = useState<DateRange>({
        from: new Date(new Date().setDate(new Date().getDate() - 30)),
        to: new Date(),
      });

    const [monthlyTotal, setMonthlyTotal] = useState<number>(0);
    const [monthlyCount, setMonthlyCount] = useState<number>(0);
    const [monthlyGrowth, setMonthlyGrowth] = useState<number | null>(null);
    const [countGrowth, setCountGrowth] = useState<number | null>(null);
    const [monthlyClients, setMonthlyClients] = useState(0);
    const [clientGrowth, setClientGrowth] = useState<number | null>(null);
    const [monthlyProfit, setMonthlyProfit] = useState<number>(0);
    const [profitGrowth, setProfitGrowth] = useState<number | null>(null);
    const [conversionRate, setConversionRate] = useState<number>(0);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [taxTotals, setTaxTotals] = useState({
        total: 0,
        taxableTotal: 0,
        exemptTotal: 0,
        unaffectedTotal: 0,
        igvTotal: 0,
      });
    const [prevTaxTotals, setPrevTaxTotals] = useState<typeof taxTotals | null>(null);
    const [taxDetailOpen, setTaxDetailOpen] = useState(false);
    const [activeTaxDetail, setActiveTaxDetail] = useState<"igv" | "ir" | null>(null);
    const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);
    const [cardPageStart, setCardPageStart] = useState(0);
    const [visibleCardCount, setVisibleCardCount] = useState(5);
    const [cardDirection, setCardDirection] = useState<"next" | "prev" | null>(null);
    const [cardAnimating, setCardAnimating] = useState(false);
    const [hoveredTaxCard, setHoveredTaxCard] = useState<"igv" | "ir" | null>(null);

    useEffect(() => {
      if (permissionLoading || authPending || sessionExpiring) return
      if (!historyAllowed) {
        if (!permissionToastShown.current) {
          permissionToastShown.current = true
          toast.error(`No tienes permisos para acceder a ${MODULE_PERMISSION_LABELS.salesHistory}.`)
        }
        router.replace("/unauthorized")
      } else {
        permissionToastShown.current = false
      }
    }, [historyAllowed, permissionLoading, router, authPending, sessionExpiring])

    useEffect(() => {
      if (tenantLoading || permissionLoading || !historyAllowed) return
      const fetchSalesData = async () => {
        try {
          // Si hay dateRange con filtro, usa el rango; si no, usa mensual
          const isDefaultRange = dateRange?.from && dateRange?.to && 
            dateRange.from.getTime() === new Date(new Date().setDate(new Date().getDate() - 30)).getTime() &&
            dateRange.to.toDateString() === new Date().toDateString();
          
          if (isDefaultRange || !dateRange?.from || !dateRange?.to) {
            // Usa datos mensuales
            const { total, growth } = await getMonthlySalesTotal();
            setMonthlyTotal(total);
            setMonthlyGrowth(growth);
          } else {
            // Usa datos por rango
            const from = dateRange.from.toISOString();
            const to = endOfDay(dateRange.to).toISOString();
            const total = await getSalesTotalByDateRange(from, to);
            setMonthlyTotal(total);
            setMonthlyGrowth(null); // No hay crecimiento en rango personalizado
          }
        } catch (error) {
          console.error("Error al obtener ventas:", error);
        }
      };
    
      fetchSalesData();
    }, [selectionKey, tenantLoading, dateRange, permissionLoading, historyAllowed]);

    useEffect(() => {
        if (tenantLoading || permissionLoading || !historyAllowed) return
        const fetchSalesCount = async () => {
          try {
            const isDefaultRange = dateRange?.from && dateRange?.to && 
              dateRange.from.getTime() === new Date(new Date().setDate(new Date().getDate() - 30)).getTime() &&
              dateRange.to.toDateString() === new Date().toDateString();
            
            if (isDefaultRange || !dateRange?.from || !dateRange?.to) {
              const { count, growth } = await getMonthlySalesCount();
              setMonthlyCount(count);
              setCountGrowth(growth);
            } else {
              const from = dateRange.from.toISOString();
              const to = endOfDay(dateRange.to).toISOString();
              const count = await getSalesCountByDateRange(from, to);
              setMonthlyCount(count);
              setCountGrowth(null);
            }
          } catch (error) {
            console.error("Error al obtener nÃºmero de ventas:", error);
          }
        };
        fetchSalesCount();
      }, [selectionKey, tenantLoading, dateRange, permissionLoading, historyAllowed]);

      useEffect(() => {
        if (tenantLoading || permissionLoading || !historyAllowed) return
        const fetchClientsData = async () => {
          try {
            const isDefaultRange = dateRange?.from && dateRange?.to && 
              dateRange.from.getTime() === new Date(new Date().setDate(new Date().getDate() - 30)).getTime() &&
              dateRange.to.toDateString() === new Date().toDateString();
            
            if (isDefaultRange || !dateRange?.from || !dateRange?.to) {
              const data = await getMonthlyClientsStats();
              setMonthlyClients(data.total);
              setClientGrowth(data.growth);
            } else {
              const from = dateRange.from.toISOString();
              const to = endOfDay(dateRange.to).toISOString();
              const total = await getClientStatsByDateRange(from, to);
              setMonthlyClients(total);
              setClientGrowth(null);
            }
          } catch (error) {
            console.error("Error al obtener clientes:", error);
          }
        };
        fetchClientsData();
      }, [selectionKey, tenantLoading, dateRange, permissionLoading, historyAllowed]);

      useEffect(() => {
        if (tenantLoading || permissionLoading || !historyAllowed) return
        const fetchProfitData = async () => {
          try {
            const isDefaultRange = dateRange?.from && dateRange?.to && 
              dateRange.from.getTime() === new Date(new Date().setDate(new Date().getDate() - 30)).getTime() &&
              dateRange.to.toDateString() === new Date().toDateString();
            
            if (isDefaultRange || !dateRange?.from || !dateRange?.to) {
              const { total, growth } = await getMonthlySalesProfit();
              setMonthlyProfit(total);
              setProfitGrowth(growth);
            } else {
              const from = dateRange.from.toISOString();
              const to = endOfDay(dateRange.to).toISOString();
              const total = await getSalesProfitByDateRange(from, to);
              setMonthlyProfit(total);
              setProfitGrowth(null);
            }
          } catch (error) {
            console.error("Error al obtener utilidades:", error);
          }
        };
        fetchProfitData();
      }, [selectionKey, tenantLoading, dateRange, permissionLoading, historyAllowed]);

      useEffect(() => {
        // Calcular tasa de conversiÃ³n dinÃ¡micamente
        if (monthlyTotal > 0) {
          setConversionRate((monthlyCount / monthlyTotal) * 100);
        } else {
          setConversionRate(0);
        }
      }, [monthlyCount, monthlyTotal]);

      useEffect(() => {
        if (tenantLoading || permissionLoading || !historyAllowed) return
        if (dateRange?.from && dateRange?.to) {
          const from = dateRange.from.toISOString();
          const to = endOfDay(dateRange.to).toISOString();
          getSalesTransactions(from, to)
            .then(setTransactions)
            .catch(console.error);
        }
      }, [dateRange, selectionKey, tenantLoading, permissionLoading, historyAllowed]);

      useEffect(() => {
        if (tenantLoading || permissionLoading || !historyAllowed) return
        if (!dateRange?.from || !dateRange?.to) return
        const from = dateRange.from.toISOString()
        const to = endOfDay(dateRange.to).toISOString()
        getSalesTaxByRange(from, to)
          .then((data) => setTaxTotals({
            total: Number(data?.total ?? 0),
            taxableTotal: Number(data?.taxableTotal ?? 0),
            exemptTotal: Number(data?.exemptTotal ?? 0),
            unaffectedTotal: Number(data?.unaffectedTotal ?? 0),
            igvTotal: Number(data?.igvTotal ?? 0),
          }))
          .catch(console.error)

        const days = Math.max(1, differenceInCalendarDays(endOfDay(dateRange.to), dateRange.from) + 1)
        const prevFrom = subDays(dateRange.from, days)
        const prevTo = subDays(endOfDay(dateRange.to), days)
        getSalesTaxByRange(prevFrom.toISOString(), prevTo.toISOString())
          .then((data) => setPrevTaxTotals({
            total: Number(data?.total ?? 0),
            taxableTotal: Number(data?.taxableTotal ?? 0),
            exemptTotal: Number(data?.exemptTotal ?? 0),
            unaffectedTotal: Number(data?.unaffectedTotal ?? 0),
            igvTotal: Number(data?.igvTotal ?? 0),
          }))
          .catch(() => setPrevTaxTotals(null))
      }, [dateRange, selectionKey, tenantLoading, permissionLoading, historyAllowed]);


      useEffect(() => {
        const totalCards = 7;
        const update = () => {
          const width = window.innerWidth;
          const nextCount = width >= 1280 ? 5 : width >= 1024 ? 4 : width >= 768 ? 2 : 1;
          setVisibleCardCount((prev) => {
            if (prev !== nextCount) {
              setCardPageStart((start) => Math.min(start, Math.max(0, totalCards - nextCount)));
            }
            return nextCount;
          });

        };

        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
      }, []);


      useEffect(() => {
        const id = requestAnimationFrame(() => setCardAnimating(true));
        return () => cancelAnimationFrame(id);
      }, [cardPageStart, cardDirection]);

    const cards = [
      (
        <Card key="total" className="cursor-pointer transition-all duration-200 hover:border-white/30 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                S/ {monthlyTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p
                className={`text-xs ${
                monthlyGrowth === null
                    ? "text-muted-foreground"
                    : monthlyGrowth > 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
            >
                {monthlyGrowth !== null
                ? `${monthlyGrowth > 0 ? "+" : ""}${monthlyGrowth.toFixed(1)}% desde el ultimo mes`
                : "Sin datos del mes anterior"}
            </p>
          </CardContent>
        </Card>
      ),
      (
        <Card key="count" className="cursor-pointer transition-all duration-200 hover:border-white/30 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyCount}</div>
            <p
                className={`text-xs ${
                countGrowth === null
                    ? "text-muted-foreground"
                    : countGrowth > 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
            >
                {countGrowth !== null
                ? `${countGrowth > 0 ? "+" : ""}${countGrowth.toFixed(1)}% desde el ultimo mes`
                : "Sin datos del mes anterior"}
            </p>
          </CardContent>
        </Card>
      ),
      (
        <Card key="clients" className="cursor-pointer transition-all duration-200 hover:border-white/30 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyClients}</div>
            <p className={`text-xs ${
                clientGrowth === null
                    ? "text-muted-foreground"
                    : clientGrowth > 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}>
                {clientGrowth !== null
                    ? `${clientGrowth > 0 ? "+" : ""}${clientGrowth.toFixed(1)}% desde el ultimo mes`
                    : "Sin datos del mes anterior"}
            </p>
          </CardContent>
        </Card>
      ),
      (
        <Card key="profit" className="cursor-pointer transition-all duration-200 hover:border-white/30 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidades</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground transition-colors duration-300 group-hover:text-emerald-200" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                S/ {monthlyProfit.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
            </div>
            <p className={`text-xs ${
                profitGrowth === null
                    ? "text-muted-foreground"
                    : profitGrowth > 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}>
                {profitGrowth !== null
                ? `${profitGrowth > 0 ? "+" : ""}${profitGrowth.toFixed(1)}% desde el ultimo mes`
                : "Sin datos del mes anterior"}
            </p>
          </CardContent>
        </Card>
      ),
      (
        <Card key="conversion" className="cursor-pointer transition-all duration-200 hover:border-white/30 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Porcentaje de Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              {monthlyTotal > 0 
                ? `${monthlyCount} ventas de ${(monthlyTotal / 1).toLocaleString("es-PE", { maximumFractionDigits: 0 })} soles`
                : "Sin datos disponibles"}
            </p>
          </CardContent>
        </Card>
      ),
      (
        <Card
          key="igv"
          className={`group cursor-pointer transition-all duration-300 hover:border-emerald-400/60 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.35)] hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.35)] ${
            hoveredTaxCard === "igv" ? "bg-emerald-500/10" : ""
          }`}
          onMouseEnter={() => setHoveredTaxCard("igv")}
          onMouseLeave={() => setHoveredTaxCard(null)}
          onClick={() => {
            setActiveTaxDetail("igv")
            setTaxDetailOpen(true)
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{hoveredTaxCard === "igv" ? "Detalle de IGV" : "IGV estimado"}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span
                className={`inline-block transition-all duration-300 ${
                  hoveredTaxCard === "igv" ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-90"
                }`}
              >
                {hoveredTaxCard === "igv" 
                  ? `S/ ${taxTotals.taxableTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
                  : `S/ ${taxTotals.igvTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              <span
                className={`inline-block transition-all duration-300 ${
                  hoveredTaxCard === "igv" ? "translate-y-0 opacity-100" : "translate-y-1 opacity-90"
                }`}
              >
                {hoveredTaxCard === "igv"
                  ? `IGV estimado (18%): S/ ${taxTotals.igvTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
                  : `Base gravada: S/ ${taxTotals.taxableTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`}
              </span>
            </p>
          </CardContent>
        </Card>
      ),
      (
        <Card
          key="ir"
          className={`group cursor-pointer transition-all duration-300 hover:border-sky-400/60 hover:shadow-[0_0_0_1px_rgba(56,189,248,0.35)] hover:drop-shadow-[0_0_12px_rgba(56,189,248,0.35)] ${
            hoveredTaxCard === "ir" ? "bg-sky-500/10" : ""
          }`}
          onMouseEnter={() => setHoveredTaxCard("ir")}
          onMouseLeave={() => setHoveredTaxCard(null)}
          onClick={() => {
            setActiveTaxDetail("ir")
            setTaxDetailOpen(true)
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{hoveredTaxCard === "ir" ? "Detalle de IR (2%)" : "IR estimado (2%)"}</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground transition-colors duration-300 group-hover:text-sky-200" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <span
                className={`inline-block transition-all duration-300 ${
                  hoveredTaxCard === "ir" ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-90"
                }`}
              >
                {hoveredTaxCard === "ir"
                  ? `S/ ${taxTotals.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
                  : `S/ ${(taxTotals.total * 0.02).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              <span
                className={`inline-block transition-all duration-300 ${
                  hoveredTaxCard === "ir" ? "translate-y-0 opacity-100" : "translate-y-1 opacity-90"
                }`}
              >
                {hoveredTaxCard === "ir"
                  ? `IR estimado (2%): S/ ${(taxTotals.total * 0.02).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
                  : `Total ventas: S/ ${taxTotals.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`}
              </span>
            </p>
          </CardContent>
        </Card>
      ),
    ];

    const totalCards = cards.length;
    const cardsToRender = cards.slice(cardPageStart, cardPageStart + visibleCardCount);

    const dailyTaxRows = useMemo(() => {
      if (!Array.isArray(transactions) || !transactions.length) return []
      const bucket = new Map()
      for (const tx of transactions) {
        if (!tx?.date || typeof tx.total !== "number") continue
        const dayKey = new Date(tx.date).toLocaleDateString("es-PE")
        const current = bucket.get(dayKey) || { date: dayKey, total: 0 }
        current.total += tx.total
        bucket.set(dayKey, current)
      }
      const rows = Array.from(bucket.values()).map((row) => ({
        date: row.date,
        total: row.total,
        igv: row.total * 0.18,
        ir: row.total * 0.02,
      }))
      rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      return rows
    }, [transactions])

    const buildDelta = (current: number, previous: number | null) => {
      if (previous === null) return null
      if (previous === 0) return null
      return ((current - previous) / previous) * 100
    }

    const igvDelta = buildDelta(taxTotals.igvTotal, prevTaxTotals?.igvTotal ?? null)
    const irDelta = buildDelta(taxTotals.total * 0.02, prevTaxTotals?.total != null ? prevTaxTotals.total * 0.02 : null)
    const taxableDelta = buildDelta(taxTotals.taxableTotal, prevTaxTotals?.taxableTotal ?? null)

  if (permissionLoading || tenantLoading || authPending || sessionExpiring) {
    return (
      <div className="flex w-full max-w-full flex-col gap-5 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-48 rounded-md" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-7 w-28" />
                <Skeleton className="h-3 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-96 rounded-md" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Skeleton className="h-64 rounded-xl lg:col-span-4" />
            <Skeleton className="h-64 rounded-xl lg:col-span-3" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sales-dashboard-theme flex w-full max-w-full flex-col gap-5 p-6 overflow-x-hidden">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground">Monitorea el rendimiento de tus ventas y tendencias</p>
        </div>
        <div className="flex flex-col gap-2 w-full sm:flex-row sm:items-center sm:justify-end">
        <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Calendar className="mr-2 h-4 w-4" />
              Exportar
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full min-w-0 max-w-full overflow-x-hidden">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 cursor-pointer rounded-full border border-white/10 bg-background/60 text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => {
            setCardDirection("prev")
            setCardAnimating(false)
            setCardPageStart((prev) => Math.max(0, prev - visibleCardCount))
          }}
          disabled={cardPageStart === 0}
        >
          <span className="text-lg">&lt;</span>
        </Button>
        <div className="flex-1 overflow-hidden min-w-0 max-w-full">
          <div className="grid gap-4 transition-all duration-300 ease-out" style={{ gridTemplateColumns: `repeat(${visibleCardCount}, minmax(0, 1fr))`, transform: cardAnimating ? "translateX(0)" : cardDirection === "next" ? "translateX(12px)" : "translateX(-12px)", opacity: cardAnimating ? 1 : 0.7 }}>
            {cardsToRender}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 cursor-pointer rounded-full border border-white/10 bg-background/60 text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => {
            setCardDirection("next")
            setCardAnimating(false)
            setCardPageStart((prev) => Math.min(prev + visibleCardCount, Math.max(0, totalCards - visibleCardCount)))
          }}
          disabled={cardPageStart >= Math.max(0, totalCards - visibleCardCount)}
        >
          <span className="text-lg">&gt;</span>
        </Button>
      </div>


      {taxDetailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-background/95 p-6 shadow-2xl backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">
                  {activeTaxDetail === "igv" ? "Detalle de IGV" : "Detalle de IR estimado"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {activeTaxDetail === "igv"
                    ? "Calculado sobre la base gravada del periodo seleccionado."
                    : "Estimado sobre el total de ventas del periodo seleccionado."}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setTaxDetailOpen(false)}>
                Cerrar
              </Button>
            </div>

            <div className="mt-5 grid gap-3 text-sm">
              {activeTaxDetail === "igv" ? (
                <>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-muted/30 px-4 py-3">
                    <span className="text-muted-foreground">Base gravada</span>
                    <span className="font-semibold">
                      S/ {taxTotals.taxableTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
                    <span className="text-emerald-200">IGV estimado (18%)</span>
                    <span className="font-semibold text-emerald-100">
                      S/ {taxTotals.igvTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-muted/30 px-4 py-3">
                    <span className="text-muted-foreground">Total ventas</span>
                    <span className="font-semibold">
                      S/ {taxTotals.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-3">
                    <span className="text-sky-200">IR estimado (2%)</span>
                    <span className="font-semibold text-sky-100">
                      S/ {(taxTotals.total * 0.02).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="overflow-x-auto whitespace-nowrap scrollbar-hide flex w-full gap-1 px-1">
        <TabsTrigger value="overview" className="flex-shrink-0 text-sm sm:text-base">Desc. Gral.</TabsTrigger>
        <TabsTrigger value="products" className="flex-shrink-0 text-sm sm:text-base">Productos</TabsTrigger>
        <TabsTrigger value="customers" className="flex-shrink-0 text-sm sm:text-base">Clientes</TabsTrigger>
        <TabsTrigger value="transactions" className="flex-shrink-0 text-sm sm:text-base">Transacc.</TabsTrigger>
        <TabsTrigger value="profits" className="flex-shrink-0 text-sm sm:text-base">Utilidades</TabsTrigger>
      </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Resumen de Ventas</CardTitle>
                <CardDescription>Rendimiento de ventas diarias durante el perÃ­odo seleccionado</CardDescription>
              </CardHeader>
              <CardContent className="px-2">
                <SalesChart dateRange={dateRange} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Top de Productos Vendidos</CardTitle>
                <CardDescription>Productos con mayor volumen de ventas</CardDescription>
              </CardHeader>
              <CardContent>
                <TopProductsChart dateRange={dateRange} />
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Ingresos por categoria</CardTitle>
                <CardDescription>Distribucion de ventas entre categorias de productos</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueByCategory dateRange={dateRange} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>Ventas Recientes</CardTitle>
                <CardDescription>Ultimas transacciones en todos los canales</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <SalesTable dateRange={dateRange} />
              </CardContent>
            </Card>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-[15px] font-semibold tracking-tight text-foreground">Resumen contable</h3>
                <p className="text-[12px] leading-4 text-muted-foreground">
                  Estimaciones basadas en el rango seleccionado.
                </p>
                <p className="text-[11px] leading-4 text-muted-foreground">
                  Estimado referencial, no reemplaza calculo contable oficial.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full border border-border/60 px-2 py-0.5">IGV 18% / IR 2%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTaxBreakdown((prev) => !prev)}
                >
                  {showTaxBreakdown ? "Ocultar detalle" : "Ver detalle"}
                </Button>
                <Button variant="outline" size="sm">
                  Exportar resumen
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-medium tracking-[0.08em] uppercase text-muted-foreground">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-50/70 px-2 py-0.5 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                IGV: {igvDelta !== null ? `${igvDelta >= 0 ? "+" : ""}${igvDelta.toFixed(1)}% vs periodo anterior` : "Sin periodo anterior"}
              </span>
              <span className="rounded-full border border-sky-500/30 bg-sky-50/70 px-2 py-0.5 text-sky-900 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-100">
                IR: {irDelta !== null ? `${irDelta >= 0 ? "+" : ""}${irDelta.toFixed(1)}% vs periodo anterior` : "Sin periodo anterior"}
              </span>
              <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-0.5">
                Base gravada: {taxableDelta !== null ? `${taxableDelta >= 0 ? "+" : ""}${taxableDelta.toFixed(1)}%` : "Sin periodo anterior"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/60 px-4 py-3 text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-900/80 dark:text-emerald-200/80">Base gravada</div>
                <div className="text-lg font-semibold tabular-nums">
                  S/ {taxTotals.taxableTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/60 px-4 py-3 text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-900/80 dark:text-emerald-200/80">IGV estimado</div>
                <div className="text-lg font-semibold tabular-nums">
                  S/ {taxTotals.igvTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="rounded-xl border border-sky-500/30 bg-sky-50/60 px-4 py-3 text-sky-950 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-100">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-900/80 dark:text-sky-200/80">IR estimado (2%)</div>
                <div className="text-lg font-semibold tabular-nums">
                  S/ {(taxTotals.total * 0.02).toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Exonerado</div>
                <div className="text-lg font-semibold tabular-nums text-foreground">
                  S/ {taxTotals.exemptTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Inafecto</div>
                <div className="text-lg font-semibold tabular-nums text-foreground">
                  S/ {taxTotals.unaffectedTotal.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Total ventas</div>
                <div className="text-lg font-semibold tabular-nums text-foreground">
                  S/ {taxTotals.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/60 px-4 py-3 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.1em] text-emerald-900/80 dark:text-emerald-100/80">
                  <span>IGV vs total ventas</span>
                  <span className="tabular-nums">{taxTotals.total > 0 ? ((taxTotals.igvTotal / taxTotals.total) * 100).toFixed(1) : "0.0"}%</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-emerald-200/70 dark:bg-emerald-900/40">
                  <div
                    className="h-2 rounded-full bg-emerald-500/80 dark:bg-emerald-400/80 transition-all"
                    style={{ width: `${taxTotals.total > 0 ? (taxTotals.igvTotal / taxTotals.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-sky-500/30 bg-sky-50/60 px-4 py-3 dark:border-sky-400/20 dark:bg-sky-500/10">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.1em] text-sky-900/80 dark:text-sky-100/80">
                  <span>IR vs total ventas</span>
                  <span className="tabular-nums">{taxTotals.total > 0 ? ((taxTotals.total * 0.02 / taxTotals.total) * 100).toFixed(1) : "0.0"}%</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-sky-200/70 dark:bg-sky-900/40">
                  <div
                    className="h-2 rounded-full bg-sky-500/80 dark:bg-sky-400/80 transition-all"
                    style={{ width: `${taxTotals.total > 0 ? ((taxTotals.total * 0.02) / taxTotals.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              {showTaxBreakdown && (
                <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                  <div className="grid grid-cols-4 gap-2 bg-muted/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    <span>Fecha</span>
                    <span>Total ventas</span>
                    <span>IGV (18%)</span>
                    <span>IR (2%)</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto">
                    {dailyTaxRows.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">Sin datos para el rango.</div>
                    ) : (
                      dailyTaxRows.map((row) => (
                        <div key={row.date} className="grid grid-cols-4 gap-2 px-4 py-2 text-sm">
                          <span className="tabular-nums">{row.date}</span>
                          <span className="tabular-nums">S/ {row.total.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</span>
                          <span className="tabular-nums">S/ {row.igv.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</span>
                          <span className="tabular-nums">S/ {row.ir.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="products" className="space-y-4">
          <TopProductsTable dateRange={dateRange} />
        </TabsContent>
        <TabsContent value="customers" className="space-y-4">
          <TopClientsTable dateRange={dateRange} />
        </TabsContent>
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Transacciones</CardTitle>
              <CardDescription>Registro completo de todas las transacciones de ventas</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <TransactionHistoryTable transactions={transactions} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="profits" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="lg:col-span-4">
              <ProfitProductsTable dateRange={dateRange} />
            </div>
            <div className="lg:col-span-3">
              <DailyProfitChart dateRange={dateRange} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
