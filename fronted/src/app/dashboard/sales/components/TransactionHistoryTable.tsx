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
import { BACKEND_URL } from "@/lib/utils"

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
            <TableHead>Serie</TableHead>
            <TableHead>Correlativo</TableHead>
            <TableHead>Comprobante</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Pagos</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Productos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence>
            {displayed.map((tx: any, index: number) => {
              const paymentMethods =
                tx.payments?.map((p: any) => `${p.method}: S/ ${p.amount.toFixed(2)}`).join(", ") || "-"
              const products =
                tx.items?.map((item: any) => ({
                  name: item.productName,
                  series: item.series,
                })) || []
              const hasInvoice = Boolean(tx.tipoComprobante && tx.serie && tx.correlativo)
              const invoiceType = hasInvoice ? tx.tipoComprobante.toLowerCase() : null
              const invoiceCode = invoiceType === "boleta" ? "03" : "01"
              const invoiceFile = hasInvoice
                ? `20519857538-${invoiceCode}-${tx.serie}-${tx.correlativo}.pdf`
                : null
              const invoiceUrl = invoiceType && invoiceFile
                ? `${BACKEND_URL}/api/sunat/pdf/${invoiceType}/${invoiceFile}`
                : null
              return (
                <motion.tr
                  key={index}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2 }}
                >
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(tx.date).toLocaleString("es-PE")}
                  </TableCell>
                  <TableCell>{tx.serie || "-"}</TableCell>
                  <TableCell>{tx.correlativo || "-"}</TableCell>
                  <TableCell>
                    {hasInvoice && invoiceUrl ? (
                      <div className="flex flex-col">
                        <span className="font-medium">{tx.tipoComprobante}</span>
                        <a
                          href={invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 underline"
                        >
                          Ver comprobante ({tx.serie}-{tx.correlativo})
                        </a>
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </TableCell>
                  <TableCell>{tx.customerName || "-"}</TableCell>
                  <TableCell>{paymentMethods}</TableCell>
                  <TableCell className="text-green-600 font-medium whitespace-nowrap">
                    {typeof tx.total === "number" ? `S/ ${tx.total.toFixed(2)}` : tx.total}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {products.map((p: any, i: number) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="flex flex-col items-start gap-0 text-xs font-normal"
                        >
                          <span>{p.name}</span>
                          {Array.isArray(p.series) && p.series.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              Serie{p.series.length > 1 ? "s" : ""}: {p.series.join(", ")}
                            </span>
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

