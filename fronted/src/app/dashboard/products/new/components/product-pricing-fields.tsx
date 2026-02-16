"use client"

import { memo } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import type { ProductFormContext } from './types'

export type ProductPricingFieldsProps = ProductFormContext & {
  hasPrice: boolean
  hasPriceSell: boolean
  hasInitialStock: boolean
  OptionalChip: React.ComponentType<{ filled: boolean }>
}

export const ProductPricingFields = memo(function ProductPricingFields({
  form,
  register,
  setValue,
  hasPrice,
  hasPriceSell,
  hasInitialStock,
  OptionalChip,
}: ProductPricingFieldsProps) {
  return (
    <>
      <div className="flex flex-col">
        <Label className='py-3'>
          Precio de Compra
          {<OptionalChip filled={hasPrice} />}
        </Label>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center rounded-md bg-background px-3 py-1">
            <Input
              step="0.01"
              min={0}
              max={99999999.99}
              type="number"
              className="h-8 w-full border-0 bg-transparent px-0 pl-2 text-sm [appearance:textfield] focus-visible:ring-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              {...register('price', { valueAsNumber: true })}
            />
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 cursor-pointer border-sky-500/60 bg-sky-50 text-sky-700 hover:border-sky-500/80 hover:text-sky-800 dark:border-sky-400/40 dark:bg-transparent dark:text-sky-200 dark:hover:border-sky-300/70 dark:hover:text-sky-100"
                  aria-label="Disminuir precio de compra"
                  onClick={() => {
                    const current = Number(form.getValues('price') ?? 0)
                    const next = Math.max(0, current - 1)
                    setValue('price', next, { shouldDirty: true, shouldValidate: true })
                  }}
                >
                  −
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Disminuir precio de compra</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 cursor-pointer border-sky-500/60 bg-sky-50 text-sky-700 hover:border-sky-500/80 hover:text-sky-800 dark:border-sky-400/40 dark:bg-transparent dark:text-sky-200 dark:hover:border-sky-300/70 dark:hover:text-sky-100"
                  aria-label="Aumentar precio de compra"
                  onClick={() => {
                    const current = Number(form.getValues('price') ?? 0)
                    const next = current + 1
                    setValue('price', next, { shouldDirty: true, shouldValidate: true })
                  }}
                >
                  +
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Aumentar precio de compra</TooltipContent>
            </Tooltip>
          </div>
        </div>
        {form.formState.errors.price && (
          <p className="text-red-500 text-sm">{form.formState.errors.price.message as string}</p>
        )}
      </div>

      <div className="flex flex-col">
        <Label className='py-3'>
          Precio de Venta
          {<OptionalChip filled={hasPriceSell} />}
        </Label>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center rounded-md bg-background px-3 py-1">
            <Input
              step="0.01"
              min={0}
              max={99999999.99}
              type="number"
              className="h-8 w-full border-0 bg-transparent px-0 pl-2 text-sm [appearance:textfield] focus-visible:ring-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              {...register('priceSell', { valueAsNumber: true })}
            />
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 cursor-pointer border-emerald-500/60 bg-emerald-50 text-emerald-700 hover:border-emerald-500/80 hover:text-emerald-800 dark:border-emerald-400/40 dark:bg-transparent dark:text-emerald-200 dark:hover:border-emerald-300/70 dark:hover:text-emerald-100"
                  aria-label="Disminuir precio de venta"
                  onClick={() => {
                    const current = Number(form.getValues('priceSell') ?? 0)
                    const next = Math.max(0, current - 1)
                    setValue('priceSell', next, { shouldDirty: true, shouldValidate: true })
                  }}
                >
                  −
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Disminuir precio de venta</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 cursor-pointer border-emerald-500/60 bg-emerald-50 text-emerald-700 hover:border-emerald-500/80 hover:text-emerald-800 dark:border-emerald-400/40 dark:bg-transparent dark:text-emerald-200 dark:hover:border-emerald-300/70 dark:hover:text-emerald-100"
                  aria-label="Aumentar precio de venta"
                  onClick={() => {
                    const current = Number(form.getValues('priceSell') ?? 0)
                    const next = current + 1
                    setValue('priceSell', next, { shouldDirty: true, shouldValidate: true })
                  }}
                >
                  +
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Aumentar precio de venta</TooltipContent>
            </Tooltip>
          </div>
        </div>
        {form.formState.errors.priceSell && (
          <p className="text-red-500 text-sm">{form.formState.errors.priceSell.message as string}</p>
        )}
      </div>

      <div className="flex flex-col">
        <Label className='py-3'>
          Cantidad / Stock inicial
          {<OptionalChip filled={hasInitialStock} />}
        </Label>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center rounded-md bg-background px-3 py-1">
            <Input
              step="1"
              min={0}
              max={99999999.99}
              type="number"
              className="h-8 w-full border-0 bg-transparent px-0 pl-2 text-sm [appearance:textfield] focus-visible:ring-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              {...register('initialStock', { valueAsNumber: true })}
            />
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 cursor-pointer border-indigo-500/60 bg-indigo-50 text-indigo-700 hover:border-indigo-500/80 hover:text-indigo-800 dark:border-indigo-400/40 dark:bg-transparent dark:text-indigo-200 dark:hover:border-indigo-300/70 dark:hover:text-indigo-100"
                  aria-label="Disminuir stock inicial"
                  onClick={() => {
                    const current = Number(form.getValues('initialStock') ?? 0)
                    const next = Math.max(0, current - 1)
                    setValue('initialStock', next, { shouldDirty: true, shouldValidate: true })
                  }}
                >
                  −
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Disminuir stock inicial</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 cursor-pointer border-indigo-500/60 bg-indigo-50 text-indigo-700 hover:border-indigo-500/80 hover:text-indigo-800 dark:border-indigo-400/40 dark:bg-transparent dark:text-indigo-200 dark:hover:border-indigo-300/70 dark:hover:text-indigo-100"
                  aria-label="Aumentar stock inicial"
                  onClick={() => {
                    const current = Number(form.getValues('initialStock') ?? 0)
                    const next = current + 1
                    setValue('initialStock', next, { shouldDirty: true, shouldValidate: true })
                  }}
                >
                  +
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Aumentar stock inicial</TooltipContent>
            </Tooltip>
          </div>
        </div>
        {form.formState.errors.initialStock && (
          <p className="text-red-500 text-sm">{form.formState.errors.initialStock.message as string}</p>
        )}
      </div>
    </>
  )
})
