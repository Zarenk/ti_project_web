"use client";

import { useEffect, useState } from "react";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import { getSales } from "./sales.api";

export const dynamic = "force-dynamic"; // PARA HACER LA PAGINA DINAMICA

export default function Page() {
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getSales();
        const mapped = data.map((sale: any) => ({ ...sale }));
        setSales(mapped);
      } catch (error) {
        console.error("Error al obtener las ventas:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      <section className="py-2 sm:py-6">
        <div className="container mx-auto px-1 sm:px-6 lg:px-8">
          <h1 className="px-5 text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">
            Historial de Ventas
          </h1>
          <div className="overflow-x-auto">
            <DataTable columns={columns} data={sales} />
          </div>      
        </div>
      </section>
    </>
  );
}