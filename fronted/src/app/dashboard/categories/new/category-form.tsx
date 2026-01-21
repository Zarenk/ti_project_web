"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { z } from 'zod'
import { toast } from 'sonner'
import { AlertTriangle, Check } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem } from '@/components/ui/select'
import { SelectTrigger, SelectValue } from '@radix-ui/react-select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { resolveImageUrl } from '@/lib/images'
import { useTenantSelection } from '@/context/tenant-selection-context'

import { createCategory, updateCategory } from '../categories.api'
import { uploadProviderImage } from '@/app/dashboard/providers/providers.api'

const normalizeCategoryImagePath = (input?: string): string => {
  const raw = input?.trim() ?? ''
  if (!raw) return ''
  if (raw.startsWith('http')) return raw
  if (raw.startsWith('/uploads') || raw.startsWith('uploads/')) return raw
  if (/^\d{1,3}(\.\d{1,3}){3}\//.test(raw)) {
    return `http://${raw}`
  }
  const uploadsIndex = raw.indexOf('/uploads')
  if (uploadsIndex >= 0) {
    const relative = raw.slice(uploadsIndex)
    return relative.startsWith('/') ? relative : `/${relative}`
  }
  return raw
}

export function CategoryForm({ product }: any) {
  const categorySchema = z.object({
    name: z
      .string({ required_error: 'Se requiere el nombre de la categoria' })
      .min(3, 'El nombre de la categoria debe tener al menos 3 caracteres')
      .max(50, 'El nombre de la categoria no puede tener mas de 50 caracteres')
      .regex(/^[a-zA-Z0-9\s]+$/, 'El nombre solo puede contener letras, numeros y espacios'),
    description: z.string().optional().or(z.literal('')),
    image: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine((value) => {
        if (!value) return true
        if (value.startsWith('/uploads') || value.startsWith('uploads/')) return true
        if (/^\d{1,3}(\.\d{1,3}){3}\//.test(value)) return true
        try {
          new URL(value)
          return true
        } catch {
          return false
        }
      }, 'La imagen debe ser una URL valida'),
    status: z.enum(['Activo', 'Inactivo']).optional(),
  })

  type CategoryType = z.infer<typeof categorySchema>

  const mapCategoryToFormValues = useMemo(
    () => ({
      name: product?.name ?? '',
      description: product?.description ?? '',
      status: (product?.status ?? 'Activo') as CategoryType['status'],
      image: normalizeCategoryImagePath(product?.image ?? ''),
    }),
    [product],
  )

  const emptyFormValues = useMemo(
    () => ({
      name: '',
      description: '',
      status: 'Activo' as CategoryType['status'],
      image: '',
    }),
    [],
  )

  const { version } = useTenantSelection()

  const form = useForm<CategoryType>({
    resolver: zodResolver(categorySchema),
    defaultValues: mapCategoryToFormValues,
  })

  const { handleSubmit, register, setValue } = form

  const router = useRouter()
  const params = useParams<{ id: string }>()

  const [nameError, setNameError] = useState<string | null>(null)
  const [isImageUploading, setIsImageUploading] = useState(false)
  const initializedVersion = useRef(false)

  useEffect(() => {
    form.reset(mapCategoryToFormValues)
    setNameError(null)
  }, [form, mapCategoryToFormValues])

  useEffect(() => {
    if (!initializedVersion.current) {
      initializedVersion.current = true
      return
    }

    setNameError(null)
    form.reset(emptyFormValues)
    router.refresh()
  }, [version, form, emptyFormValues, router])

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (params?.id) {
        await updateCategory(params.id, {
          ...data,
        })
        toast.success('Categoria actualizada correctamente.')
        router.push('/dashboard/categories')
        router.refresh()
      } else {
        await createCategory({
          ...data,
        })
        toast.success('Categoria creada correctamente.')
        router.push('/dashboard/categories')
        router.refresh()
      }
    } catch (error: any) {
      if (error.response?.status === 409 || error.response?.data?.message.includes('ya existe')) {
        setNameError(error.response?.data?.message || 'El nombre de la categoria ya existe.')
        console.log('Estado nameError actualizado:', error.response?.data?.message)
      } else {
        console.error('Error inesperado:', error.message)
      }
    }
  })

  const watchedName = form.watch('name')
  const watchedDescription = form.watch('description')
  const watchedImage = form.watch('image')
  const statusValue = form.watch('status') ?? 'Activo'

  const hasName = Boolean(watchedName?.trim())
  const hasDescription = Boolean(watchedDescription?.trim())
  const hasImage = Boolean(watchedImage?.trim())
  const imagePreview = normalizeCategoryImagePath(watchedImage?.trim() ?? '')

  const renderOptionalChip = (filled: boolean) => (
    <span
      className={`ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        filled
          ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
          : 'border-border/60 bg-muted/30 text-muted-foreground'
      }`}
    >
      {filled ? <Check className="h-3 w-3" /> : null}
      {filled ? 'Listo' : 'Opcional'}
    </span>
  )

  const handleImageFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsImageUploading(true)
      const response = await uploadProviderImage(file)
      if (response?.url) {
        const normalized = normalizeCategoryImagePath(response.url)
        setValue('image', normalized, { shouldValidate: true })
        toast.success('Imagen cargada correctamente.')
      }
    } catch (error) {
      console.error('Error al subir la imagen:', error)
      toast.error('No se pudo subir la imagen.')
    } finally {
      setIsImageUploading(false)
      event.target.value = ''
    }
  }

  return (
    <div className="container mx-auto grid w-full max-w-2xl sm:max-w-2xl md:max-w-5xl lg:max-w-6xl xl:max-w-none">
      <form className="flex flex-col gap-2" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-x-0.5 gap-y-4 md:gap-x-1 md:gap-y-5 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-6">
          <div className="flex flex-col lg:col-span-2">
            <Label className="py-3">
              Nombre de la Categoria
              <span
                className={`ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  hasName
                    ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                    : 'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
                }`}
              >
                {hasName ? <Check className="mr-1 h-3 w-3" /> : null}
                {hasName ? 'Listo' : 'Requerido'}
              </span>
            </Label>
            <Input {...register('name')} />
            {form.formState.errors.name && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {form.formState.errors.name.message}
              </p>
            )}
            {nameError && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {nameError}
              </p>
            )}
          </div>

          <div className="flex flex-col lg:col-span-1">
            <Label className="py-3">
              Selecciona un estado:
              {renderOptionalChip(Boolean(statusValue))}
            </Label>
            <Select
              value={statusValue}
              defaultValue={form.getValues('status')}
              onValueChange={(value) =>
                setValue('status', value as 'Activo' | 'Inactivo', { shouldValidate: true })
              }
            >
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue placeholder="Selecciona un estado" />
                    </SelectTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">Selecciona el estado de la categoria</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <SelectContent>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col lg:col-span-2">
            <Label className="py-3">
              Descripcion
              {renderOptionalChip(hasDescription)}
            </Label>
            <Input {...register('description')} />
            {form.formState.errors.description && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="flex flex-col lg:col-span-1">
            <Label className="py-3">
              Imagen
              {renderOptionalChip(hasImage)}
            </Label>
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-2">
                <Input
                  placeholder="URL o ruta relativa /uploads"
                  maxLength={200}
                  {...register('image')}
                />
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={isImageUploading}
                        className="cursor-pointer"
                        onChange={handleImageFile}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">Selecciona el archivo de imagen</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-xs text-muted-foreground">
                  Puedes ingresar una URL externa o subir un archivo (se almacenara en /uploads).
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  {imagePreview ? (
                    <img
                      src={resolveImageUrl(imagePreview)}
                      alt="Vista previa de categoria"
                      className="h-24 w-24 rounded border object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded border text-xs text-muted-foreground">
                      Sin vista previa
                    </div>
                  )}
                </div>
                {imagePreview && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="cursor-pointer sm:self-end"
                    onClick={() => setValue('image', '', { shouldValidate: true })}
                  >
                    Quitar
                  </Button>
                )}
              </div>
            </div>
            {form.formState.errors.image && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {form.formState.errors.image.message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 lg:flex-row lg:items-center lg:justify-end">
          <Button
            variant="outline"
            className="w-full cursor-pointer border-slate-300/80 bg-transparent text-slate-900 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/30 dark:bg-transparent dark:text-slate-100 dark:hover:bg-white/10 lg:w-auto"
            type="button"
            onClick={() => router.back()}
          >
            Volver
          </Button>
          <Button
            variant="outline"
            className="w-full cursor-pointer border-slate-300/80 bg-transparent text-slate-900 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/30 dark:bg-transparent dark:text-slate-100 dark:hover:bg-white/10 lg:w-auto"
            type="button"
            onClick={() =>
              form.reset({
                name: '',
                description: '',
                image: '',
                status: 'Activo',
              })
            }
          >
            Limpiar
          </Button>
          <Button className="w-full cursor-pointer bg-emerald-600 text-white transition-colors hover:bg-emerald-700 hover:shadow-sm dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-600 lg:w-auto lg:min-w-[160px]">
            {params.id ? 'Actualizar Categoria' : 'Crear Categoria'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CategoryForm
