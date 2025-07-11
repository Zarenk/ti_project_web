"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Box, DollarSign, Package, ShoppingCart, TrendingUp, Truck, Users } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react";
import { getLowStockItems, getTotalInventory } from "./inventory/inventory.api";
import { getMonthlySalesTotal } from "./sales/sales.api"

export default function WelcomeDashboard() {

//------------------------------- CONSTANTES --------------------------------//
  const [totalInventory, setTotalInventory] = useState<{ name: string; totalStock: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const [monthlySales, setMonthlySales] = useState<{ total: number; growth: number | null } | null>(null);

  const [lowStockItems, setLowStockItems] = useState<{ productId: number; productName: string; storeName: string; stock: number }[]>([]);


//------------------------------- USE EFFECT --------------------------------//

useEffect(() => {
  async function fetchTotalInventory() {
    try {
      const data = await getTotalInventory();
      setTotalInventory(data);
    } catch (error) {
      console.error('Error al cargar el inventario total:', error);
    } finally {
      setLoading(false);
    }
  }

  fetchTotalInventory();
}, []);

useEffect(() => {
  async function fetchData() {
    try {
      const [inventoryData, salesData] = await Promise.all([
        getTotalInventory(),
        getMonthlySalesTotal(),
      ]);
      setTotalInventory(inventoryData);
      setMonthlySales(salesData);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  }

  fetchData();
}, []);


useEffect(() => {
  async function fetchLowStockItems() {
    try {
      const data = await getLowStockItems();
      setLowStockItems(data);
    } catch (error) {
      console.error('Error al cargar productos sin stock:', error);
    }
  }

  fetchLowStockItems();
}, []);

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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ordenes Pendientes</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Sin Ordenes</div>
                <p className="text-xs text-muted-foreground">Ordenes que necesitan ser atendidas</p>
              </CardContent>
            </Card>
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
                    <Link href="/dashboard/sales/new">Procesar</Link>
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
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-muted p-2">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">New order #1093</p>
                    <p className="text-xs text-muted-foreground">2 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-muted p-2">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">Stock updated: Wireless Headphones</p>
                    <p className="text-xs text-muted-foreground">15 minutes ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-muted p-2">
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">Shipment #4582 delivered</p>
                    <p className="text-xs text-muted-foreground">1 hour ago</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-muted p-2">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-none">Low stock alert: USB-C Cables</p>
                    <p className="text-xs text-muted-foreground">3 hours ago</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  Ver toda la activadad
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
