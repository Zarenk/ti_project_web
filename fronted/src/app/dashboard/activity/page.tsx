"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  const authErrorShown = useRef(false);

  const handleAuthError = (err: unknown) => {
    if (authErrorShown.current) return true;
    if (err instanceof UnauthenticatedError) {
      authErrorShown.current = true;
      toast.error("Tu sesión ha expirado. Vuelve a iniciar sesión.");
      const path = window.location.pathname;
      router.replace(`/login?returnTo=${encodeURIComponent(path)}`);
      return true;
    }
    return false;
  };

  useEffect(() => {
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
        lowStock.forEach((i: any) => items.push({
          id: i.productId,
          type: 'alert',
          description: `Sin stock: ${i.productName}`,
          createdAt: new Date().toISOString(),
          href: '/dashboard/inventory',
        }));
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setActivities(items);
      } catch (error: unknown) {
        if (!handleAuthError(error)) {
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
  }, []);

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