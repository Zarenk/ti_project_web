"use client"

import { useTenantSelection } from "@/context/tenant-selection-context";
import { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRange } from "react-day-picker";
import { getTopClients } from "../sales.api";
import { ClientSalesModal } from "./components/ClientSalesModal";

interface Props {
  dateRange: DateRange;
}

export function TopClientsTable({ dateRange }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const { selection, version } = useTenantSelection();
  const selectionKey = useMemo(
    () => `${selection.orgId ?? "none"}-${selection.companyId ?? "none"}-${version}`,
    [selection.orgId, selection.companyId, version],
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (dateRange?.from && dateRange?.to) {
          const from = dateRange.from.toISOString();
          const to = dateRange.to.toISOString();
          const res = await getTopClients({ from, to });
          setData(res);
        } else {
          const res = await getTopClients({});
          setData(res);
        }
      } catch (err) {
        console.error("Error al obtener top clientes:", err);
      }
    };

    fetchData();
  }, [dateRange, selectionKey]);

  return (
    <div className="rounded-xl border bg-card shadow-md overflow-x-auto">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Top Clientes</h2>
        <p className="text-sm text-muted-foreground">Ranking por monto total</p>
      </div>
      <Table className="w-full text-sm">
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead className="text-right">Compras</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((c) => (
            <TableRow
              key={c.clientId}
              className="hover:bg-muted cursor-pointer"
              onClick={() => setSelected(c)}
            >
              <TableCell className="font-medium">{c.clientName}</TableCell>
              <TableCell className="text-right">{c.salesCount}</TableCell>
              <TableCell className="text-right">S/ {c.totalAmount.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ClientSalesModal client={selected} open={!!selected} onClose={() => setSelected(null)} />
    </div>
  );
}
