"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface TransactionHistoryTableProps {
  transactions: any[]
}

export function TransactionHistoryTable({ transactions }: TransactionHistoryTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow>
            <TableHead>Fecha/Hora</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Método de Pago</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Trabajador</TableHead>
            <TableHead>Productos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx: any) => (
            <TableRow key={tx.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {new Date(tx.createdAt).toLocaleString("es-PE")}
              </TableCell>
              <TableCell>{tx.source}</TableCell>
              <TableCell>
                {tx.paymentMethod?.name || tx.paymentMethod || "-"}
              </TableCell>
              <TableCell className="text-green-600 font-medium whitespace-nowrap">
                {typeof tx.amount === "number" ? `S/ ${tx.amount.toFixed(2)}` : tx.amount}
              </TableCell>
              <TableCell>{tx.user?.username || "-"}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {tx.products?.map((p: any, i: number) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-xs font-normal"
                    >
                      {p.name}
                      {p.series && p.series.length > 0 && (
                        <span className="ml-1">({p.series.join(", ")})</span>
                      )}
                    </Badge>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {transactions.length === 0 && (
        <p className="p-4 text-sm text-center text-muted-foreground">
          No hay transacciones para el rango seleccionado
        </p>
      )}
    </div>
  )
}

export default TransactionHistoryTable