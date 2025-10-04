"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import SimplePagination from "@/components/simple-pagination"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"
import { BACKEND_URL } from "@/lib/utils"

interface TransactionHistoryTableProps {
  transactions: any[]
  /** Indica si estás trayendo datos nuevos (para mantener los anteriores en pantalla) */
  isFetching?: boolean
  /** Mantener datos previos visibles durante la carga */
  keepPrevious?: boolean
}

export function TransactionHistoryTable({
  transactions,
  isFetching = false,
  keepPrevious = true,
}: TransactionHistoryTableProps) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  // Guarda el último dataset "bueno" para mantenerlo mientras se está cargando el nuevo
  const prevDataRef = useRef<any[]>([])
  useEffect(() => {
    if (!isFetching) {
      // Solo actualiza el snapshot cuando termina la carga
      prevDataRef.current = Array.isArray(transactions) ? transactions : []
    }
  }, [transactions, isFetching])

  // Decide qué dataset mostrar (actual o el previo) según el estado de carga
  const stableData = useMemo(() => {
    if (keepPrevious && isFetching) {
      // Si está cargando, muestra lo anterior si existe; si no, muestra el actual
      return prevDataRef.current.length ? prevDataRef.current : transactions
    }
    return transactions
  }, [transactions, isFetching, keepPrevious])

  // Recalcular páginas de forma segura (sobre el dataset estable)
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((stableData?.length || 0) / pageSize)),
    [stableData?.length, pageSize]
  )
  const safePage = page > totalPages ? totalPages : page < 1 ? 1 : page

  // Normaliza página cuando cambia el dataset o pageSize
  useEffect(() => {
    if (page !== safePage) setPage(safePage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, stableData?.length, safePage])

  const displayed = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return stableData.slice(start, start + pageSize)
  }, [stableData, safePage, pageSize])

  // Tip: si el padre le pone un key al componente (p.ej. key={`${from}-${to}`}),
  // eso fuerza un remount y causa "parpadeo". Evítalo.

  return (
    <div className="relative w-full overflow-x-auto">
      {/* Overlay de carga: no oculta filas, solo muestra un velo encima */}
      {isFetching && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Cargando transacciones…</span>
          </div>
        </div>
      )}

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
          {stableData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No hay transacciones para el rango seleccionado
              </TableCell>
            </TableRow>
          ) : (
            // Durante la carga desactivamos animaciones para evitar "exit/enter"
            isFetching ? (
              <>
                {displayed.map((tx: any, i: number) => {
                  const paymentMethods =
                    tx.payments?.map((p: any) => `${p.method}: S/ ${p.amount.toFixed(2)}`).join(", ") || "-"
                  const products =
                    tx.items?.map((item: any) => ({ name: item.productName, series: item.series })) || []

                  const hasInvoice = Boolean(tx.tipoComprobante && tx.serie && tx.correlativo)
                  const invoiceType = hasInvoice ? String(tx.tipoComprobante).toLowerCase() : null
                  const invoiceCode = invoiceType === "boleta" ? "03" : "01"
                  const invoiceFile = hasInvoice ? `20519857538-${invoiceCode}-${tx.serie}-${tx.correlativo}.pdf` : null
                  const invoiceUrl =
                    invoiceType && invoiceFile ? `${BACKEND_URL}/api/sunat/pdf/${invoiceType}/${invoiceFile}` : null

                  const rowKey =
                    tx.id ??
                    tx.uuid ??
                    `${tx.serie ?? "s"}-${tx.correlativo ?? "c"}-${tx.date ?? "d"}-${tx.customerName ?? "n"}-${i}`

                  return (
                    <tr key={rowKey}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {tx.date ? new Date(tx.date).toLocaleString("es-PE") : "-"}
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
                        {typeof tx.total === "number" ? `S/ ${tx.total.toFixed(2)}` : tx.total ?? "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {products.map((p: any, j: number) => (
                            <Badge
                              key={`${rowKey}-prod-${j}`}
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
                    </tr>
                  )
                })}
              </>
            ) : (
              <AnimatePresence initial={false} mode="popLayout">
                {displayed.map((tx: any, i: number) => {
                  const paymentMethods =
                    tx.payments?.map((p: any) => `${p.method}: S/ ${p.amount.toFixed(2)}`).join(", ") || "-"
                  const products =
                    tx.items?.map((item: any) => ({ name: item.productName, series: item.series })) || []

                  const hasInvoice = Boolean(tx.tipoComprobante && tx.serie && tx.correlativo)
                  const invoiceType = hasInvoice ? String(tx.tipoComprobante).toLowerCase() : null
                  const invoiceCode = invoiceType === "boleta" ? "03" : "01"
                  const invoiceFile = hasInvoice ? `20519857538-${invoiceCode}-${tx.serie}-${tx.correlativo}.pdf` : null
                  const invoiceUrl =
                    invoiceType && invoiceFile ? `${BACKEND_URL}/api/sunat/pdf/${invoiceType}/${invoiceFile}` : null

                  const rowKey =
                    tx.id ??
                    tx.uuid ??
                    `${tx.serie ?? "s"}-${tx.correlativo ?? "c"}-${tx.date ?? "d"}-${tx.customerName ?? "n"}-${i}`

                  return (
                    <motion.tr
                      key={rowKey}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18 }}
                    >
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {tx.date ? new Date(tx.date).toLocaleString("es-PE") : "-"}
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
                        {typeof tx.total === "number" ? `S/ ${tx.total.toFixed(2)}` : tx.total ?? "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {products.map((p: any, j: number) => (
                            <Badge
                              key={`${rowKey}-prod-${j}`}
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
            )
          )}
        </TableBody>
      </Table>

      <div className="py-2">
        <SimplePagination
          page={safePage}
          pageSize={pageSize}
          totalItems={stableData.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  )
}

export default TransactionHistoryTable
