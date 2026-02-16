"use client"

import { memo } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { ProductFormContext } from './types'

export type ProductBrandDescriptionProps = ProductFormContext & {
  brands: any[]
  isLoadingBrands: boolean
  hasBrand: boolean
  hasDescription: boolean
  OptionalChip: React.ComponentType<{ filled: boolean }>
}

export const ProductBrandDescription = memo(function ProductBrandDescription({
  form,
  register,
  setValue,
  isProcessing,
  brands,
  isLoadingBrands,
  hasBrand,
  hasDescription,
  OptionalChip,
}: ProductBrandDescriptionProps) {
  return (
    <>
      <div className="flex flex-col lg:col-start-1 lg:row-start-2">
        <Label className='py-3'>
          Marca
          {<OptionalChip filled={hasBrand} />}
        </Label>
        <Input
          disabled={isProcessing || isLoadingBrands}
          list="brand-options"
          maxLength={50}
          {...register('brand')}
        />
        <datalist id="brand-options">
          {brands.map((b) => (
            <option key={b.id} value={b.name} />
          ))}
        </datalist>
        {isLoadingBrands && (
          <p className="pt-1 text-xs text-muted-foreground">
            Cargando marcas...
          </p>
        )}
        {form.formState.errors.brand && (
          <p className="text-red-500 text-sm">{form.formState.errors.brand.message as string}</p>
        )}
      </div>

      <div className="flex flex-col lg:col-start-2 lg:row-start-2">
        <Label className='py-3'>
          Descripcion
          {<OptionalChip filled={hasDescription} />}
        </Label>
        <Input
          maxLength={200}
          {...register('description')}
        />
        {form.formState.errors.description && (
          <p className="text-red-500 text-sm">{form.formState.errors.description.message as string}</p>
        )}
      </div>

      <div className="flex flex-col lg:col-start-3 lg:row-start-2">
        <Label className='py-3'>
          Selecciona un estado
        </Label>
        <Select
          value={form.watch("status")}
          disabled={isProcessing}
          defaultValue={form.getValues("status")}
          onValueChange={(value: any) => setValue("status", value as "Activo" | "Inactivo", { shouldValidate: true })}
        >
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <SelectTrigger className="w-full cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">Selecciona el estado del producto</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <SelectContent>
            <SelectItem value="Activo">Activo</SelectItem>
            <SelectItem value="Inactivo">Inactivo</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  )
})
