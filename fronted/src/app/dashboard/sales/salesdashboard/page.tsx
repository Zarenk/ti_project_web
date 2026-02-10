"use client"

import { useEffect, useRef, useState } from "react"
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
import { endOfDay } from "date-fns"
import { useTenantSelection } from "@/context/tenant-selection-context"
import TransactionHistoryTable from "../components/TransactionHistoryTable"
import { ProfitProductsTable } from "./profit-products-table"
import { DailyProfitChart } from "./daily-profit-chart"
import { MODULE_PERMISSION_LABELS, useEnforcedModulePermission } from "@/hooks/use-enforced-module-permission"

export default function SalesDashboard() {
    const router = useRouter()
    const { allowed: historyAllowed, loading: permissionLoading } = useEnforcedModulePermission("salesHistory")
    const permissionToastShown = useRef(false)
    const { selection, version, loading: tenantLoading } = useTenantSelection();
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
    const [taxDetailOpen, setTaxDetailOpen] = useState(false);
    const [activeTaxDetail, setActiveTaxDetail] = useState<"igv" | "ir" | null>(null);
    const [cardPageStart, setCardPageStart] = useState(0);
    const [visibleCardCount, setVisibleCardCount] = useState(5);

    useEffect(() => {
      if (permissionLoading) return
      if (!historyAllowed) {
        if (!permissionToastShown.current) {
          permissionToastShown.current = true
          toast.error(`No tienes permisos para acceder a ${MODULE_PERMISSION_LABELS.salesHistory}.`)
        }
        router.replace("/unauthorized")
      } else {
        permissionToastShown.current = false
      }
    }, [historyAllowed, permissionLoading, router])

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
            console.error("Error al obtener número de ventas:", error);
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
        // Calcular tasa de conversión dinámicamente
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

  return (
    <div className="flex flex-col gap-5 p-6">
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

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full border border-white/10 bg-background/60 text-muted-foreground hover:text-foreground"
          onClick={() => setCardPageStart((prev) => Math.max(0, prev - visibleCardCount))}
          disabled={cardPageStart === 0}
        >
          <span className="text-lg">&lt;</span>
        </Button>
        <div className="flex-1 overflow-hidden">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${visibleCardCount}, minmax(0, 1fr))` }}>
            {cardsToRender}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full border border-white/10 bg-background/60 text-muted-foreground hover:text-foreground"
          onClick={() =>
            setCardPageStart((prev) => Math.min(prev + visibleCardCount, Math.max(0, totalCards - visibleCardCount)))
          }
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
                <CardDescription>Rendimiento de ventas diarias durante el período seleccionado</CardDescription>
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
                <CardTitle>Ingresos por categoría</CardTitle>
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
