// components/entries/SelectedProductsTable.tsx

"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronsUpDown, X } from "lucide-react"
import { EditSeriesModal } from "../EditSeriesModal"
import { useState } from "react"
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

  return (
    <div className='border px-2 overflow-x-auto max-w-full'>
      <Table className={cn("w-full text-sm table-auto sm:table-fixed")}>
        <TableHeader>
          <TableRow>
            {/* Nombre: Compacto, pero siempre visible. Con truncate es clave. */}
            <TableHead className="text-left max-sm:w-[45%] sm:w-[150px] md:w-[200px] lg:w-[250px] truncate py-2">
              <button
                type="button"
                onClick={() => sortProducts("name")}
                className="flex items-center gap-1"
              >
                Nombre
                {renderSortIcon("name")}
              </button>
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
            <TableHead className="text-left max-sm:w-[18%] sm:w-[100px] md:w-[110px] py-2">
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
            <TableHead className="text-left max-sm:w-[18%] sm:w-[110px] md:w-[120px] py-2">
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
            <TableHead className="text-left max-sm:w-[19%] sm:w-[110px] md:w-[120px] py-2">
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
            <TableHead className="text-left w-[50px] sm:w-[60px] py-1.5 sm:py-2">Acc.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {selectedProducts.map((product, index) => (
            <TableRow
              key={product.id}
              onClick={() => window.innerWidth < 640 && setActiveProductIndex(index)} // abre el modal
              className="cursor-pointer sm:cursor-default"
            >
              <TableCell
                className={cn(
                  "max-sm:w-[45%] sm:w-[150px] md:w-[200px] lg:w-[250px] truncate overflow-hidden whitespace-nowrap text-sm py-2"
                )}
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
              <TableCell
                className={cn(
                  "max-sm:w-[18%] sm:w-[100px] md:w-[110px] truncate overflow-hidden whitespace-nowrap text-sm py-2"
                )}
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
                          i === index ? { ...p, quantity: updatedQuantity } : p
                        )
                      )
                    }
                  }}
                  className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                  title="Cantidad de unidades para este producto"
                />
              </TableCell>
              <TableCell
                className={cn(
                  "max-sm:w-[18%] sm:w-[110px] md:w-[120px] truncate overflow-hidden whitespace-nowrap text-sm py-2"
                )}
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
                          i === index ? { ...p, price: updatedPrice } : p
                        )
                      )
                    }
                  }}
                  className="w-full h-8 sm:h-9 text-xs sm:text-sm"
                  title="Precio de compra unitario editable"
                />
              </TableCell>
              <TableCell
                className={cn(
                  "w-[90px] sm:w-[110px] md:w-[120px] truncate overflow-hidden whitespace-nowrap text-xs sm:text-sm py-1.5 sm:py-2"
                )}
              >
                {(Number(product.quantity) * Number(product.price || 0)).toFixed(2)}
              </TableCell>
              <TableCell
                className={cn(
                  "max-sm:w-[19%] sm:w-[110px] md:w-[120px] truncate overflow-hidden whitespace-nowrap text-sm py-2"
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
              <TableCell
                className={cn(
                  "w-[50px] sm:w-[60px] truncate overflow-hidden whitespace-nowrap py-1.5 sm:py-2",
                )}
              >
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation(); // 👈 Evita que el click llegue al TableRow
                    removeProduct(product.id);
                  }}
                  title="Elimina este producto del ingreso"
                  className="h-8 sm:h-9 px-2"
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