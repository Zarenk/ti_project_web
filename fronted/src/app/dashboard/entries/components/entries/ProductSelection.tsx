import { Barcode, Check, ChevronsUpDown, Plus, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { cn } from '@/lib/utils'
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
  products,
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

  const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = useState(false)

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
    const match = categories.find((cat: any) => cat.name === categoryValue)
    return match?.id ?? null
  }, [categories, categoryValue, currentProduct?.categoryId])

  const applyCategoryUpdate = async (
    productId: number,
    category: { id: number; name: string },
    previousName: string | null,
    previousId: number | null,
  ) => {
    try {
      setIsUpdatingCategory(true)
      await updateProductCategory(productId, category.id)
      toast.success('Categoría actualizada correctamente.')
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
      console.error('Error al actualizar la categoría del producto:', error)
      toast.error('No se pudo actualizar la categoría del producto.')
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
        (normalizedPreviousName && normalizedPreviousName !== '' && normalizedPreviousName !== 'sin categoría'),
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
      <Label htmlFor="product-combobox" className="text-sm font-medium mb-2">
        Ingrese un producto:
      </Label>
      <div className="flex flex-wrap gap-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
          <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="min-w-[150px] flex-1 sm:w-[300px]
              justify-between truncate text-xs sm:text-sm"
              title="Busca y selecciona el producto que deseas ingresar"
            >
              {value
                ? products.find((product: any) => String(product.name) === value)?.name
                : "Selecciona un producto..."}
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="min-w-[150px] sm:w-[300px] p-0">
            <Command>
              <CommandInput placeholder="Buscar producto..." />
              <CommandList>
                <CommandEmpty>No se encontraron productos.</CommandEmpty>
                <CommandGroup>
                  {products.map((product: any) => (
                    <CommandItem
                      key={product.name}
                      value={product.name}
                      onSelect={(currentValue) => {
                        if (currentValue === value) return; // 👈 Si es el mismo proveedor, no hace nada
                        setValueProduct(currentValue === value ? "" : currentValue);
                        const selectedProduct = products.find(
                          (p: any) => String(p.name) === currentValue
                        );
                        if (selectedProduct) {
                          const purchasePrice =
                            currency === 'USD' && tipoCambioActual && tipoCambioActual > 0
                              ? Number((selectedProduct.price / tipoCambioActual).toFixed(2))
                              : Number((selectedProduct.price || 0).toFixed(2))
                          const category = categories.find(
                            (cat: any) => cat.id === selectedProduct.categoryId
                          );
                          setCurrentProduct({
                            id: selectedProduct.id,
                            name: selectedProduct.name,
                            price: purchasePrice,
                            priceSell: selectedProduct.priceSell,
                            categoryId: selectedProduct.categoryId,
                            category_name: category?.name || selectedProduct.category_name || "Sin categoría",
                          });
                          setValue("category_name", category?.name || selectedProduct.category_name || "Sin categoría");
                          setValue("price", purchasePrice || 0);
                          setValue("priceSell", selectedProduct.priceSell || 0);
                          setValue("description", selectedProduct.description || "");
                        }
                        setOpen(false);
                      }}
                    >
                      {product.name}
                      <Check
                          className={cn(
                          "ml-auto",
                          value === product.name ? "opacity-100" : "opacity-0"
                         )}
                       />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Button
          className="sm:w-auto sm:ml-2 ml-0 bg-green-700 hover:bg-green-800 text-white"
          type="button"
          onClick={addProduct}
          title="Agrega el producto seleccionado a la lista del ingreso"
        >
          <span className="hidden sm:block">Agregar</span>
          <Plus className="w-2 h-2" />
        </Button>
        {/* Botón para abrir el modal */}
        <Button
          className="bg-blue-600 hover:bg-blue-700 text-white className='sm:w-auto sm:ml-2 ml-0"
          type="button"
          onClick={() => setIsDialogOpenSeries(true)}
          disabled={!currentProduct}
          title="Asigna series o códigos únicos al producto seleccionado"
        >
          <span className="hidden sm:block">Agregar Series</span>
          <Barcode className="w-6 h-6" />
        </Button>

        <AddSeriesDialog
          isOpen={isDialogOpenSeries}
          onClose={() => setIsDialogOpenSeries(false)}
          series={series}
          setSeries={setSeries}
          quantity={quantity}
          getAllSeriesFromDataTable={getAllSeriesFromDataTable}
        />

        <Button
          className="sm:w-auto sm:ml-2 ml-0 bg-green-700 hover:bg-green-800 text-white"
          type="button"
          onClick={() => setIsDialogOpenProduct(true)}
          title="Crea un nuevo producto y añádelo al catálogo"
        >
          <span className="hidden sm:block">Nuevo</span>
          <Save className="w-6 h-6" />
        </Button>

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
          setIsNewCategoryBoolean={setIsNewCategoryBoolean} // Pasar la función
        />
      </div>

      <Label className="text-sm font-medium py-2">Categoria</Label>
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
          placeholder="Ingresa el nombre de la categoría"
        />
      ) : (
        <Popover open={isCategoryPopoverOpen} onOpenChange={setIsCategoryPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between"
              title="Selecciona o cambia la categoría asociada al producto"
            >
              {categoryValue || 'Selecciona una categoría...'}
              <ChevronsUpDown className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full min-w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Buscar categoría..." />
              <CommandList>
                <CommandEmpty>No se encontraron categorías.</CommandEmpty>
                <CommandGroup>
                  {categories.map((category: any) => (
                    <CommandItem
                      key={category.id}
                      value={category.name}
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
            <AlertDialogTitle>Actualizar categoría del producto</AlertDialogTitle>
            <AlertDialogDescription>
              {`El producto tiene la categoría "${previousCategoryName || 'Sin categoría'}".`}
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
        title="Descripción del producto proveniente del catálogo"
      />
      <div className="flex justify-between gap-1">
        <div className="flex flex-col flex-grow">
          <Label className="text-sm font-medium py-2">Precio de Compra</Label>
          <Input
            {...register("price", { valueAsNumber: true })}
            readOnly
            step="0.01"
            min={0}
            title="Precio de compra unitario del producto"
          />
        </div>
        <div className="flex flex-col flex-grow">
          <Label className="text-sm font-medium py-2">Precio de Venta</Label>
          <Input
            {...register("priceSell", { valueAsNumber: true })}
            step="0.01"
            min={0}
            maxLength={13} // 10 dígitos + 1 punto decimal + 2 decimales
            onChange={(e) => {
              const value = e.target.value;
              // Validar que el valor sea un número con hasta 10 dígitos y 2 decimales
              if (/^\d{0,10}(\.\d{0,2})?$/.test(value)) {
                setValue("priceSell", value); // Actualizar el valor en el formulario
              }
            }}
            onBlur={(e) => {
              const value = parseFloat(e.target.value);
              // Asegurarse de que el valor sea un número válido o establecerlo en 0
              setValue("priceSell", !isNaN(value) ? value.toFixed(2) : "0.00");
            }}
            title="Define el precio de venta sugerido para el producto"
          />
        </div>
      </div>
      <div className="flex justify-between gap-1">
        <div className="flex flex-col flex-grow">
          <Label className="text-sm font-medium py-2">Cantidad</Label>
          <Input
            type="text"
            placeholder="Cantidad"
            value={quantity.toString()}
            maxLength={10}
            onChange={(e) => {
              const value = e.target.value;
              if (/^\d*\.?\d*$/.test(value) && value.length <= 10) {
                setQuantity(Number(value));
              }
            }}
            onBlur={() => {
              const numericValue = parseFloat(String(quantity));
              setQuantity(!isNaN(numericValue) ? numericValue : 1);
            }}
            title="Indica cuántas unidades ingresarás al inventario"
          />
        </div>
        <div className="flex flex-col flex-grow">
          <Label className="text-sm font-medium py-2">Precio Total Unitario</Label>
          <Input
            value={totalPurchasePrice}
            readOnly
            title="Resultado del precio de compra multiplicado por la cantidad"
          />
        </div>
      </div>
    </div>
  )
}