"use client"

import { memo, type MutableRefObject, type Dispatch, type SetStateAction } from 'react'
import { Controller } from 'react-hook-form'
import { AlertTriangle, Loader2, Plus } from 'lucide-react'

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
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { ProductFormContext } from './types'

type NameValidation = {
  status?: "idle" | "checking" | "valid" | "invalid"
  message?: string
}

export type ProductBasicFieldsProps = ProductFormContext & {
  nameValidation: NameValidation
  nameError: string | null
  nameInputRef: MutableRefObject<HTMLInputElement | null>
  nameRegister: ReturnType<ProductFormContext['register']>
  categoryOptions: any[]
  isLoadingCategories: boolean
  isCategoryDialogOpen: boolean
  setIsCategoryDialogOpen: Dispatch<SetStateAction<boolean>>
  newCategoryName: string
  setNewCategoryName: Dispatch<SetStateAction<string>>
  newCategoryDescription: string
  setNewCategoryDescription: Dispatch<SetStateAction<string>>
  categoryError: string | null
  setCategoryError: Dispatch<SetStateAction<string | null>>
  isCreatingCategory: boolean
  handleCreateCategory: () => void
  hasName: boolean
  hasCategory: boolean
  OptionalChip: React.ComponentType<{ filled: boolean }>
  RequiredValidationChip: React.ComponentType<{ status: NameValidation['status']; filled: boolean }>
}

export const ProductBasicFields = memo(function ProductBasicFields({
  form,
  register,
  control,
  clearErrors,
  isProcessing,
  suppressInlineErrors,
  nameValidation,
  nameError,
  nameInputRef,
  nameRegister,
  categoryOptions,
  isLoadingCategories,
  isCategoryDialogOpen,
  setIsCategoryDialogOpen,
  newCategoryName,
  setNewCategoryName,
  newCategoryDescription,
  setNewCategoryDescription,
  categoryError,
  setCategoryError,
  isCreatingCategory,
  handleCreateCategory,
  hasName,
  hasCategory,
  RequiredValidationChip,
}: ProductBasicFieldsProps) {
  return (
    <>
      <div className='flex flex-col lg:col-start-1 lg:row-start-1'>
        <Label className='py-3'>
          Nombre del Producto
          {<RequiredValidationChip status={nameValidation.status} filled={hasName} />}
        </Label>
        <Input
          {...nameRegister}
          ref={(node) => {
            nameRegister.ref(node)
            nameInputRef.current = node
          }}
          maxLength={200}
        />
        {nameValidation.status === "checking" ? (
          <p className="mt-2 text-xs text-amber-600">Validando nombre...</p>
        ) : nameValidation.status === "invalid" ? (
          <p className="mt-2 text-xs text-rose-500">
            {nameValidation.message ?? "Ya existe un producto con ese nombre."}
          </p>
        ) : null}
        {!suppressInlineErrors && form.formState.errors.name && (
          <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
            <AlertTriangle className="h-3.5 w-3.5" />
            {form.formState.errors.name.message as string}
          </p>
        )}
        {!suppressInlineErrors && nameError && (
          <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
            <AlertTriangle className="h-3.5 w-3.5" />
            {nameError}
          </p>
        )}
      </div>

      <div className="flex flex-col lg:col-start-2 lg:row-start-1">
        <Label className='py-3'>
          Categoria
          <span
            className={`ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              hasCategory
                ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                : 'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
            }`}
          >
            {hasCategory ? 'Listo' : 'Requerido'}
          </span>
        </Label>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            {categoryOptions.length > 0 ? (
              <Controller
                name="categoryId"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Select
                      disabled={isProcessing || isLoadingCategories}
                      value={field.value ?? ''}
                      onValueChange={(val) => { field.onChange(val); clearErrors('categoryId') }}
                    >
                      <SelectTrigger className="w-full cursor-pointer border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <SelectValue placeholder="Seleccione una categoria" />
                      </SelectTrigger>
                      <SelectContent className="bg-card text-foreground border border-border rounded-lg max-h-60 overflow-y-auto">
                        {categoryOptions.map((category: any) => (
                          <SelectItem
                            key={category.id}
                            value={String(category.id)}
                            className="px-4 py-2 hover:bg-muted dark:hover:bg-muted/50 cursor-pointer"
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!suppressInlineErrors && fieldState.error && (
                      <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />
            ) : isLoadingCategories ? (
              <div className="flex h-10 items-center justify-center rounded-md border border-dashed border-border px-4 text-sm text-muted-foreground">
                Cargando categorias...
              </div>
            ) : (
              <div className="flex h-10 items-center justify-center rounded-md border border-dashed border-border px-4 text-sm text-muted-foreground">
                No hay categorias disponibles
              </div>
            )}
          </div>
          <Dialog
            open={isCategoryDialogOpen}
            onOpenChange={(open) => {
              setIsCategoryDialogOpen(open)
              if (!open) {
                setNewCategoryName('')
                setNewCategoryDescription('')
                setCategoryError(null)
              }
            }}
          >
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="cursor-pointer border-emerald-500/60 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-500 dark:border-emerald-400/50 dark:text-emerald-400"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Agregar nueva categoria</span>
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Agregar nueva categoria
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva categoria</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="new-category-name">Nombre</Label>
                  <Input
                    id="new-category-name"
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder="Nombre de la categoria"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="new-category-description">Descripcion (opcional)</Label>
                  <Input
                    id="new-category-description"
                    value={newCategoryDescription}
                    onChange={(event) => setNewCategoryDescription(event.target.value)}
                    placeholder="Descripcion de la categoria"
                  />
                </div>
                {categoryError && (
                  <p className="text-sm text-red-500">{categoryError}</p>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isCreatingCategory}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={isCreatingCategory}
                >
                  {isCreatingCategory ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Guardando
                    </span>
                  ) : (
                    'Crear'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {categoryOptions.length === 0 && !isLoadingCategories && (
          <p className="pt-2 text-sm text-muted-foreground">
            Crea una categoria para continuar.
          </p>
        )}
      </div>
    </>
  )
})
