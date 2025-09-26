// components/entries/SelectedProductsTable.tsx

"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, X } from "lucide-react"
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

export const SelectedProductsTable = ({
  selectedProducts,
  setSelectedProducts,
  openSeriesModal,
  setOpenSeriesModal,
  getAllSeriesFromDataTable,
  removeProduct,
  categories,
}: Props) => {

  const [activeProduct, setActiveProduct] = useState<Product | null>(null)
  const [categoryPopoverIndex, setCategoryPopoverIndex] = useState<number | null>(null)

  return (
    <div className='border px-2 overflow-x-auto max-w-full'>
      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="text-left w-[100px] sm:w-[300px] max-w-[400px] truncate">Nombre</TableHead>
            <TableHead className="text-left max-w-[150px] truncate hidden sm:table-cell">Categoria</TableHead>
            <TableHead className="text-left max-w-[150px] truncate">Cantidad</TableHead>
            <TableHead className="text-left max-w-[150px] truncate">Precio Compra</TableHead>
            <TableHead className="text-left max-w-[150px] truncate">Precio Compra Total</TableHead>
            <TableHead className="text-left max-w-[150px] truncate hidden sm:table-cell">Precio Venta</TableHead>
            <TableHead className="text-left max-w-[150px] truncate hidden sm:table-cell">Series</TableHead>
            <TableHead className="text-left max-w-[150px] truncate">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {selectedProducts.map((product, index) => (
            <TableRow 
              key={product.id}
              onClick={() => window.innerWidth < 640 && setActiveProduct(product)} // abre el modal
              className="cursor-pointer sm:cursor-default"
            >
              <TableCell className="w-[100px] sm:w-[300px] max-w-[400px] truncate overflow-hidden whitespace-nowrap">{product.name}</TableCell>
              <TableCell className="max-w-[150px] truncate overflow-hidden whitespace-nowrap hidden sm:table-cell">
                <Popover
                  open={categoryPopoverIndex === index}
                  onOpenChange={(open) => setCategoryPopoverIndex(open ? index : null)}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
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
              <TableCell className="max-w-[100px] truncate overflow-hidden whitespace-nowrap">
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
                />
              </TableCell>
              <TableCell className="max-w-[100px] truncate overflow-hidden whitespace-nowrap">
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
                />
              </TableCell>
              <TableCell className="max-w-[120px] truncate overflow-hidden whitespace-nowrap">
                {(Number(product.quantity) * Number(product.price || 0)).toFixed(2)}
              </TableCell>
              <TableCell className="max-w-[100px] truncate overflow-hidden whitespace-nowrap hidden sm:table-cell">
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
                />
              </TableCell>
              <TableCell className="text-xs max-w-[250px] truncate overflow-hidden whitespace-nowrap hidden sm:table-cell">
                <div
                  className="cursor-pointer text-blue-500 underline"
                  onClick={() => setOpenSeriesModal(index)}
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
              <TableCell className="max-w-[100px] truncate overflow-hidden whitespace-nowrap">
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation(); // 👈 Evita que el click llegue al TableRow
                    removeProduct(product.id);
                  }}
                >
                  <X className="w-4 h-4" color="red" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <MobileProductModal product={activeProduct} onClose={() => setActiveProduct(null)} />
    </div>
  )
}