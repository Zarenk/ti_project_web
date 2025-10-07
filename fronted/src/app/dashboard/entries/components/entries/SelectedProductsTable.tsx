// components/entries/SelectedProductsTable.tsx

"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { EditSeriesModal } from "../EditSeriesModal"
import { useMemo, useState } from "react"
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
  const [tableScale, setTableScale] = useState<"compact" | "comfortable" | "spacious">("comfortable")

  const sizeClasses = useMemo(() => {
    switch (tableScale) {
      case "compact":
        return {
          text: "text-xs",
          padding: "py-1",
          header: "text-xs",
        }
      case "spacious":
        return {
          text: "text-base",
          padding: "py-3",
          header: "text-base",
        }
      default:
        return {
          text: "text-sm",
          padding: "py-2",
          header: "text-sm",
        }
    }
  }, [tableScale])

  const handleIncreaseScale = () => {
    setTableScale((current) => {
      if (current === "compact") return "comfortable"
      if (current === "comfortable") return "spacious"
      return current
    })
  }

  const handleDecreaseScale = () => {
    setTableScale((current) => {
      if (current === "spacious") return "comfortable"
      if (current === "comfortable") return "compact"
      return current
    })
  }

  const activeProduct = activeProductIndex !== null ? selectedProducts[activeProductIndex] ?? null : null

  return (
    <div className='border px-2 overflow-x-auto max-w-full'>
      <div className="hidden sm:flex items-center justify-end gap-2 py-2">
        <span className="text-sm text-muted-foreground">Tamaño de encabezado</span>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            onClick={handleDecreaseScale}
            disabled={tableScale === "compact"}
            aria-label="Disminuir tamaño de encabezado"
          >
            A-
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleIncreaseScale}
            disabled={tableScale === "spacious"}
            aria-label="Aumentar tamaño de encabezado"
          >
            A+
          </Button>
        </div>
      </div>
      <Table className={cn("table-fixed w-full", sizeClasses.text)}>
        <TableHeader>
          <TableRow>
            <TableHead
              className={cn(
                "text-left w-[100px] sm:w-[300px] max-w-[400px] truncate",
                sizeClasses.header,
                sizeClasses.padding,
              )}
            >
              Nombre
            </TableHead>
            <TableHead
              className={cn(
                "text-left max-w-[150px] truncate hidden sm:table-cell",
                sizeClasses.header,
                sizeClasses.padding,
              )}
            >
              Categoria
            </TableHead>
            <TableHead
              className={cn(
                "text-left max-w-[150px] truncate",
                sizeClasses.header,
                sizeClasses.padding,
              )}
            >
              Cantidad
            </TableHead>
            <TableHead
              className={cn(
                "text-left max-w-[150px] truncate",
                sizeClasses.header,
                sizeClasses.padding,
              )}
            >
              Precio Compra
            </TableHead>
            <TableHead
              className={cn(
                "text-left max-w-[150px] truncate",
                sizeClasses.header,
                sizeClasses.padding,
              )}
            >
              Precio Compra Total
            </TableHead>
            <TableHead
              className={cn(
                "text-left max-w-[150px] truncate hidden sm:table-cell",
                sizeClasses.header,
                sizeClasses.padding,
              )}
            >
              Precio Venta
            </TableHead>
            <TableHead
              className={cn(
                "text-left max-w-[150px] truncate hidden sm:table-cell",
                sizeClasses.header,
                sizeClasses.padding,
              )}
            >
              Series
            </TableHead>
            <TableHead
              className={cn(
                "text-left max-w-[150px] truncate",
                sizeClasses.header,
                sizeClasses.padding,
              )}
            >
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {selectedProducts.map((product, index) => (
            <TableRow
              key={product.id}
              onClick={() => window.innerWidth < 640 && setActiveProductIndex(index)} // abre el modal
              className={cn("cursor-pointer sm:cursor-default", sizeClasses.padding)}
            >
              <TableCell
                className={cn(
                  "w-[100px] sm:w-[300px] max-w-[400px] truncate overflow-hidden whitespace-nowrap",
                  sizeClasses.text,
                  sizeClasses.padding,
                )}
              >
                {product.name}
              </TableCell>
              <TableCell
                className={cn(
                  "max-w-[150px] truncate overflow-hidden whitespace-nowrap hidden sm:table-cell",
                  sizeClasses.text,
                  sizeClasses.padding,
                )}
              >
                <Popover
                  open={categoryPopoverIndex === index}
                  onOpenChange={(open) => setCategoryPopoverIndex(open ? index : null)}
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
                  "max-w-[100px] truncate overflow-hidden whitespace-nowrap",
                  sizeClasses.text,
                  sizeClasses.padding,
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
                  className="w-full"
                  title="Cantidad de unidades para este producto"
                />
              </TableCell>
              <TableCell
                className={cn(
                  "max-w-[100px] truncate overflow-hidden whitespace-nowrap",
                  sizeClasses.text,
                  sizeClasses.padding,
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
                  className="w-full"
                  title="Precio de compra unitario editable"
                />
              </TableCell>
              <TableCell
                className={cn(
                  "max-w-[120px] truncate overflow-hidden whitespace-nowrap",
                  sizeClasses.text,
                  sizeClasses.padding,
                )}
              >
                {(Number(product.quantity) * Number(product.price || 0)).toFixed(2)}
              </TableCell>
              <TableCell
                className={cn(
                  "max-w-[100px] truncate overflow-hidden whitespace-nowrap hidden sm:table-cell",
                  sizeClasses.text,
                  sizeClasses.padding,
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
                  className="w-full"
                  title="Precio de venta sugerido para este producto"
                />
              </TableCell>
              <TableCell
                className={cn(
                  "text-xs max-w-[250px] truncate overflow-hidden whitespace-nowrap hidden sm:table-cell",
                  sizeClasses.text,
                  sizeClasses.padding,
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
                  "max-w-[100px] truncate overflow-hidden whitespace-nowrap",
                  sizeClasses.text,
                  sizeClasses.padding,
                )}
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