"use client"

import { useEffect, useRef, useState } from "react"
import { Calendar, DollarSign, ShoppingCart, TrendingUp, Users, BarChart3 } from "lucide-react"
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
import { getMonthlyClientsStats, getMonthlySalesCount, getMonthlySalesTotal, getMonthlySalesProfit, getSalesTransactions, getSalesTotalByDateRange, getSalesCountByDateRange, getClientStatsByDateRange, getSalesProfitByDateRange } from "../sales.api"
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
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
                ? `${monthlyGrowth > 0 ? "+" : ""}${monthlyGrowth.toFixed(1)}% desde el último mes`
                : "Sin datos del mes anterior"}
            </p>
          </CardContent>
        </Card>
        <Card>
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
                ? `${countGrowth > 0 ? "+" : ""}${countGrowth.toFixed(1)}% desde el último mes`
                : "Sin datos del mes anterior"}
            </p>
          </CardContent>
        </Card>
        <Card>
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
                    ? `${clientGrowth > 0 ? "+" : ""}${clientGrowth.toFixed(1)}% desde el último mes`
                    : "Sin datos del mes anterior"}
                </p>
            </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidades</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
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
                ? `${profitGrowth > 0 ? "+" : ""}${profitGrowth.toFixed(1)}% desde el último mes`
                : "Sin datos del mes anterior"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Porcentaje de Conversión</CardTitle>
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
      </div>

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
