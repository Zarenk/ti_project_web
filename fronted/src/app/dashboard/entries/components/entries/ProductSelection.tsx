import { Barcode, Check, ChevronsUpDown, Plus, Save, ChevronDown, Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, normalizeOptionValue } from '@/lib/utils'
import AddProductDialog from '../AddProductDialog'
import { AddSeriesDialog } from '../AddSeriesDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { updateProductCategory } from '@/app/dashboard/inventory/inventory.api'

export function ProductSelection({
  open,
  setOpen,
  value,
  setValueProduct,
  recentProductIds,
  onProductSelected,
  products,
  selectedProducts,
  categories,
  setProducts,
  setCategories,
  currentProduct,
  setCurrentProduct,
  register,
  setValue,
  categoryValue,
  purchasePrice,
  addProduct,
  isDialogOpenSeries,
  setIsDialogOpenSeries,
  series,
  setSeries,
  quantity,
  setQuantity,
  isDialogOpenProduct,
  setIsDialogOpenProduct,
  getAllSeriesFromDataTable,
  isNewCategoryBoolean,
  setIsNewCategoryBoolean,
  currency,
  tipoCambioActual,
}: any) {
  const totalPurchasePrice = useMemo(() => {
    const price = currentProduct?.price ?? Number(purchasePrice ?? 0)
    const numericQuantity = Number(quantity) || 0
    return (price * numericQuantity).toFixed(2)
  }, [currentProduct, quantity, purchasePrice])

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false)

  const renderStatusChip = (filled: boolean, optional = false) => (
    <span
      className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        filled
          ? "border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
          : optional
            ? "border-slate-200/70 bg-slate-50 text-slate-600 dark:border-slate-800/60 dark:bg-slate-900/60 dark:text-slate-300"
            : "border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200"
      }`}
    >
      {filled ? "Listo" : optional ? "Opcional" : "Requerido"}
    </span>
  )
  const [pendingCategory, setPendingCategory] = useState<{ id: number; name: string } | null>(null)
  const [pendingProductId, setPendingProductId] = useState<number | null>(null)
  const [previousCategoryName, setPreviousCategoryName] = useState<string | null>(null)
  const [previousCategoryId, setPreviousCategoryId] = useState<number | null>(null)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isUpdatingCategory, setIsUpdatingCategory] = useState(false)

  const categoryField = register('category_name')

  const selectedCategoryId = useMemo(() => {
    if (currentProduct?.categoryId) {
      return currentProduct.categoryId
    }

    const normalizedCategoryValue = normalizeOptionValue(categoryValue)
    const match = categories.find(
      (cat: any) => normalizeOptionValue(cat.name) === normalizedCategoryValue,
    )

    return match?.id ?? null
  }, [categories, categoryValue, currentProduct?.categoryId])

  const normalizedSelectedProductValue = useMemo(() => normalizeOptionValue(value), [value])

  const selectedProductOption = useMemo(() => {
    if (!value) {
      return null
    }

    return (
      products.find(
        (product: any) => normalizeOptionValue(product.name) === normalizedSelectedProductValue,
      ) ?? null
    )
  }, [products, normalizedSelectedProductValue, value])

  const displayedProductName = selectedProductOption?.name ?? value ?? ''
  const recentSet = useMemo(
    () =>
      new Set<number>(
        (Array.isArray(recentProductIds) ? recentProductIds : []).filter(
          (id: any) => typeof id === 'number',
        ),
      ),
    [recentProductIds],
  )
  const orderedProducts = useMemo(() => {
    if (!Array.isArray(recentProductIds) || recentProductIds.length === 0) {
      return products
    }
    const recent = recentProductIds
      .map((id: number) => products.find((p: any) => p.id === id))
      .filter(Boolean) as any[]
    const rest = products.filter((p: any) => !recentSet.has(p.id))
    return [...recent, ...rest]
  }, [products, recentProductIds, recentSet])
  const applyCategoryUpdate = async (
    productId: number,
    category: { id: number; name: string },
    previousName: string | null,
    previousId: number | null,
  ) => {
    try {
      setIsUpdatingCategory(true)
      await updateProductCategory(productId, category.id)
      toast.success('categoria actualizada correctamente.')
      setCurrentProduct((prev:any) => {
        if (!prev || prev.id !== productId) {
          return prev
        }
        return {
          ...prev,
          categoryId: category.id,
          category_name: category.name,
        }
      })
      setProducts((prev:any) =>
        prev.map((product:any) =>
          product.id === productId
            ? { ...product, categoryId: category.id, category_name: category.name }
            : product,
        ),
      )
    } catch (error) {
      console.error('Error al actualizar la categoria del producto:', error)
      toast.error('No se pudo actualizar la categoria del producto.')
      setValue('category_name', previousName || '', { shouldValidate: true })
      setCurrentProduct((prev:any) => {
        if (!prev || prev.id !== productId) {
          return prev
        }
        return {
          ...prev,
          categoryId: previousId ?? prev.categoryId,
          category_name: previousName ?? prev.category_name,
        }
      })
    } finally {
      setIsUpdatingCategory(false)
      setIsConfirmDialogOpen(false)
      setPendingCategory(null)
      setPendingProductId(null)
      setPreviousCategoryId(null)
      setPreviousCategoryName(null)
    }
  }

  const handleCategorySelection = (category: { id: number; name: string }) => {
    const productId = currentProduct?.id ?? null
    const previousName = currentProduct?.category_name ?? null
    const previousId = currentProduct?.categoryId ?? null

    setValue('category_name', category.name, { shouldValidate: true, shouldDirty: true })
    setIsCategoryPopoverOpen(false)
    setIsNewCategoryBoolean(false)

    if (!productId) {
      if (currentProduct) {
        setCurrentProduct({
          ...currentProduct,
          categoryId: category.id,
          category_name: category.name,
        })
      }
      return
    }

    const normalizedPreviousName = previousName?.trim().toLowerCase()
    const hadPreviousCategory = Boolean(
      (previousId && previousId > 0) ||
        (normalizedPreviousName && normalizedPreviousName !== '' && normalizedPreviousName !== 'sin categoria'),
    )

    if (previousId === category.id) {
      setCurrentProduct({
        ...currentProduct,
        categoryId: category.id,
        category_name: category.name,
      })
      return
    }

    if (!hadPreviousCategory) {
      void applyCategoryUpdate(productId, category, previousName, previousId)
      return
    }

    setPendingCategory(category)
    setPendingProductId(productId)
    setPreviousCategoryName(previousName)
    setPreviousCategoryId(previousId)
    setIsConfirmDialogOpen(true)
  }

  const handleCancelCategoryUpdate = () => {
    setIsConfirmDialogOpen(false)
    setPendingCategory(null)
    setPendingProductId(null)
    setPreviousCategoryId(null)
    setPreviousCategoryName(null)
    if (currentProduct) {
      setValue('category_name', currentProduct.category_name || '', { shouldValidate: true })
    }
  }

  const handleConfirmCategoryUpdate = () => {
    if (pendingCategory && pendingProductId) {
      void applyCategoryUpdate(pendingProductId, pendingCategory, previousCategoryName, previousCategoryId)
    }
  }

  return (
    <div className="flex-1 flex-col border border-gray-600 rounded-md p-2">
      <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
          <Label htmlFor="product-combobox" className="text-sm font-medium">
            Ingrese un producto:
          </Label>          
          {renderStatusChip(Boolean(selectedProducts && selectedProducts.length > 0))}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 cursor-pointer text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Ayuda para seleccionar producto"
              >
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Busca y selecciona el producto que deseas ingresar.</TooltipContent>
          </Tooltip>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed((prev) => !prev)}
              aria-label={`${isCollapsed ? 'Expandir' : 'Contraer'} panel de producto`}
              aria-expanded={!isCollapsed}
              className="cursor-pointer transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  isCollapsed ? '-rotate-90' : 'rotate-0'
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isCollapsed ? 'Mostrar panel' : 'Ocultar panel'}</TooltipContent>
        </Tooltip>
      </div>
      {!isCollapsed && (
        <>
          <div className="flex flex-wrap gap-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
          <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="min-w-[150px] flex-1 cursor-pointer justify-between truncate text-xs transition-colors hover:border-primary/60 hover:bg-accent/40 sm:w-[300px] sm:text-sm"
            >
              {displayedProductName || 'Selecciona un producto...'}
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" style={{ width: "var(--radix-popover-trigger-width)" }}>
            <Command>
              <CommandInput placeholder="Buscar producto..." />
              <CommandList>
                <CommandEmpty>No se encontraron productos.</CommandEmpty>
                <CommandGroup>
                  {orderedProducts.map((product: any) => {
                    const normalizedProductName = normalizeOptionValue(product.name)
                    const isSelected = normalizedProductName === normalizedSelectedProductValue
                    const commandValue =
                      typeof product.name === 'string'
                        ? product.name.trim()
                        : product.name != null
                          ? String(product.name)
                          : ''

                    return (
                      <CommandItem
                        key={product.id ?? product.name}
                        value={commandValue}
                        className="cursor-pointer transition-colors hover:bg-accent/60"
                        onSelect={() => {
                          if (isSelected) {
                            setOpen(false)
                            return
                          }

                          const purchasePrice =
                            currency === 'USD' && tipoCambioActual && tipoCambioActual > 0
                              ? Number((product.price / tipoCambioActual).toFixed(2))
                              : Number((product.price || 0).toFixed(2))
                          const category = categories.find((cat: any) => cat.id === product.categoryId)

                          setValueProduct(product.name || '')
                          if (typeof onProductSelected === 'function' && typeof product.id === 'number') {
                            onProductSelected(product.id)
                          }
                          setCurrentProduct({
                            id: product.id,
                            name: product.name,
                            price: purchasePrice,
                            priceSell: product.priceSell,
                            categoryId: product.categoryId,
                            category_name: category?.name || product.category_name || 'Sin categoria',
                          })
                          setValue('category_name', category?.name || product.category_name || 'Sin categoria')
                          setValue('price', purchasePrice || 0)
                          setValue('priceSell', product.priceSell || 0)
                          setValue('description', product.description || '')
                          setOpen(false)
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span>{product.name}</span>
                          {recentSet.has(product.id) && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              Reciente
                            </span>
                          )}
                        </div>
                        <Check className={cn('ml-auto', isSelected ? 'opacity-100' : 'opacity-0')} />
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="sm:w-auto sm:ml-2 ml-0 cursor-pointer bg-green-700 text-white transition-colors hover:bg-green-800"
              type="button"
              onClick={addProduct}
            >
              <span className="hidden sm:block">Agregar</span>
              <Plus className="w-2 h-2" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Agrega el producto seleccionado al ingreso.</TooltipContent>
        </Tooltip>
        {/* BotÃ³n para abrir el modal */}
        <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="sm:w-auto sm:ml-2 ml-0 cursor-pointer bg-blue-600 text-white transition-colors hover:bg-blue-700"
            type="button"
            onClick={() => setIsDialogOpenSeries(true)}
            disabled={!currentProduct}
          >
            <span className="hidden sm:block">Agregar Series</span>
            <Barcode className="w-6 h-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Asigna series o códigos únicos al producto.</TooltipContent>
      </Tooltip>

        <AddSeriesDialog
          isOpen={isDialogOpenSeries}
          onClose={() => setIsDialogOpenSeries(false)}
          series={series}
          setSeries={setSeries}
          quantity={quantity}
          getAllSeriesFromDataTable={getAllSeriesFromDataTable}
        />

        <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="sm:w-auto sm:ml-2 ml-0 cursor-pointer bg-green-700 text-white transition-colors hover:bg-green-800"
            type="button"
            onClick={() => setIsDialogOpenProduct(true)}
          >
            <span className="hidden sm:block">Nuevo</span>
            <Save className="w-6 h-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Crea un nuevo producto y lo agrega al catálogo.</TooltipContent>
      </Tooltip>

        <AddProductDialog
          isOpen={isDialogOpenProduct}
          onClose={() => setIsDialogOpenProduct(false)}
          categories={categories}
          setCategories={setCategories}
          setProducts={setProducts}
          setValueProduct={setValueProduct}
          setCurrentProduct={setCurrentProduct}
          setValue={setValue}
          isNewCategoryBoolean={isNewCategoryBoolean}
          setIsNewCategoryBoolean={setIsNewCategoryBoolean} // Pasar la funciÃ³n
        />
      </div>

            <div className="flex items-center gap-1 py-2">
        <Label className="text-sm font-medium">Categoria</Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Ayuda para seleccionar categoria"
            >
              <Info className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Selecciona o cambia la categoria asociada al producto.</TooltipContent>
        </Tooltip>
      </div>
      <input type="hidden" {...categoryField} value={categoryValue || ''} />
      {isNewCategoryBoolean ? (
        <Input
          value={categoryValue || ''}
          onChange={(event) => {
            setValue('category_name', event.target.value, {
              shouldDirty: true,
              shouldValidate: true,
            })
            if (currentProduct) {
              setCurrentProduct({
                ...currentProduct,
                category_name: event.target.value,
              })
            }
          }}
          placeholder="Ingresa el nombre de la categoria"
        />
      ) : (
        <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full cursor-pointer justify-between transition-colors hover:border-primary/60 hover:bg-accent/40"
            >
              {categoryValue || 'Selecciona una categoria...'}
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" style={{ width: "var(--radix-popover-trigger-width)" }}>
            <Command>
              <CommandInput placeholder="Buscar categoria..." />
              <CommandList>
                <CommandEmpty>No se encontraron categorias.</CommandEmpty>
                <CommandGroup>
                  {categories.map((category: any) => (
                    <CommandItem
                      key={category.id}
                      value={category.name}
                      className="cursor-pointer transition-colors hover:bg-accent/60"
                      onSelect={() => handleCategorySelection(category)}
                    >
                      {category.name}
                      <Check
                        className={cn(
                          'ml-auto',
                          selectedCategoryId === category.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
      <AlertDialog open={isConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Actualizar categoria del producto</AlertDialogTitle>
            <AlertDialogDescription>
              {`El producto tiene la categoria "${previousCategoryName || 'Sin categoria'}".`}
              <br />
              {pendingCategory ? `¿Deseas actualizarla por "${pendingCategory.name}"?` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelCategoryUpdate} disabled={isUpdatingCategory}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCategoryUpdate} disabled={isUpdatingCategory}>
              {isUpdatingCategory ? 'Actualizando...' : 'Actualizar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Label className="text-sm font-medium py-2">Descripcion</Label>
      <Input
        {...register("description")}
        readOnly
      />
      <div className="flex justify-between gap-1">
            <div className="flex flex-col flex-grow">
              <Label className="text-sm font-medium py-2">Cantidad</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Cantidad"
                  className="h-9 flex-1 text-sm"
                  value={quantity.toString()}
                  maxLength={10}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*\.?\d*$/.test(value) && value.length <= 10) {
                      const next = Number(value);
                      setQuantity(Number.isNaN(next) ? 1 : Math.max(1, next));
                    }
                  }}
                  onBlur={() => {
                    const numericValue = parseFloat(String(quantity));
                    if (!Number.isNaN(numericValue) && numericValue > 0) {
                      setQuantity(numericValue);
                    } else {
                      setQuantity(1);
                    }
                  }}
                />
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 cursor-pointer border-rose-600 bg-rose-600 text-white hover:border-rose-700 hover:bg-rose-700 dark:border-rose-400 dark:bg-rose-400 dark:text-rose-950 dark:hover:border-rose-300 dark:hover:bg-rose-300"
                        aria-label="Disminuir cantidad"
                        onClick={() => {
                          setQuantity((prev: number) => {
                            const current = Number(prev) || 0;
                            return Math.max(1, current - 1);
                          });
                        }}
                      >
                        -
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Disminuir cantidad</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 cursor-pointer border-emerald-600 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700 dark:border-emerald-400 dark:bg-emerald-400 dark:text-emerald-950 dark:hover:border-emerald-300 dark:hover:bg-emerald-300"
                        aria-label="Aumentar cantidad"
                        onClick={() => {
                          setQuantity((prev: number) => {
                            const current = Number(prev) || 0;
                            return Math.max(1, current + 1);
                          });
                        }}
                      >
                        +
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Aumentar cantidad</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
            <div className="flex flex-col flex-grow">
              <Label className="text-sm font-medium py-2">Precio Total Unitario</Label>
              <Input
                value={totalPurchasePrice}
                readOnly
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}






















