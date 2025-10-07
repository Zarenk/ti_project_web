// components/entries/SelectedProductsTable.tsx

"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ArrowDown, ArrowUp, Check, ChevronsUpDown, X } from "lucide-react"
import { EditSeriesModal } from "../EditSeriesModal"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import { MobileProductModal } from "../MobileProductModal"
import { cn } from "@/lib/utils"

interface Product {
  id: number
  name: string
  price: number
  priceSell: number
  quantity: number
  category_name: string
  series?: string[]
}

interface Props {
  selectedProducts: Product[]
  setSelectedProducts: React.Dispatch<React.SetStateAction<Product[]>>
  openSeriesModal: number | null
  setOpenSeriesModal: React.Dispatch<React.SetStateAction<number | null>>
  getAllSeriesFromDataTable: () => string[]
  removeProduct: (id: number) => void
  categories: { id: number; name: string }[]
}

export const SelectedProductsTable = ({
  selectedProducts,
  setSelectedProducts,
  openSeriesModal,
  setOpenSeriesModal,
  getAllSeriesFromDataTable,
  removeProduct,
  categories,
}: Props) => {

  const [activeProductIndex, setActiveProductIndex] = useState<number | null>(null)
  const [categoryPopoverIndex, setCategoryPopoverIndex] = useState<number | null>(null)

  type ColumnKey =
    | "name"
    | "category"
    | "quantity"
    | "price"
    | "total"
    | "priceSell"
    | "series"
    | "actions"

  interface ColumnConfig {
    key: ColumnKey
    label: string
    minWidth: number
    defaultWidth: number
    sortable?: boolean
    headerClassName?: string
    cellClassName?: string
  }

  const columnConfigs = useMemo<ColumnConfig[]>(
    () => [
      {
        key: "name",
        label: "Nombre",
        minWidth: 220,
        defaultWidth: 300,
      },
      {
        key: "category",
        label: "Categoria",
        minWidth: 160,
        defaultWidth: 200,
        headerClassName: "hidden sm:table-cell",
        cellClassName: "hidden sm:table-cell",
      },
      {
        key: "quantity",
        label: "Cantidad",
        minWidth: 130,
        defaultWidth: 150,
      },
      {
        key: "price",
        label: "Precio Compra",
        minWidth: 160,
        defaultWidth: 180,
      },
      {
        key: "total",
        label: "Precio Compra Total",
        minWidth: 180,
        defaultWidth: 200,
      },
      {
        key: "priceSell",
        label: "Precio Venta",
        minWidth: 160,
        defaultWidth: 180,
        headerClassName: "hidden sm:table-cell",
        cellClassName: "hidden sm:table-cell",
      },
      {
        key: "series",
        label: "Series",
        minWidth: 200,
        defaultWidth: 240,
        headerClassName: "hidden sm:table-cell",
        cellClassName: "hidden sm:table-cell",
      },
      {
        key: "actions",
        label: "Acciones",
        minWidth: 140,
        defaultWidth: 160,
        sortable: false,
      },
    ],
    [],
  )

  const configByKey = useMemo(
    () =>
      columnConfigs.reduce<Record<ColumnKey, ColumnConfig>>((acc, column) => {
        acc[column.key] = column
        return acc
      }, {} as Record<ColumnKey, ColumnConfig>),
    [columnConfigs],
  )

  const initialWidths = useMemo(
    () =>
      columnConfigs.reduce<Record<ColumnKey, number>>((acc, column) => {
        acc[column.key] = column.defaultWidth
        return acc
      }, {} as Record<ColumnKey, number>),
    [columnConfigs],
  )

  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>(initialWidths)
  const [resizingState, setResizingState] = useState<{
    key: ColumnKey
    startX: number
    startWidth: number
    minWidth: number
  } | null>(null)

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!resizingState) return

      const delta = event.clientX - resizingState.startX
      const nextWidth = Math.max(resizingState.minWidth, resizingState.startWidth + delta)

      setColumnWidths((prev) => ({
        ...prev,
        [resizingState.key]: nextWidth,
      }))
    }

    const handleMouseUp = () => {
      setResizingState(null)
    }

    if (resizingState) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [resizingState])

  const startResizing = (event: ReactMouseEvent<HTMLSpanElement>, column: ColumnConfig) => {
    event.preventDefault()
    event.stopPropagation()

    setResizingState({
      key: column.key,
      startX: event.clientX,
      startWidth: columnWidths[column.key],
      minWidth: column.minWidth,
    })
  }

  const [sortConfig, setSortConfig] = useState<{ key: ColumnKey; direction: "asc" | "desc" } | null>(null)

  const handleSort = (key: ColumnKey) => {
    setSortConfig((previous) => {
      if (previous?.key === key) {
        return {
          key,
          direction: previous.direction === "asc" ? "desc" : "asc",
        }
    }

  return { key, direction: "asc" }
    })
  }

  const getSortableValue = useCallback((product: Product, key: ColumnKey) => {
    switch (key) {
      case "name":
        return product.name.toLowerCase()
      case "category":
        return (product.category_name || "").toLowerCase()
      case "quantity":
        return product.quantity
      case "price":
        return product.price
      case "total":
        return Number(product.quantity) * Number(product.price || 0)
      case "priceSell":
        return product.priceSell ?? 0
      case "series":
        return product.series?.join(", ")?.toLowerCase() ?? ""
      default:
        return ""
    }
  }, [])

  const sortedProducts = useMemo(() => {
    const items = selectedProducts.map((product, originalIndex) => ({
      product,
      originalIndex,
    }))

    if (!sortConfig || sortConfig.key === "actions") {
      return items
    }

    return [...items].sort((a, b) => {
      const valueA = getSortableValue(a.product, sortConfig.key)
      const valueB = getSortableValue(b.product, sortConfig.key)

      if (valueA < valueB) {
        return sortConfig.direction === "asc" ? -1 : 1
      }

      if (valueA > valueB) {
        return sortConfig.direction === "asc" ? 1 : -1
      }

      return 0
    })
  }, [getSortableValue, selectedProducts, sortConfig])

  const getSortIndicator = (key: ColumnKey) => {
    if (sortConfig?.key !== key) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
    }

    return sortConfig.direction === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    )
  }

  const activeProduct = activeProductIndex !== null ? selectedProducts[activeProductIndex] ?? null : null

  return (
    <div className='border px-2 overflow-x-auto max-w-full'>
      <Table className="w-full min-w-max text-sm">
        <TableHeader>
          <TableRow>
            {columnConfigs.map((column) => (
              <TableHead
                key={column.key}
                className={cn(
                  "relative select-none px-2 py-2 text-left align-middle font-semibold",
                  column.headerClassName,
                  column.sortable !== false && "cursor-pointer",
                )}
                style={{
                  width: columnWidths[column.key],
                  minWidth: column.minWidth,
                }}
                onClick={() => column.sortable !== false && handleSort(column.key)}
              >
                <div className="flex items-center gap-2">
                  <span>{column.label}</span>
                  {column.sortable !== false && (
                    <span>{getSortIndicator(column.key)}</span>
                  )}
                </div>
                <span
                  className="absolute right-0 top-1/2 h-6 w-1 -translate-y-1/2 cursor-col-resize bg-transparent"
                  onMouseDown={(event) => startResizing(event, column)}
                />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedProducts.map(({ product, originalIndex }) => (
            <TableRow
              key={product.id}
              onClick={() => window.innerWidth < 640 && setActiveProductIndex(originalIndex)} // abre el modal
              className={cn("cursor-pointer sm:cursor-default")}
            >
              <TableCell
                className={cn("px-2 py-2 align-middle")}
                style={{ width: columnWidths.name, minWidth: configByKey.name.minWidth }}
              >
                {product.name}
              </TableCell>
              <TableCell
                className={cn("px-2 py-2 align-middle", configByKey.category.cellClassName)}
                style={{ width: columnWidths.category, minWidth: configByKey.category.minWidth }}
              >
                <Popover
                  open={categoryPopoverIndex === originalIndex}
                  onOpenChange={(open) => setCategoryPopoverIndex(open ? originalIndex : null)}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      title="Cambia la categoría para este producto específico"
                    >
                      {product.category_name || "Sin categoría"}
                      <ChevronsUpDown className="opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar categoría..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron categorías.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="Sin categoría"
                            onSelect={() => {
                              setSelectedProducts((prev) =>
                                prev.map((p, i) =>
                                  i === originalIndex ? { ...p, category_name: "" } : p
                                )
                              )
                              setCategoryPopoverIndex(null)
                            }}
                          >
                            Sin categoría
                            <Check
                              className={cn(
                                "ml-auto",
                                !product.category_name ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                          {categories.map((category) => (
                            <CommandItem
                              key={category.id}
                              value={category.name}
                              onSelect={() => {
                                setSelectedProducts((prev) =>
                                  prev.map((p, i) =>
                                    i === originalIndex
                                      ? { ...p, category_name: category.name }
                                      : p
                                  )
                                )
                                setCategoryPopoverIndex(null)
                              }}
                            >
                              {category.name}
                              <Check
                                className={cn(
                                  "ml-auto",
                                  product.category_name === category.name
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </TableCell>
              <TableCell
                className="px-2 py-2 align-middle"
                style={{ width: columnWidths.quantity, minWidth: configByKey.quantity.minWidth }}
              >
                <Input
                  type="number"
                  value={product.quantity}
                  min={1}
                  onChange={(e) => {
                    const updatedQuantity = parseInt(e.target.value, 10)
                    if (updatedQuantity > 0) {
                      setSelectedProducts((prev) =>
                        prev.map((p, i) =>
                          i === originalIndex ? { ...p, quantity: updatedQuantity } : p
                        )
                      )
                    }
                  }}
                  className="w-full"
                  title="Cantidad de unidades para este producto"
                />
              </TableCell>
              <TableCell
                className="px-2 py-2 align-middle"
                style={{ width: columnWidths.price, minWidth: configByKey.price.minWidth }}
              >
                <Input
                  type="number"
                  value={product.price}
                  min={0}
                  step="0.01"
                  onChange={(e) => {
                    const updatedPrice = parseFloat(e.target.value)
                    if (updatedPrice >= 0) {
                      setSelectedProducts((prev) =>
                        prev.map((p, i) =>
                          i === originalIndex ? { ...p, price: updatedPrice } : p
                        )
                      )
                    }
                  }}
                  className="w-full"
                  title="Precio de compra unitario editable"
                />
              </TableCell>
              <TableCell
                className="px-2 py-2 align-middle"
                style={{ width: columnWidths.total, minWidth: configByKey.total.minWidth }}
              >
                {(Number(product.quantity) * Number(product.price || 0)).toFixed(2)}
              </TableCell>
              <TableCell
                className={cn("px-2 py-2 align-middle", configByKey.priceSell.cellClassName)}
                style={{ width: columnWidths.priceSell, minWidth: configByKey.priceSell.minWidth }}
              >
                <Input
                  type="number"
                  value={product.priceSell ?? ""}
                  min={0}
                  step="0.01"
                  onChange={(e) => {
                    const updatedPriceSell = parseFloat(e.target.value)
                    if (updatedPriceSell >= 0) {
                      setSelectedProducts((prev) =>
                        prev.map((p, i) =>
                          i === originalIndex ? { ...p, priceSell: updatedPriceSell } : p
                        )
                      )
                    }
                  }}
                  className="w-full"
                  title="Precio de venta sugerido para este producto"
                />
              </TableCell>
              <TableCell
                className={cn("px-2 py-2 align-middle text-sm", configByKey.series.cellClassName)}
                style={{ width: columnWidths.series, minWidth: configByKey.series.minWidth }}
              >
                <div
                  className="cursor-pointer text-blue-500 underline"
                  onClick={() => setOpenSeriesModal(originalIndex)}
                  title="Visualiza o edita las series asociadas al producto"
                >
                  {product.series && product.series.length > 0
                    ? `${product.series.length} series`
                    : "Sin series"}
                </div>
              </TableCell>
              {openSeriesModal !== null && (
                <EditSeriesModal
                  isOpen={openSeriesModal !== null}
                  onClose={() => setOpenSeriesModal(null)}
                  series={selectedProducts[openSeriesModal].series || []}
                  setSeries={(updatedSeries) => {
                    setSelectedProducts((prev) =>
                      prev.map((product, i) =>
                        i === openSeriesModal
                          ? { ...product, series: updatedSeries }
                          : product
                      )
                    )
                  }}
                  quantity={selectedProducts[openSeriesModal].quantity}
                  getAllSeriesFromDataTable={getAllSeriesFromDataTable}
                />
              )}
              <TableCell
                className="px-2 py-2 align-middle"
                style={{ width: columnWidths.actions, minWidth: configByKey.actions.minWidth }}
              >
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation(); // 👈 Evita que el click llegue al TableRow
                    removeProduct(product.id);
                  }}
                  title="Elimina este producto del ingreso"
                >
                  <X className="w-4 h-4" color="red" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <MobileProductModal
        product={activeProduct}
        categories={categories}
        onClose={() => setActiveProductIndex(null)}
        onUpdate={(updates) => {
          if (activeProductIndex === null) return
          setSelectedProducts((prev) =>
            prev.map((p, i) => (i === activeProductIndex ? { ...p, ...updates } : p)),
          )
        }}
        onRemove={() => {
          if (activeProductIndex === null) return
          removeProduct(selectedProducts[activeProductIndex].id)
          setActiveProductIndex(null)
        }}
        onManageSeries={() => {
          if (activeProductIndex === null) return
          setOpenSeriesModal(activeProductIndex)
          setActiveProductIndex(null)
        }}
      />
    </div>
  )
}