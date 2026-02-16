"use client"

import { memo } from 'react'
import type { FieldArrayWithId, UseFieldArrayAppend, UseFieldArrayRemove } from 'react-hook-form'

import { Button } from '@/components/ui/button'
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
import { IconName, icons } from '@/lib/icons'

import type { ProductFormContext } from './types'

export type ProductFeaturesSectionProps = ProductFormContext & {
  featureFields: FieldArrayWithId<any, 'features'>[]
  appendFeature: UseFieldArrayAppend<any, 'features'>
  removeFeature: UseFieldArrayRemove
  hasFeatures: boolean
  OptionalChip: React.ComponentType<{ filled: boolean }>
}

export const ProductFeaturesSection = memo(function ProductFeaturesSection({
  form,
  register,
  setValue,
  isProcessing,
  featureFields,
  appendFeature,
  removeFeature,
  hasFeatures,
  OptionalChip,
}: ProductFeaturesSectionProps) {
  return (
    <div className="flex flex-col">
      <Label className='py-3 font-semibold'>
        Caracteristicas
        {<OptionalChip filled={hasFeatures} />}
      </Label>
      {featureFields.map((field, index) => (
        <div key={field.id} className="flex flex-col md:flex-row gap-2 mb-2">
          <Select
            disabled={isProcessing}
            value={form.watch(`features.${index}.icon` as const)}
            onValueChange={(value: any) =>
              setValue(`features.${index}.icon` as const, value as IconName)
            }
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Icono" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(icons).map((key) => {
                const Icon = icons[key as IconName]
                return (
                  <SelectItem key={key} value={key} className="flex items-center gap-2">
                    <Icon className="w-4 h-4" /> {key}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Input placeholder='Titulo' {...register(`features.${index}.title` as const)} className='flex-1' />
          <Input placeholder='Descripcion' {...register(`features.${index}.description` as const)} className='flex-1' />
          <Button
            type='button'
            variant='destructive'
            className="h-10 w-10 px-0"
            onClick={() => removeFeature(index)}
          >
            <span className="text-base leading-none">X</span>
          </Button>
        </div>
      ))}
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() =>
                appendFeature({ icon: '', title: '', description: '' })
              }
            >
              Agregar caracteristica
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Agregar caracteristica</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
})
