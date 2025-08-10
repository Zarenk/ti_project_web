"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Box, DollarSign, Package, ShoppingCart, TrendingUp, Truck, Users } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from 'sonner'
import { getLowStockItems, getTotalInventory } from "./inventory/inventory.api"
import { getMonthlySalesTotal, getRecentSales } from "./sales/sales.api"
import { getUserDataFromToken, isTokenValid } from "@/lib/auth"
import { getOrdersCount, getRecentOrders } from "./orders/orders.api"
import { getAllEntries } from "./entries/entries.api"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { UnauthenticatedError } from "@/utils/auth-fetch"

type ActivityItem = {
  id: number | string
  type: 'order' | 'sale' | 'entry' | 'alert'
  description: string
  createdAt: string
  href: string
}

type Order = { id: number; code: string; createdAt: string }
type Sale = { id: number; createdAt: string }
type Entry = { id: number; createdAt: string }
type LowStockItem = {
  productId: number
  productName: string
  storeName: string
  stock: number
}

export default function WelcomeDashboard() {

//------------------------------- CONSTANTES --------------------------------//
  const [totalInventory, setTotalInventory] = useState<{ name: string; totalStock: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const [monthlySales, setMonthlySales] = useState<{ total: number; growth: number | null } | null>(null);

  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [pendingOrders, setPendingOrders] = useState(0)
  type ActivityItem = { id: number | string; type: 'order' | 'sale' | 'entry' | 'alert'; description: string; createdAt: string; href: string }
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])

  const router = useRouter()
  const authErrorShown = useRef(false)
  const handleAuthError = (err: unknown) => {
    if (authErrorShown.current) return true
    if (err instanceof UnauthenticatedError) {
      authErrorShown.current = true
      toast.error('Tu sesión ha expirado. Vuelve a iniciar sesión.')
      const path = window.location.pathname
      router.replace(`/login?returnTo=${encodeURIComponent(path)}`)
      return true
    }
    return false
  }

//------------------------------- USE EFFECT --------------------------------//

useEffect(() => {
    async function fetchData() {
        const data = await getUserDataFromToken();
        if (!data || !(await isTokenValid()) || (data.role !== 'ADMIN' && data.role !== 'EMPLOYEE')) {
          router.push('/unauthorized');
          return;
        }
        try {
          const [
            inventoryData,
            monthlySalesData,
            pendingData,
            recentOrders,
            entries,
            recentSales,
            lowStock,
          ] = (await Promise.all([
            getTotalInventory(),
            getMonthlySalesTotal(),
            getOrdersCount('PENDING'),
            getRecentOrders(10),
            getAllEntries(),
            getRecentSales(),
            getLowStockItems(),
          ]));
        setTotalInventory(inventoryData);
        setMonthlySales(monthlySalesData);
        setPendingOrders(pendingData.count);
        setLowStockItems(lowStock);
        const entryItems = entries
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);
        const activities: ActivityItem[] = [
          ...recentOrders.map((o: any) => ({
            id: o.id,
            type: 'order',
            description: `Nueva orden #${o.code}`,
            createdAt: o.createdAt,
            href: `/dashboard/orders/${o.id}`,
          })),
          ...recentSales.map((s: any) => ({
            id: s.id,
            type: 'sale',
            description: `Venta interna #${s.id}`,
            createdAt: s.createdAt,
            href: '/dashboard/sales',
          })),
          ...entryItems.map((e: any) => ({
            id: e.id,
            type: 'entry',
            description: `Ingreso de inventario #${e.id}`,
            createdAt: e.createdAt,
            href: '/dashboard/entries',
          })),
          ...lowStock.slice(0, 10).map((i: any) => ({
            id: i.productId,
            type: 'alert',  
            description: `Sin stock: ${i.productName}`,
            createdAt: new Date().toISOString(),
            href: '/dashboard/inventory',
          })),
        ];
        activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentActivity(activities.slice(0, 10));
      } catch (error: unknown) {
        if (!handleAuthError(error)) {
          if (error instanceof Error && error.message === 'Unauthorized') {
            router.push('/unauthorized');
          } else {
            console.error('Error cargando datos:', error);
          }
        }      
      } finally {
        setLoading(false);
      }
    }
  fetchData();
  }, [])

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <span className="text-lg font-semibold">Managment Pro V1</span>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventario Total</CardTitle>
                <Box className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              <div className="text-2xl font-bold">
                {loading ? 'Cargando...' : totalInventory.reduce((sum, item) => sum + item.totalStock, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Items en stock</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ventas del mes</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading
                    ? "Cargando..."
                    : monthlySales
                    ? `S/.${monthlySales.total.toFixed(2)}`
                    : "Sin datos"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {monthlySales?.growth != null
                    ? `${monthlySales.growth >= 0 ? "+" : ""}${monthlySales.growth.toFixed(1)}% desde el mes anterior`
                    : "Sin datos del mes anterior"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Items sin Stock</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lowStockItems.length}</div>
                <p className="text-xs text-muted-foreground">Productos que necesitan reabastecimiento</p>
              </CardContent>
            </Card>
            <Link href="/dashboard/orders" prefetch={false} className="block">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ordenes Pendientes</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingOrders}</div>
                  <p className="text-xs text-muted-foreground">Ordenes que necesitan ser atendidas</p>
                </CardContent>
              </Card>
            </Link>
          </div>
          <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Bienvenido a tu Sistema de Administracion de Inventarios</CardTitle>
                <CardDescription>
                  Administra tu inventario, ventas, y optimiza los negocios de tu negocio en un solo lugar.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">Administracion de Inventario</p>
                      <p className="text-sm text-muted-foreground">Busca niveles de stock y detalles de productos</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/inventory">Administrar</Link>
                  </Button>
                </div>
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <ShoppingCart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">Proceso de Ordenes</p>
                      <p className="text-sm text-muted-foreground">Administra las ordenes de los clientes y ventas</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/orders">Procesar</Link>
                  </Button>
                </div>
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Truck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">Administracion de Proveedores</p>
                      <p className="text-sm text-muted-foreground">Administra Proveedores</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/providers">Ir</Link>
                  </Button>
                </div>
                <div className="flex items-center justify-between space-x-4">
                  <div className="flex items-center space-x-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">Reportes y Analisis</p>
                      <p className="text-sm text-muted-foreground">Observa tendencias de ventas y reportes de inventarios</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/sales/salesdashboard">Analizar</Link>
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Empezar</Button>
              </CardFooter>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Actividad Reciente</CardTitle>
                <CardDescription>Ultimas actualizaciones del inventario y ordenes</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                {recentActivity.map((a) => (
                  <Link key={`${a.type}-${a.id}`} href={a.href} className="flex items-center space-x-4">
                    <div className="rounded-full bg-muted p-2">
                      {a.type === 'order' && <Users className="h-4 w-4" />}
                      {a.type === 'sale' && <DollarSign className="h-4 w-4" />}
                      {a.type === 'entry' && <Package className="h-4 w-4" />}
                      {a.type === 'alert' && <TrendingUp className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{a.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true, locale: es })}
                      </p>
                    </div>
                  </Link>
                ))}
              </CardContent>
              <CardFooter>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/dashboard/activity">Ver toda la actividad</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
