"use client"

import { memo } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type { ProductFormContext } from './types'

export type ProductComputerSpecsProps = ProductFormContext & {
  hasSpecs: boolean
  OptionalChip: React.ComponentType<{ filled: boolean }>
}

export const ProductComputerSpecs = memo(function ProductComputerSpecs({
  register,
  hasSpecs,
  OptionalChip,
}: ProductComputerSpecsProps) {
  return (
    <div className="flex flex-col pt-4 md:col-span-1 md:col-start-1 lg:col-span-3 lg:col-start-1 lg:row-start-5">
      <Label className='py-3 font-semibold'>
        Especificaciones
        {<OptionalChip filled={hasSpecs} />}
      </Label>
      <Input placeholder='Procesador' {...register('processor')} className='mb-2' />
      <Input placeholder='RAM' {...register('ram')} className='mb-2' />
      <Input placeholder='Almacenamiento' {...register('storage')} className='mb-2' />
      <Input placeholder='Graficos' {...register('graphics')} className='mb-2' />
      <Input placeholder='Pantalla' {...register('screen')} className='mb-2' />
      <Input placeholder='Resolucion' {...register('resolution')} className='mb-2' />
      <Input placeholder='Tasa de refresco' {...register('refreshRate')} className='mb-2' />
      <Input placeholder='Conectividad' {...register('connectivity')} />
    </div>
  )
})
