"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import {
  ArrowUpDown,
  ChevronUp,
  ChevronDown
} from "lucide-react"
import SimplePagination from "@/components/simple-pagination"
import { SaleDetailModal } from "./components/SalesDetailModal"
import { getRecentSalesByRange } from "../sales.api"
import { DateRange } from "react-day-picker"
import { endOfDay } from "date-fns"

interface Props {
  dateRange: DateRange
}

export function SalesTable({ dateRange }: Props) {
  const [sales, setSales] = useState<any[]>([])
  const [sortKey, setSortKey] = useState<string>("createdAt")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [selectedSale, setSelectedSale] = useState<any | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  useEffect(() => {
    setPage(1)
  }, [pageSize, sales.length])

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const from = dateRange.from.toISOString()
      const to = endOfDay(dateRange.to).toISOString()

      getRecentSalesByRange(from, to)
        .then(setSales)
        .catch(console.error)
    }
  }, [dateRange])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const sortedSales = [...sales].sort((a, b) => {
    const getValue = (sale: any) => {
      if (sortKey === "comprobante") {
        return sale.invoice?.tipoComprobante + sale.invoice?.serie + sale.invoice?.nroCorrelativo || ""
      }
      return sale[sortKey]
    }

    const aValue = getValue(a)
    const bValue = getValue(b)

    if (typeof aValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    }
    if (typeof aValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }
    return 0
  })

  const displayedSales = sortedSales.slice((page - 1) * pageSize, page * pageSize)

  const getSortIcon = (key: string) => {
    if (sortKey !== key) return <ArrowUpDown className="h-4 w-4 ml-1" />
    return sortDirection === "asc"
      ? <ChevronUp className="h-4 w-4 ml-1" />
      : <ChevronDown className="h-4 w-4 ml-1" />
  }

  return (
    <div className="rounded-xl border bg-card shadow-md overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Últimas Ventas</h2>
        <p className="text-sm text-muted-foreground">Ventas más recientes registradas</p>
      </div>
      <div className="w-full overflow-x-auto">
        <Table className="w-full text-sm">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[70px]">ID</TableHead>
              <TableHead className="hidden sm:table-cell w-[100px]">Vendedor</TableHead>
              <TableHead className="hidden sm:table-cell w-[100px]">Tienda</TableHead>
              <TableHead className="hidden sm:table-cell w-[100px]">Cliente</TableHead>
              <TableHead className="hidden md:table-cell w-[130px]">Comprobante</TableHead>
              <TableHead className="w-[90px]">Total</TableHead>
              <TableHead className="w-[150px]">Fecha</TableHead>
              <TableHead className="hidden md:table-cell w-[200px]">Productos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedSales.map((sale) => (
              <TableRow
                key={sale.id}
                className="hover:bg-muted transition cursor-pointer"
                onClick={() => setSelectedSale(sale)}
              >
                <TableCell className="font-semibold">{sale.id}</TableCell>
                <TableCell className="hidden sm:table-cell truncate">
                  {sale.source === "WEB" ? "Venta Online" : sale.user}
                </TableCell>
                <TableCell className="hidden sm:table-cell truncate">{sale.store}</TableCell>
                <TableCell className="hidden sm:table-cell truncate">{sale.client}</TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {sale.invoice ? (
                    <>
                      <span className="font-medium block truncate">{sale.invoice.tipoComprobante}</span>
                      <span className="block">{sale.invoice.serie}-{sale.invoice.nroCorrelativo}</span>
                    </>
                  ) : (
                    <span className="italic">Sin comprobante</span>
                  )}
                </TableCell>
                <TableCell className="text-green-600 font-medium whitespace-nowrap">
                  S/ {sale.total.toFixed(2)}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {new Date(sale.createdAt).toLocaleString("es-PE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex flex-wrap gap-1 max-w-full">
                    {sale.products.map((p: any, i: number) => (
                      <Badge
                        key={i}
                        className="flex flex-col items-start gap-0 text-xs font-normal max-w-[160px] whitespace-normal"
                        variant="secondary"
                      >
                        <span className="truncate w-full">{p.name} - {p.quantity}</span>
                        {Array.isArray(p.series) && p.series.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            Serie{p.series.length > 1 ? "s" : ""}: {p.series.join(", ")}
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

        <div className="py-2">
          <SimplePagination
            page={page}
            pageSize={pageSize}
            totalItems={sortedSales.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>

      <SaleDetailModal sale={selectedSale} open={!!selectedSale} onClose={() => setSelectedSale(null)} />
      </div>
  )
}
