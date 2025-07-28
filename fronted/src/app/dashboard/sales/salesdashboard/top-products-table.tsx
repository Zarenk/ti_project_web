"use client"

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange } from "react-day-picker";
import { getTopProducts } from "../sales.api";
import { Progress } from "@/components/progress";

interface Props {
  dateRange: DateRange
}

interface TopProduct {
  productId: number
  name: string
  sales: number
  revenue: number
  lastSale: string
}

export function TopProductsTable({ dateRange }: Props) {
  const [data, setData] = useState<TopProduct[]>([]);
  const [totalUnits, setTotalUnits] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let res;
        if (dateRange?.from && dateRange?.to) {
          const from = dateRange.from.toISOString();
          const to = dateRange.to.toISOString();
          res = await getTopProducts({ from, to });
        } else {
          res = await getTopProducts({ type: "month" });
        }
        setData(res);
        const total = res.reduce((sum: number, p: TopProduct) => sum + p.sales, 0);
        setTotalUnits(total);
      } catch (err) {
        console.error("Error al obtener top productos:", err);
      }
    };

    fetchData();
  }, [dateRange]);

  return (
    <div className="rounded-xl border bg-card shadow-md overflow-x-auto">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Top Productos</h2>
        <p className="text-sm text-muted-foreground">Ranking por unidades vendidas</p>
      </div>
      <Table className="w-full text-sm">
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead className="text-right">Unidades</TableHead>
            <TableHead className="text-right">Ingresos</TableHead>
            <TableHead className="text-right">Última venta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map(p => {
            const percent = totalUnits > 0 ? (p.sales / totalUnits) * 100 : 0;
            return (
              <TableRow key={p.productId}>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span>{p.sales}</span>
                    <Progress value={percent} className="w-24" />
                  </div>
                </TableCell>
                <TableCell className="text-right">S/ {p.revenue.toFixed(2)}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {new Date(p.lastSale).toLocaleString("es-PE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}