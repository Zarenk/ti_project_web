// components/entries/SelectedProductsTable.tsx

"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronsUpDown, X } from "lucide-react"
import { EditSeriesModal } from "../EditSeriesModal"
import { useState, type MouseEvent, useCallback, useEffect, useMemo, useRef } from "react"
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

type SortKey =
  | "name"
  | "category_name"
  | "quantity"
  | "price"
  | "priceSell"
  | "totalPurchase"
  | "series"

interface SortConfig {
  key: SortKey
  direction: "asc" | "desc"
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

  const NAME_COLUMN_MIN_WIDTH = 120
  const NAME_COLUMN_MAX_WIDTH = 420
  const [nameColumnWidth, setNameColumnWidth] = useState<number>(140)
  const tableContainerRef = useRef<HTMLDivElement | null>(null)
  const nameColumnResizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const nameColumnDraftWidthRef = useRef<number>(nameColumnWidth)

  useEffect(() => {
    nameColumnDraftWidthRef.current = nameColumnWidth
    if (tableContainerRef.current) {
      tableContainerRef.current.style.setProperty('--entry-name-column-width', `${nameColumnWidth}px`)
    }
  }, [nameColumnWidth])

  const handleNameColumnMouseMove = useCallback((event: globalThis.MouseEvent) => {
    if (!nameColumnResizeStateRef.current) return
    const delta = event.clientX - nameColumnResizeStateRef.current.startX
    const nextWidth = Math.min(
      NAME_COLUMN_MAX_WIDTH,
      Math.max(NAME_COLUMN_MIN_WIDTH, nameColumnResizeStateRef.current.startWidth + delta),
    )
    nameColumnDraftWidthRef.current = nextWidth
    tableContainerRef.current?.style.setProperty('--entry-name-column-width', `${nextWidth}px`)
  }, [])

  const stopNameColumnResize = useCallback(() => {
    if (!nameColumnResizeStateRef.current) return
    nameColumnResizeStateRef.current = null
    document.body.style.cursor = ''
    document.removeEventListener('mousemove', handleNameColumnMouseMove)
    document.removeEventListener('mouseup', stopNameColumnResize)
    setNameColumnWidth(nameColumnDraftWidthRef.current)
  }, [handleNameColumnMouseMove])

  const startNameColumnResize = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      nameColumnResizeStateRef.current = {
        startX: event.clientX,
        startWidth: nameColumnDraftWidthRef.current,
      }
      document.body.style.cursor = 'col-resize'
      document.addEventListener('mousemove', handleNameColumnMouseMove)
      document.addEventListener('mouseup', stopNameColumnResize)
    },
    [handleNameColumnMouseMove, stopNameColumnResize],
  )

  useEffect(() => {
    return () => {
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', handleNameColumnMouseMove)
      document.removeEventListener('mouseup', stopNameColumnResize)
      nameColumnResizeStateRef.current = null
    }
  }, [handleNameColumnMouseMove, stopNameColumnResize])

  const nameColumnWidthStyle = useMemo(
    () => ({
      width: `var(--entry-name-column-width, ${nameColumnWidth}px)`,
      maxWidth: `var(--entry-name-column-width, ${nameColumnWidth}px)`,
    }),
    [nameColumnWidth],
  )

  const [activeProductIndex, setActiveProductIndex] = useState<number | null>(null)
  const [categoryPopoverIndex, setCategoryPopoverIndex] = useState<number | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)

  const getComparableValue = (product: Product, key: SortKey): string | number => {
    switch (key) {
      case "name":
        return product.name
      case "category_name":
        return product.category_name || ""
      case "quantity":
        return product.quantity
      case "price":
        return product.price
      case "priceSell":
        return product.priceSell ?? 0
      case "series":
        return product.series?.length ?? 0
      case "totalPurchase":
        return Number(product.quantity) * Number(product.price || 0)
      default:
        return ""
    }
  }

  const sortProducts = (key: SortKey) => {
    const direction: "asc" | "desc" =
      sortConfig?.key === key && sortConfig.direction === "asc" ? "desc" : "asc"

    setActiveProductIndex(null)
    setOpenSeriesModal(null)

    setSelectedProducts((prev) => {
      const sorted = [...prev].sort((a, b) => {
        const valueA = getComparableValue(a, key)
        const valueB = getComparableValue(b, key)

        if (typeof valueA === "number" && typeof valueB === "number") {
          return direction === "asc" ? valueA - valueB : valueB - valueA
        }

        return direction === "asc"
          ? String(valueA).localeCompare(String(valueB), undefined, { sensitivity: "base" })
          : String(valueB).localeCompare(String(a), undefined, { sensitivity: "base" })
      })

      return sorted
    })
    setSortConfig({ key, direction })
  }

  const renderSortIcon = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />
    }

    return sortConfig.direction === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    )
  }

  const activeProduct = activeProductIndex !== null ? selectedProducts[activeProductIndex] ?? null : null

  const openProductDetails = (index: number) => {
    setCategoryPopoverIndex(null)
    setActiveProductIndex(index)
  }

  const handleRowDoubleClick = (
    event: MouseEvent<HTMLTableRowElement>,
    index: number,
  ) => {
    const target = event.target as Element | null
    if (
      target?.closest(
        "button, input, select, textarea, a[href], [role='button'], [contenteditable='true']",
      )
    ) {
      return
    }
    openProductDetails(index)
  }

  return (
    <div ref={tableContainerRef} className='border px-1 sm:px-2 overflow-x-auto max-w-full'>
      <Table className={cn("w-full min-w-[340px] sm:min-w-[640px] text-[11px] sm:text-xs table-auto")}>
        <TableHeader>
          <TableRow>
            {/* Nombre: Compacto, pero siempre visible. Con truncate es clave. */}
            <TableHead className="relative text-left truncate py-1.5 sm:py-2" style={nameColumnWidthStyle}>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => sortProducts("name")}
                  className="flex flex-1 items-center gap-1 truncate text-left"
                >
                  Nombre
                  {renderSortIcon("name")}
                </button>
                <span
                  role="separator"
                  aria-orientation="horizontal"
                  aria-label="Ajustar ancho de la columna Nombre"
                  className="ml-1 inline-flex h-4 w-1 cursor-col-resize select-none rounded bg-muted-foreground/50 transition-colors hover:bg-muted-foreground"
                  onMouseDown={startNameColumnResize}
                />
              </div>
            </TableHead>
            {/* Categoria: Oculta en XS, aparece en SM, con ancho reducido. */}
            <TableHead className="text-left w-[70px] sm:w-[110px] truncate hidden sm:table-cell py-1.5 sm:py-2">
              <button
                type="button"
                onClick={() => sortProducts("category_name")}
                className="flex items-center gap-1"
              >
                Cat.
                {renderSortIcon("category_name")}
              </button>
            </TableHead>
            {/* Cantidad: AMPLIFICADO, visible siempre. Ancho un poco más generoso. */}
            <TableHead className="text-left w-[70px] py-1.5 sm:py-2">
              <button
                type="button"
                onClick={() => sortProducts("quantity")}
                className="flex items-center gap-1"
              >
                Cant.
                {renderSortIcon("quantity")}
              </button>
            </TableHead>
            {/* Precio Compra: AMPLIFICADO, visible siempre. Ancho un poco más generoso. */}
            <TableHead className="text-left w-[85px] py-1.5 sm:py-2">
              <button
                type="button"
                onClick={() => sortProducts("price")}
                className="flex items-center gap-1"
              >
                P. Compra
                {renderSortIcon("price")}
              </button>
            </TableHead>
            {/* Precio Compra Total: Visible siempre, ancho para mostrar 2 decimales. */}
            <TableHead className="text-left w-[90px] py-1.5 sm:py-2 hidden md:table-cell">
              <button
                type="button"
                onClick={() => sortProducts("totalPurchase")}
                className="flex items-center gap-1"
              >
                Total C.
                {renderSortIcon("totalPurchase")}
              </button>
            </TableHead>
            {/* Precio Venta: Ahora oculto en SM, aparece en MD. Texto del encabezado más corto. */}
            <TableHead className="text-left w-[80px] md:w-[100px] hidden md:table-cell py-1.5 sm:py-2">
              <button
                type="button"
                onClick={() => sortProducts("priceSell")}
                className="flex items-center gap-1"
              >
                P. Venta
                {renderSortIcon("priceSell")}
              </button>
            </TableHead>
            {/* Series: Ahora oculto en MD, aparece en LG. Ancho reducido. */}
            <TableHead className="text-left w-[80px] lg:w-[100px] truncate hidden lg:table-cell py-1.5 sm:py-2">
              <button
                type="button"
                onClick={() => sortProducts("series")}
                className="flex items-center gap-1"
              >
                Series
                {renderSortIcon("series")}
              </button>
            </TableHead>
            {/* Acciones: Ancho fijo y mínimo */}
            <TableHead className="text-left w-[36px] py-1.5 sm:py-2">Acc.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {selectedProducts.map((product, index) => (
            <TableRow
              key={product.id}
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 640) {
                  openProductDetails(index)
                }
              }}
              onDoubleClick={(event) => handleRowDoubleClick(event, index)}
              className="cursor-pointer sm:cursor-default"
            >
              <TableCell
                className={cn("truncate overflow-hidden whitespace-nowrap text-[11px] sm:text-xs py-1.5 sm:py-2")}
                style={nameColumnWidthStyle}
                title={product.name}
              >
                {product.name}
              </TableCell>
              <TableCell
                className={cn(
                  "w-[70px] sm:w-[110px] truncate overflow-hidden whitespace-nowrap hidden sm:table-cell text-xs sm:text-sm py-1.5 sm:py-2"
                )}
              >
                <Popover
                  open={categoryPopoverIndex === index}
                  onOpenChange={(open) => setCategoryPopoverIndex(open ? index : null)}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between px-2 py-1 h-auto text-xs sm:text-sm"
                      title="Cambia la categoría para este producto específico"
                    >
                      {product.category_name || "Sin categoría"}
                      <ChevronsUpDown className="opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0 text-xs sm:text-sm">
                    <Command>
                      <CommandInput placeholder="Buscar categoría..." className="text-xs sm:text-sm" />
                      <CommandList>
                        <CommandEmpty>No se encontraron categorías.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="Sin categoría"
                            onSelect={() => {
                              setSelectedProducts((prev) =>
                                prev.map((p, i) =>
                                  i === index ? { ...p, category_name: "" } : p
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
                                    i === index
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
              <TableCell className={cn("w-[64px] truncate overflow-hidden whitespace-nowrap text-[11px] sm:text-xs py-1.5 sm:py-2")}>
                <Input
                  type="number"
                  value={product.quantity}
                  min={1}
                  onChange={(e) => {
                    const updatedQuantity = parseInt(e.target.value, 10)
                    if (updatedQuantity > 0) {
                      setSelectedProducts((prev) =>
                        prev.map((p, i) =>
                          i === index ? { ...p, quantity: updatedQuantity } : p
                        )
                      )
                    }
                  }}
                  className="w-full h-8 sm:h-9 text-[11px] sm:text-xs"
                  title="Cantidad de unidades para este producto"
                />
              </TableCell>
              <TableCell className={cn("w-[85px] truncate overflow-hidden whitespace-nowrap text-[11px] sm:text-xs py-1.5 sm:py-2")}>
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
                          i === index ? { ...p, price: updatedPrice } : p
                        )
                      )
                    }
                  }}
                  className="w-full h-8 sm:h-9 text-[11px] sm:text-xs"
                  title="Precio de compra unitario editable"
                />
              </TableCell>
              <TableCell className={cn("w-[90px] truncate overflow-hidden whitespace-nowrap text-[11px] sm:text-xs py-1.5 sm:py-2 hidden md:table-cell")}>
                {(Number(product.quantity) * Number(product.price || 0)).toFixed(2)}
              </TableCell>
              <TableCell
                className={cn(
                  "max-sm:w-[17%] sm:w-[95px] md:w-[105px] truncate overflow-hidden whitespace-nowrap text-sm py-2 hidden md:table-cell"
                )}
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
                          i === index ? { ...p, priceSell: updatedPriceSell } : p
                        )
                      )
                    }
                  }}
                  className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                  title="Precio de venta sugerido para este producto"
                />
              </TableCell>
              <TableCell
                className={cn(
                  "w-[80px] lg:w-[100px] truncate overflow-hidden whitespace-nowrap hidden lg:table-cell text-xs sm:text-sm",
                )}
              >
                <div
                  className="cursor-pointer text-blue-500 underline"
                  onClick={() => setOpenSeriesModal(index)}
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
              <TableCell className={cn("w-[32px] truncate overflow-hidden whitespace-nowrap py-1.5 sm:py-2")}>
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation(); // 👈 Evita que el click llegue al TableRow
                    removeProduct(product.id);
                  }}
                  title="Elimina este producto del ingreso"
                  className="h-8 sm:h-9 px-1"
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
