"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MODULE_PERMISSION_LABELS, useEnforcedModulePermission } from "@/hooks/use-enforced-module-permission";
import { DataTable } from "./data-table";
import { columns, Activity } from "./columns";
import { getOrders } from "../orders/orders.api";
import { getSales } from "../sales/sales.api";
import { getAllEntries } from "../entries/entries.api";
import { getLowStockItems } from "../inventory/inventory.api";
import { getUserDataFromToken, isTokenValid } from "@/lib/auth";
import { UnauthenticatedError } from "@/utils/auth-fetch";

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { allowed: dashboardAllowed, loading: permissionLoading } = useEnforcedModulePermission("dashboard");
  const permissionToastShown = useRef(false);
  const authErrorShown = useRef(false);

  const handleAuthError = async (err: unknown) => {
    if (authErrorShown.current) return true;
    if (err instanceof UnauthenticatedError) {
      authErrorShown.current = true;
      if (await isTokenValid()) {
        router.push('/unauthorized');
      } else {
        toast.error("Tu sesión ha expirado. Vuelve a iniciar sesión.");
        const path = window.location.pathname;
        router.replace(`/login?returnTo=${encodeURIComponent(path)}`);
      }
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (permissionLoading) return;

    if (!dashboardAllowed) {
      if (!permissionToastShown.current) {
        permissionToastShown.current = true;
        toast.error(`No tienes permisos para acceder a ${MODULE_PERMISSION_LABELS.dashboard}.`);
      }
      router.replace("/unauthorized");
    } else {
      permissionToastShown.current = false;
    }
  }, [dashboardAllowed, permissionLoading, router]);

  useEffect(() => {
    if (permissionLoading || !dashboardAllowed) {
      return;
    }

    async function fetchData() {
      const data = await getUserDataFromToken();
      if (!data || !(await isTokenValid()) || (data.role !== 'ADMIN' && data.role !== 'EMPLOYEE')) {
        router.push('/unauthorized');
        return;
      }
      try {
        const [orders, sales, entries, lowStock] = await Promise.all([
          getOrders(),
          getSales(),
          getAllEntries(),
          getLowStockItems(),
        ]);
        const items: Activity[] = [];
        orders.forEach((o: any) => items.push({
          id: o.id,
          type: 'order',
          description: `Nueva orden #${o.code}`,
          createdAt: o.createdAt,
          href: `/dashboard/orders/${o.id}`,
        }));
        sales.forEach((s: any) => items.push({
          id: s.id,
          type: 'sale',
          description: `Venta interna #${s.id}`,
          createdAt: s.createdAt,
          href: '/dashboard/sales',
        }));
        entries.forEach((e: any) => items.push({
          id: e.id,
          type: 'entry',
          description: `Ingreso de inventario #${e.id}`,
          createdAt: e.createdAt,
          href: '/dashboard/entries',
        }));
        // Alertas de bajo stock: mostrar nuevas y colapsar repetidas
        try {
          const storageKey = 'dashboard.lowstock.seen'
          const raw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
          const seen: Record<string, number> = raw ? JSON.parse(raw) : {}
          const now = Date.now()
          const ttlMs = 24 * 60 * 60 * 1000 // 24h
          const newLow = (Array.isArray(lowStock) ? lowStock : []).filter((i: any) => !seen[String(i.productId)] || (now - seen[String(i.productId)]) > ttlMs)

          // Hasta 5 nuevas en la vista completa
          newLow.slice(0, 5).forEach((i: any) => items.push({
            id: `lowstock-${i.productId}-${now}`,
            type: 'alert',
            description: `Sin stock: ${i.productName}`,
            createdAt: new Date().toISOString(),
            href: '/dashboard/inventory',
          }))

          const remaining = (Array.isArray(lowStock) ? lowStock.length : 0) - newLow.length
          if (newLow.length === 0 && Array.isArray(lowStock) && lowStock.length > 0) {
            const first = lowStock[0]
            items.push({
              id: 'lowstock-summary',
              type: 'alert',
              description: lowStock.length === 1
                ? `Sin stock: ${first.productName}`
                : `Sin stock: ${first.productName} y ${lowStock.length - 1} más`,
              createdAt: new Date().toISOString(),
              href: '/dashboard/inventory',
            })
          } else if (remaining > 0) {
            items.push({
              id: 'lowstock-remaining',
              type: 'alert',
              description: `Otros ${remaining} productos en stock bajo`,
              createdAt: new Date().toISOString(),
              href: '/dashboard/inventory',
            })
          }

          const updated = { ...seen }
          newLow.forEach((i: any) => { updated[String(i.productId)] = now })
          if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, JSON.stringify(updated))
          }
        } catch {
          // ignorar errores de storage
        }
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setActivities(items);
      } catch (error: unknown) {
        if (!(await handleAuthError(error))) {
          if (error instanceof Error && error.message === 'Unauthorized') {
            router.push('/unauthorized');
          } else {
            console.error('Error cargando actividad:', error);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dashboardAllowed, permissionLoading, router]);

  if (permissionLoading || !dashboardAllowed) {
    return null;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Toda la Actividad</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <DataTable columns={columns} data={activities} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
