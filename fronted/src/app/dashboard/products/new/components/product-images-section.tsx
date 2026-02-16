"use client"

import { memo, type ChangeEvent } from 'react'
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
import { resolveImageUrl } from '@/lib/images'

import type { ProductFormContext } from './types'

export type ProductImagesSectionProps = ProductFormContext & {
  imageFields: FieldArrayWithId<any, 'images'>[]
  appendImage: UseFieldArrayAppend<any, 'images'>
  removeImage: UseFieldArrayRemove
  handleImageFile: (event: ChangeEvent<HTMLInputElement>, index: number) => void
  hasImages: boolean
  showComputerSpecs: boolean
  isGeneralVertical: boolean
  OptionalChip: React.ComponentType<{ filled: boolean }>
}

export const ProductImagesSection = memo(function ProductImagesSection({
  form,
  register,
  isProcessing,
  imageFields,
  appendImage,
  removeImage,
  handleImageFile,
  hasImages,
  showComputerSpecs,
  isGeneralVertical,
  OptionalChip,
}: ProductImagesSectionProps) {
  return (
    <div
      className={`flex flex-col pt-4 md:col-span-1 md:col-start-2 ${
        showComputerSpecs
          ? "lg:col-span-3 lg:col-start-1 lg:row-start-6"
          : isGeneralVertical
            ? "lg:col-span-3 lg:col-start-1 lg:row-start-5"
            : "lg:col-span-1 lg:col-start-3 lg:row-start-5"
      } ${showComputerSpecs || isGeneralVertical ? "" : "lg:pl-4"}`}
    >
      <Label className="py-3 font-semibold">
        Imagenes
        {<OptionalChip filled={hasImages} />}
      </Label>
      {imageFields.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No hay imagenes registradas aun.
        </p>
      )}
      <div className="space-y-4">
        {imageFields.map((field, index) => {
          const preview = form.watch(`images.${index}` as const) || '';
          return (
            <div
              key={field.id}
              className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-start"
            >
              <div className="flex-1 space-y-2">
                <Input
                  placeholder="URL o ruta relativa /uploads"
                  {...register(`images.${index}` as const)}
                />
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={isProcessing}
                        className="cursor-pointer"
                        onChange={(event) => handleImageFile(event, index)}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">Seleccionar imagen</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-xs text-muted-foreground">
                  Puedes ingresar una URL externa o subir un archivo (se almacenara en /uploads).
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                {preview ? (
                  <img
                    src={resolveImageUrl(preview)}
                    alt={`preview-${index}`}
                    className="h-24 w-24 rounded border object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded border text-xs text-muted-foreground">
                    Sin vista previa
                  </div>
                )}
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => removeImage(index)}
                        disabled={isProcessing}
                      >
                        Quitar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Quitar imagen</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          );
        })}
      </div>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-fit cursor-pointer"
              disabled={isProcessing}
              onClick={() => appendImage('')}
            >
              Agregar imagen
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Agregar imagen</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
})
