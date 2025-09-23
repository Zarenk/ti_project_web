"use client"

import { useEffect, useState } from "react"
import { Calendar, DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

import { TopProductsChart } from "./top-products-chart"
import { DatePickerWithRange } from "./date-range-picker"
import { RevenueByCategory } from "./revenue-by-category"
import { SalesTable } from "./sales-table"
import { SalesChart } from "./sales-chart"
import { DateRange } from "react-day-picker"
import { getMonthlyClientsStats, getMonthlySalesCount, getMonthlySalesTotal, getSalesTransactions } from "../sales.api"
import { TopProductsTable } from "./top-products-table"
import { TopClientsTable } from "./top-clients-table"
import { endOfDay } from "date-fns"
import TransactionHistoryTable from "../components/TransactionHistoryTable"

export default function SalesDashboard() {
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
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
      const fetchMonthlySales = async () => {
        try {
         const { total, growth } = await getMonthlySalesTotal();
         setMonthlyTotal(total);
         setMonthlyGrowth(growth);
        } catch (error) {
        console.error("Error al obtener ventas mensuales:", error);
        }
      };
    
      fetchMonthlySales();
    }, []);

    useEffect(() => {
        const fetchSalesCount = async () => {
          try {
            const { count, growth } = await getMonthlySalesCount();
            setMonthlyCount(count);
            setCountGrowth(growth);
          } catch (error) {
            console.error("Error al obtener número de ventas:", error);
          }
        };
      
        fetchSalesCount();
      }, []);

      useEffect(() => {
        getMonthlyClientsStats()
          .then(data => {
            setMonthlyClients(data.total);
            setClientGrowth(data.growth);
          })
          .catch(console.error);
      }, []);

      useEffect(() => {
        if (dateRange?.from && dateRange?.to) {
          const from = dateRange.from.toISOString();
          const to = endOfDay(dateRange.to).toISOString();
          getSalesTransactions(from, to)
            .then(setTransactions)
            .catch(console.error);
        }
      }, [dateRange]);

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Porcentaje de Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2%</div>
            <p className="text-xs text-muted-foreground">+2.1% desde el ultimo mes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="overflow-x-auto whitespace-nowrap scrollbar-hide flex w-full gap-1 px-1">
            <TabsTrigger value="overview" className="flex-shrink-0 text-sm sm:text-base">Desc. Gral.</TabsTrigger>
            <TabsTrigger value="products" className="flex-shrink-0 text-sm sm:text-base">Productos</TabsTrigger>
            <TabsTrigger value="customers" className="flex-shrink-0 text-sm sm:text-base">Clientes</TabsTrigger>
            <TabsTrigger value="transactions" className="flex-shrink-0 text-sm sm:text-base">Transacc.</TabsTrigger>
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
      </Tabs>
    </div>
  )
}
