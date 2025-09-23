"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "./data-table";
import { getUserDataFromToken, isTokenValid } from "@/lib/auth";
import { getColumns } from "./column";
import { getOrders } from "./orders.api";
import { getStore } from "@/app/dashboard/stores/stores.api";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [storesMap, setStoresMap] = useState<Record<number, string>>({});

  const handleStatusUpdate = useCallback((id: number, status: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
  }, []);

  const columns = useMemo(() => getColumns(handleStatusUpdate), [handleStatusUpdate]);

  useEffect(() => {
    async function fetchData() {
      const user = await getUserDataFromToken();
      if (!user || !(await isTokenValid()) || user.role !== "ADMIN") {
        router.replace("/unauthorized");
        return;
      }
      try {
        const data = await getOrders();

        // Fetch store names for unique storeIds in payload
        const uniqueStoreIds = Array.from(
          new Set(
            (data || [])
              .map((o: any) => Number(o?.payload?.storeId))
              .filter((n: any) => typeof n === 'number' && !Number.isNaN(n) && n > 0)
          )
        );

        const storeEntries: [number, string][] = [];
        for (const sid of uniqueStoreIds) {
          try {
            const s = await getStore(String(sid));
            if (s && s.name) storeEntries.push([sid as number, String(s.name)]);
          } catch {
            // ignore failures, fallback label below
          }
        }
        const nextStoresMap = Object.fromEntries(storeEntries);
        setStoresMap(nextStoresMap);

        const mapped = data.map((o: any) => {
          const sid = Number(o?.payload?.storeId);
          const origin = sid && sid > 0 ? (nextStoresMap[sid] || `Tienda ${sid}`) : 'WEB POS';
          return {
            id: o.id,
            code: o.code,
            createdAt: o.createdAt,
            client: o.payload?.firstName ? `${o.payload.firstName} ${o.payload.lastName}` : o.shippingName,
            total: o.payload?.total ?? 0,
            status: o.status,
            origin,
            shippingMethod: typeof o?.payload?.shippingMethod === 'string' ? o.payload.shippingMethod : undefined,
            carrierName: o.carrierName ?? undefined,
            carrierId: o.carrierId ?? undefined,
            carrierMode: o.carrierMode ?? undefined,
          };
        });
        setOrders(mapped);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [router]);

  return (
    <section className="py-2 sm:py-6">
      <div className="container mx-auto px-1 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between px-5 gap-3 mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Órdenes</h1>
          <Button
            onClick={() => router.push('/dashboard/orders/new')}
            className="bg-blue-900 hover:bg-blue-800 text-white"
          >
            Nueva Orden
          </Button>
        </div>
        {isLoading ? (
          <div className="rounded-md border p-4">
            <div className="grid grid-cols-7 gap-3 px-2 py-2">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={`h-${i}`} className="h-4 w-full" />
              ))}
            </div>
            <div className="divide-y">
              {[...Array(8)].map((_, r) => (
                <div key={`r-${r}`} className="grid grid-cols-7 gap-3 px-2 py-3">
                  {[...Array(7)].map((_, c) => (
                    <Skeleton key={`r-${r}-c-${c}`} className="h-5 w-full" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <DataTable columns={columns} data={orders} />
        )}
      </div>
    </section>
  );
}
