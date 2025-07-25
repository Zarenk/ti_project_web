"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "./data-table";
import { getUserDataFromToken, isTokenValid } from "@/lib/auth";
import { columns } from "./column";
import { getOrders } from "./orders.api";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      const user = await getUserDataFromToken();
      if (!user || !(await isTokenValid()) || user.role !== "ADMIN") {
        router.replace("/unauthorized");
        return;
      }
      try {
        const data = await getOrders();
        const mapped = data.map((o: any) => ({
          id: o.id,
          code: o.code,
          createdAt: o.createdAt,
          client: o.payload?.firstName ? `${o.payload.firstName} ${o.payload.lastName}` : o.shippingName,
          total: o.payload?.total ?? 0,
          status: o.status,
        }));
        setOrders(mapped);
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, [router]);

  return (
    <section className="py-2 sm:py-6">
      <div className="container mx-auto px-1 sm:px-6 lg:px-8">
        <h1 className="px-5 text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">Órdenes</h1>
        <DataTable columns={columns} data={orders} />
      </div>
    </section>
  );
}