"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, Box, DollarSign, Package, ShoppingCart, TrendingUp, Truck, Users } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { getLowStockItems, getTotalInventory } from "./inventory/inventory.api"
import { getMonthlySalesTotal, getRecentSales } from "./sales/sales.api"
import { getUserDataFromToken, isTokenValid } from "@/lib/auth"
import { useModulePermission } from "@/hooks/use-module-permission"
import { getOrdersCount, getRecentOrders } from "./orders/orders.api"
import { getAllEntries } from "./entries/entries.api"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { UnauthenticatedError } from "@/utils/auth-fetch"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { listOrganizations, type OrganizationResponse } from "./tenancy/tenancy.api"
import { clearTenantSelection, getTenantSelection, setTenantSelection } from "@/utils/tenant-preferences"
import { wasManualLogoutRecently } from "@/utils/manual-logout"

type ActivityItem = {
  id: number | string
  type: "order" | "sale" | "entry" | "alert"
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
  const [userRole, setUserRole] = useState<string | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationResponse[]>([])
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null)
  const [organizationsLoading, setOrganizationsLoading] = useState(false)
  const [bootstrapReady, setBootstrapReady] = useState(false)
  const [totalInventory, setTotalInventory] = useState<{ name: string; totalStock: number }[]>([])
  const [loading, setLoading] = useState(true)

  const [monthlySales, setMonthlySales] = useState<{ total: number; growth: number | null } | null>(null)

  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [pendingOrders, setPendingOrders] = useState(0)
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])

  const checkPermission = useModulePermission()
  const router = useRouter()
  const authErrorShown = useRef(false)

  const handleAuthError = useCallback(async (err: unknown) => {
    if (authErrorShown.current) return true
    if (err instanceof UnauthenticatedError) {
      if (wasManualLogoutRecently()) {
        authErrorShown.current = true
        return true
      }
      authErrorShown.current = true
      if (await isTokenValid()) {
        router.push("/unauthorized")
      } else {
        toast.error("Tu sesion ha expirado. Vuelve a iniciar sesion.")
        const path = window.location.pathname
        router.replace(`/login?returnTo=${encodeURIComponent(path)}`)
      }
      return true
    }
    return false
  }, [router])

  const isGlobalSuperAdmin = userRole === "SUPER_ADMIN_GLOBAL"

  const handleOrganizationChange = useCallback(
    (value: string) => {
      if (!isGlobalSuperAdmin) return
      const trimmed = value.trim()
      if (trimmed.length === 0) {
        setSelectedOrgId(null)
        setTenantSelection({ orgId: null, companyId: null })
        router.refresh()
        return
      }

      const nextId = Number.parseInt(trimmed, 10)
      if (!Number.isFinite(nextId)) {
        toast.error("Identificador de organizacion invalido.")
        return
      }

      const target = nextId != null ? organizations.find((org) => org.id === nextId) ?? null : null
      const nextCompanyId = target?.companies?.[0]?.id ?? null
      setSelectedOrgId(nextId)
      setTenantSelection({ orgId: nextId, companyId: nextCompanyId })
      router.refresh()
    },
    [isGlobalSuperAdmin, organizations, router],
  )

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      try {
        const data = await getUserDataFromToken()
        const allowedRoles = ["SUPER_ADMIN_GLOBAL", "SUPER_ADMIN_ORG", "ADMIN", "EMPLOYEE"]
        if (!data || !(await isTokenValid()) || !allowedRoles.includes(data.role ?? "")) {
          router.push("/unauthorized")
          return
        }

        setUserRole(data.role ?? null)

        if (data.role === "SUPER_ADMIN_GLOBAL") {
          setOrganizationsLoading(true)
          try {
            const orgList = await listOrganizations()
            if (cancelled) return
            setOrganizations(orgList)

            const stored = await getTenantSelection()
            const resolvedOrg =
              stored.orgId != null && orgList.some((org) => org.id === stored.orgId)
                ? stored.orgId
                : orgList[0]?.id ?? null

            let resolvedCompany: number | null = null
            if (resolvedOrg != null) {
              const target = orgList.find((org) => org.id === resolvedOrg)
              resolvedCompany =
                target?.companies?.some((company) => company.id === stored.companyId) === true
                  ? stored.companyId
                  : target?.companies?.[0]?.id ?? null
            }

            setSelectedOrgId(resolvedOrg)
            setTenantSelection({ orgId: resolvedOrg, companyId: resolvedCompany })
          } catch (error) {
            if (!cancelled) {
              console.error("Error cargando organizaciones", error)
              toast.error("No se pudieron cargar las organizaciones disponibles.")
              setOrganizations([])
              setSelectedOrgId(null)
              clearTenantSelection()
            }
          } finally {
            if (!cancelled) {
              setOrganizationsLoading(false)
            }
          }
        } else {
          clearTenantSelection()
          setSelectedOrgId(null)
        }
      } catch (error) {
        console.error("Error inicializando el dashboard", error)
        toast.error("No se pudo inicializar el panel de control.")
      } finally {
        if (!cancelled) {
          setBootstrapReady(true)
        }
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [router])

  useEffect(() => {
    if (!bootstrapReady) return

    if (isGlobalSuperAdmin) {
      if (organizationsLoading) return

      if (organizations.length === 0) {
        setLoading(false)
        setTotalInventory([])
        setMonthlySales(null)
        setPendingOrders(0)
        setLowStockItems([])
        setRecentActivity([])
        return
      }

      if (selectedOrgId == null) {
        setLoading(false)
        return
      }
    }

    let cancelled = false

    async function fetchDashboardData() {
      setLoading(true)
      try {
        const canInventory = checkPermission("inventory")
        const canSales = checkPermission("sales")
        const canOrders = checkPermission("sales")

        const [
          inventoryData,
          monthlySalesData,
          pendingData,
          recentOrders,
          entries,
          recentSales,
          lowStock,
        ] = await Promise.all([
          canInventory ? getTotalInventory() : Promise.resolve<any[]>([]),
          canSales ? getMonthlySalesTotal() : Promise.resolve<{ total: number; growth: number | null } | null>(null),
          canOrders ? getOrdersCount("PENDING") : Promise.resolve<{ count: number }>({ count: 0 }),
          canOrders ? getRecentOrders(10) : Promise.resolve<any[]>([]),
          canInventory ? getAllEntries() : Promise.resolve<any[]>([]),
          canSales ? getRecentSales() : Promise.resolve<any[]>([]),
          canInventory ? getLowStockItems() : Promise.resolve<any[]>([]),
        ])

        if (cancelled) return

        const safeInventory = Array.isArray(inventoryData) ? inventoryData : []
        const safePendingCount =
          pendingData && typeof (pendingData as any).count === "number"
            ? Number((pendingData as any).count)
            : 0
        const safeRecentOrders = Array.isArray(recentOrders) ? recentOrders : []
        const safeEntries = Array.isArray(entries) ? entries : []
        const safeRecentSales = Array.isArray(recentSales) ? recentSales : []
        const safeLowStock = Array.isArray(lowStock) ? lowStock : []

        setTotalInventory(safeInventory)
        setMonthlySales(monthlySalesData)
        setPendingOrders(safePendingCount)
        setLowStockItems(safeLowStock)

        const entryItems = safeEntries
          .slice()
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10)

        const activities: ActivityItem[] = [
          ...safeRecentOrders.map((o: any) => ({
            id: o.id,
            type: "order" as const,
            description: `Nueva orden #${o.code}`,
            createdAt: o.createdAt,
            href: `/dashboard/orders/${o.id}`,
          })),
          ...safeRecentSales.map((s: any) => ({
            id: s.id,
            type: "sale" as const,
            description: `Venta interna #${s.id}`,
            createdAt: s.createdAt,
            href: "/dashboard/sales",
          })),
          ...entryItems.map((e: any) => ({
            id: e.id,
            type: "entry" as const,
            description: `Ingreso de inventario #${e.id}`,
            createdAt: e.createdAt,
            href: "/dashboard/entries",
          })),
          ...(() => {
            const list: ActivityItem[] = []
            if (safeLowStock.length === 0) return list
            try {
              const storageKey = "dashboard.lowstock.seen"
              const raw = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null
              const seen: Record<string, number> = raw ? JSON.parse(raw) : {}
              const now = Date.now()
              const ttlMs = 24 * 60 * 60 * 1000
              const newLow = safeLowStock.filter(
                (i: any) => !seen[String(i.productId)] || now - seen[String(i.productId)] > ttlMs,
              )

              list.push(
                ...newLow.slice(0, 3).map((i: any) => ({
                  id: `lowstock-${i.productId}-${now}`,
                  type: "alert" as const,
                  description: `Sin stock: ${i.productName}`,
                  createdAt: new Date().toISOString(),
                  href: "/dashboard/inventory",
                })),
              )

              const remaining = safeLowStock.length - newLow.length
              if (newLow.length === 0 && safeLowStock.length > 0) {
                const first = safeLowStock[0]
                list.push({
                  id: "lowstock-summary",
                  type: "alert" as const,
                  description:
                    safeLowStock.length === 1
                      ? `Sin stock: ${first.productName}`
                      : `Sin stock: ${first.productName} y ${safeLowStock.length - 1} mas`,
                  createdAt: new Date().toISOString(),
                  href: "/dashboard/inventory",
                })
              } else if (remaining > 0) {
                list.push({
                  id: "lowstock-remaining",
                  type: "alert" as const,
                  description: `Otros ${remaining} productos en stock bajo`,
                  createdAt: new Date().toISOString(),
                  href: "/dashboard/inventory",
                })
              }

              const updated = { ...seen }
              newLow.forEach((i: any) => {
                updated[String(i.productId)] = now
              })
              if (typeof window !== "undefined") {
                localStorage.setItem(storageKey, JSON.stringify(updated))
              }
            } catch {
              /* ignore */
            }
            return list
          })(),
        ]

        activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setRecentActivity(activities.slice(0, 10))
      } catch (error: unknown) {
        if (!(await handleAuthError(error))) {
          if (error instanceof Error && error.message === "Unauthorized") {
            router.push("/unauthorized")
          } else {
            console.error("Error cargando datos:", error)
            toast.error("No se pudo cargar la informacion del dashboard.")
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchDashboardData()

    return () => {
      cancelled = true
    }
  }, [
    bootstrapReady,
    isGlobalSuperAdmin,
    organizationsLoading,
    organizations,
    selectedOrgId,
    checkPermission,
    handleAuthError,
    router,
  ])

  const showOrganizationSelector =
    isGlobalSuperAdmin && (organizationsLoading || organizations.length > 0)
  const organizationSelectValue = selectedOrgId != null ? String(selectedOrgId) : ""
  if (loading) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <div className="flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <CardHeader className="space-y-2">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-4 w-80" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-60" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-56" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            <span className="text-lg font-semibold">Managment Pro V1</span>
          </div>
          {showOrganizationSelector ? (
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
                Organizacion
              </span>
              <Select
                value={organizationSelectValue.length > 0 ? organizationSelectValue : undefined}
                onValueChange={handleOrganizationChange}
                disabled={organizationsLoading || organizations.length === 0}
              >
                <SelectTrigger className="w-[240px]">
                  <SelectValue
                    placeholder={
                      organizationsLoading
                        ? "Cargando organizaciones..."
                        : "Selecciona una organizacion"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={String(org.id)}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
            <Link href="/dashboard/inventory" prefetch={false} className="block">
            <Card className="cursor-pointer">
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
            </Link>
            <Link href="/dashboard/sales" prefetch={false} className="block">
            <Card className="cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ventas del mes</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading
                    ? "Cargando..."
                    : monthlySales
                    ? `S/. ${monthlySales.total.toFixed(2)}`
                    : "Sin datos"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {monthlySales?.growth != null
                    ? `${monthlySales.growth >= 0 ? "+" : ""}${monthlySales.growth.toFixed(1)}% desde el mes anterior`
                    : "Sin datos del mes anterior"}
                </p>
              </CardContent>
            </Card>
            </Link>
            <Link href="/dashboard/inventory?outOfStock=true" prefetch={false} className="block">
            <Card className="cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Items sin Stock</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lowStockItems.length}</div>
                <p className="text-xs text-muted-foreground">Productos que necesitan reabastecimiento</p>
              </CardContent>
            </Card>
            </Link>
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













