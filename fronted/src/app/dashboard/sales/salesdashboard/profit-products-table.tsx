"use client"

import { useEffect, useMemo, useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DateRange } from "react-day-picker"
import { useTenantSelection } from "@/context/tenant-selection-context"
import { getProductsProfitByRange } from "../sales.api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/app/hooks/useDebounce"

interface Props {
  dateRange: DateRange
}

interface ProductProfit {
  productId: number
  sku?: string | null
  name: string
  soldQty: number
  salePriceAvg: number
  purchasePriceAvg: number | null
  revenue: number
  cost: number
  profit: number
}

export function ProfitProductsTable({ dateRange }: Props) {
  const [searchTerm, setSearchTerm] = useState("")
  const query = useDebounce(searchTerm, 300)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [data, setData] = useState<ProductProfit[]>([])
  const [total, setTotal] = useState(0)
  const { selection, version } = useTenantSelection()

  const selectionKey = useMemo(
    () => `${selection.orgId ?? "none"}-${selection.companyId ?? "none"}-${version}`,
    [selection.orgId, selection.companyId, version],
  )

  

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!dateRange?.from || !dateRange?.to) {
          setData([])
          setTotal(0)
          return
        }
        const from = dateRange.from.toISOString()
        const to = dateRange.to.toISOString()
        const res = await getProductsProfitByRange(from, to, query || undefined, page, pageSize)
        setData(res.items || [])
        setTotal(res.total || 0)
      } catch (error) {
        console.error("Error al obtener utilidades por producto:", error)
      }
    }
    fetchData()
  }, [dateRange, selectionKey, query, page, pageSize])

  return (
    <div className="rounded-xl border bg-card shadow-md overflow-hidden">
      <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">Utilidades por Producto</h2>
          <p className="text-sm text-muted-foreground">Compara precio de compra vs venta y calcula utilidad</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Input
            className="w-full sm:w-52"
            placeholder="Buscar producto, SKU..."
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Button variant="outline" size="sm" className="flex-shrink-0">Exportar</Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table className="w-full text-sm">
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="min-w-[200px]">Producto</TableHead>
              <TableHead className="text-right whitespace-nowrap">Unidades</TableHead>
              <TableHead className="text-right whitespace-nowrap">P. compra</TableHead>
              <TableHead className="text-right whitespace-nowrap">P. venta</TableHead>
              <TableHead className="text-right whitespace-nowrap">Ingresos</TableHead>
              <TableHead className="text-right whitespace-nowrap">Costo</TableHead>
              <TableHead className="text-right whitespace-nowrap">Utilidad</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((p) => (
              <TableRow key={p.productId} className="hover:bg-muted/50 border-b transition-colors">
                <TableCell className="font-medium">{p.name}{p.sku ? ` • ${p.sku}` : ""}</TableCell>
                <TableCell className="text-right">{p.soldQty}</TableCell>
                <TableCell className="text-right">{p.purchasePriceAvg != null ? `S/ ${p.purchasePriceAvg.toFixed(2)}` : "-"}</TableCell>
                <TableCell className="text-right">S/ {p.salePriceAvg.toFixed(2)}</TableCell>
                <TableCell className="text-right">S/ {p.revenue.toFixed(2)}</TableCell>
                <TableCell className="text-right">S/ {p.cost.toFixed(2)}</TableCell>
                <TableCell className={`text-right font-semibold ${p.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                  S/ {p.profit.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="p-3 flex items-center justify-between text-sm text-muted-foreground">
        <div>{`Mostrando ${data.length} de ${total} productos`}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
          <div>#{page}</div>
          <Button size="sm" variant="ghost" onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
        </div>
      </div>
    </div>
  )
}