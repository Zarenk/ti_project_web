"use client"

import { useState, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import SimplePagination from "@/components/simple-pagination"
import { motion, AnimatePresence } from "framer-motion"

interface TransactionHistoryTableProps {
  transactions: any[]
}

export function TransactionHistoryTable({ transactions }: TransactionHistoryTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  useEffect(() => {
    setPage(1)
  }, [pageSize, transactions.length])

  const displayed = transactions.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full text-sm">
        <TableHeader>
          <TableRow>
            <TableHead>Fecha/Hora</TableHead>
            <TableHead>Origen</TableHead>
            <TableHead>Método de Pago</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Tipo Usuario</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Productos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence>
            {displayed.map((tx: any) => {
              const paymentMethods = tx.payments?.map((p: any) => p.paymentMethod?.name).join(", ") || "-"
              const products =
                tx.salesDetails?.map((sd: any) => ({
                  name: sd.entryDetail?.product?.name,
                  series: sd.series,
                })) || []
              return (
                <motion.tr
                  key={tx.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleString("es-PE")}
                  </TableCell>
                  <TableCell>{tx.source}</TableCell>
                  <TableCell>{paymentMethods}</TableCell>
                  <TableCell className="text-green-600 font-medium whitespace-nowrap">
                    {typeof tx.total === "number" ? `S/ ${tx.total.toFixed(2)}` : tx.total}
                  </TableCell>
                  <TableCell>{tx.user?.role || "-"}</TableCell>
                  <TableCell>{tx.user?.username || "-"}</TableCell>
                  <TableCell>{tx.description || "-"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {products.map((p: any, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs font-normal">
                          {p.name}
                          {p.series && p.series.length > 0 && (
                            <span className="ml-1">({p.series.join(", ")})</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </motion.tr>
              )
            })}
          </AnimatePresence>
          {displayed.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No hay transacciones para el rango seleccionado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="py-2">
        <SimplePagination
          page={page}
          pageSize={pageSize}
          totalItems={transactions.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  )
}

export default TransactionHistoryTable