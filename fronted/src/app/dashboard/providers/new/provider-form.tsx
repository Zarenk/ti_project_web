"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { createProvider, updateProvider, uploadProviderImage } from '../providers.api'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { SelectTrigger, SelectValue } from '@radix-ui/react-select'
import { Select, SelectContent, SelectItem } from '@/components/ui/select'
import { z } from 'zod'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTenantSelection } from '@/context/tenant-selection-context'
import { AlertTriangle, Check } from 'lucide-react'
import { resolveImageUrl } from '@/lib/images'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const normalizeProviderImagePath = (input?: string): string => {
  const raw = input?.trim() ?? ""
  if (!raw) return ""
  if (raw.startsWith("http")) return raw
  if (raw.startsWith("/uploads") || raw.startsWith("uploads/")) return raw
  if (/^\d{1,3}(\.\d{1,3}){3}\//.test(raw)) {
    return `http://${raw}`
  }
  const uploadsIndex = raw.indexOf("/uploads")
  if (uploadsIndex >= 0) {
    const relative = raw.slice(uploadsIndex)
    return relative.startsWith("/") ? relative : `/${relative}`
  }
  return raw
}

export function ProviderForm({provider}: {provider: any}) {

    //definir el esquema de validacion
    const providerSchema = z.object({
    name: z.string({
      required_error: "Se requiere el nombre del proveedor",
    })
      .min(3, "El nombre del proveedor debe tener al menos 3 caracteres")
      .max(50, "El nombre del proveedor no puede tener mケs de 50 caracteres")
      .regex(/^[a-zA-Z0-9\s]+$/, "El nombre solo puede contener letras, nカmeros y espacios"),
    document: z.enum(["Otro Documento", "DNI", "RUC"], {
        required_error: "El tipo de documento es obligatorio",
      }),
    documentNumber: z.string({required_error: "Se requiere el Nro. de documento",})
        .min(1, "El numero de documento es obligatorio"),
    description: z.string({
    }),
    phone: z.string({
    }),
    adress: z.string({
    }),
    email: z.string({
    }),
    website: z.string({
    }),
    image: z.string()
      .optional() // El campo es opcional
      .or(z.literal("")) // Permite que el campo sea una cadena vacia
      .refine((value) => {
        if (!value) return true
        if (value.startsWith("/uploads") || value.startsWith("uploads/")) return true
        if (/^\d{1,3}(\.\d{1,3}){3}\//.test(value)) return true
        try {
          new URL(value)
          return true
        } catch {
          return false
        }
      }, "La imagen debe ser una URL valida"), // Valida que sea una URL valida
    status: z.enum(["Activo", "Inactivo"]).optional(),
    }) //{name: "", lastname: "", age: z.number()}

    //inferir el tipo de dato
    type ProviderType = z.infer<typeof providerSchema>;

    const mapProviderToFormValues = useMemo(() => ({
      name: provider?.name ?? '',
      document: (provider?.document ?? 'Otro Documento') as ProviderType['document'],
      documentNumber: provider?.documentNumber ?? '',
      description: provider?.description ?? '',
      phone: provider?.phone ?? '',
      adress: provider?.adress ?? '',
      email: provider?.email ?? '',
      website: provider?.website ?? '',
      status: (provider?.status ?? 'Activo') as ProviderType['status'],
      image: normalizeProviderImagePath(provider?.image ?? ''),
    }), [provider]);

    const emptyFormValues = useMemo(() => ({
      name: '',
      document: 'Otro Documento' as ProviderType['document'],
      documentNumber: '',
      description: '',
      phone: '',
      adress: '',
      email: '',
      website: '',
      status: 'Activo' as ProviderType['status'],
      image: '',
    }), []);

    const { version } = useTenantSelection();

    //hook de react-hook-form
    const form = useForm<ProviderType>({
    resolver: zodResolver(providerSchema),
    defaultValues: mapProviderToFormValues,
    });

  const { handleSubmit, register, setValue } = form;
  const selectedDocumentType = form.watch("document");
  const watchedName = form.watch("name");
  const watchedDocumentNumber = form.watch("documentNumber");
  const watchedDescription = form.watch("description");
  const watchedPhone = form.watch("phone");
  const watchedAdress = form.watch("adress");
  const watchedEmail = form.watch("email");
  const watchedWebsite = form.watch("website");
  const watchedImage = form.watch("image");
  const [isImageUploading, setIsImageUploading] = useState(false);

  const router = useRouter();
  const params = useParams<{id: string}>();

  // Estado para manejar el error del nombre si se repite
  const [nameError, setNameError] = useState<string | null>(null);
  const initializedVersion = useRef(false);

  useEffect(() => {
    form.reset(mapProviderToFormValues);
    setNameError(null);
  }, [form, mapProviderToFormValues]);

  useEffect(() => {
    if (!initializedVersion.current) {
      initializedVersion.current = true;
      return;
    }

    setNameError(null);
    form.reset(emptyFormValues);
    router.refresh();
  }, [version, form, emptyFormValues, router]);

  //handlesubmit para manejar los datos
  const onSubmit = handleSubmit(async (data) => {
    try{
        if (!data.documentNumber){
            toast.error("El numero de documento es obligatorio.");
            return;
        }
        // Validar el numero de documento segun el tipo de documento
        if (data.document === "DNI" && !/^\d{8}$/.test(data.documentNumber)) {
            toast.error("El numero de documento debe tener exactamente 8 digitos para DNI");
            return;
        }

        if (data.document === "RUC" && !/^\d{11}$/.test(data.documentNumber)) {
            toast.error("El numero de documento debe tener exactamente 11 digitos para RUC");
            return;
        }

        if(params?.id){
            await updateProvider(params.id, {...data})
            toast.success("Proveedor actualizado correctamente."); // NotificaciИn de ゼxito
            router.push("/dashboard/providers"),
            router.refresh();
        }
        else{
            await createProvider({...data});
            toast.success("Proveedor creado correctamente."); // NotificaciИn de ゼxito
            router.push("/dashboard/providers");
            router.refresh();
        }
    }
    catch(error: any){

        if (error.response?.status === 409 || error.response?.data?.message.includes("ya existe")) {
            setNameError(error.response?.data?.message || "El Nro de documento del proveedor ya existe.");
            console.log("Estado nameError actualizado:", error.response?.data?.message);
        } else {
            console.error("Error inesperado:", error.message);
        }
    }
        
    })

  const hasName = Boolean(watchedName?.trim())
  const hasDocument = Boolean(selectedDocumentType?.trim())
  const normalizedDocumentNumber = (watchedDocumentNumber ?? '').replace(/\D/g, '')
  const hasDocumentNumber = (() => {
    if (selectedDocumentType === "DNI") {
      return normalizedDocumentNumber.length === 8
    }
    if (selectedDocumentType === "RUC") {
      return normalizedDocumentNumber.length === 11
    }
    return Boolean((watchedDocumentNumber ?? '').trim())
  })()
  const hasDescription = Boolean(watchedDescription?.trim())
  const hasPhone = Boolean(watchedPhone?.trim())
  const hasAdress = Boolean(watchedAdress?.trim())
  const hasEmail = Boolean(watchedEmail?.trim())
  const hasWebsite = Boolean(watchedWebsite?.trim())
  const hasImage = Boolean(watchedImage?.trim())
  const imagePreview = normalizeProviderImagePath(watchedImage?.trim() ?? "")

  const handleImageFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setIsImageUploading(true)
      const response = await uploadProviderImage(file)
      if (response?.url) {
        const normalized = normalizeProviderImagePath(response.url)
        setValue("image", normalized, { shouldValidate: true })
        toast.success("Imagen cargada correctamente.")
      }
    } catch (error) {
      console.error("Error al subir la imagen:", error)
      toast.error("No se pudo subir la imagen.")
    } finally {
      setIsImageUploading(false)
      event.target.value = ""
    }
  }

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

  return (
    <div className="container mx-auto grid w-full max-w-2xl sm:max-w-2xl md:max-w-5xl lg:max-w-6xl xl:max-w-none">
      <form className='flex flex-col gap-2' onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-x-0.5 gap-y-4 md:gap-x-1 md:gap-y-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-6">
          <div className='flex flex-col lg:col-span-1'>
            <Label className='py-3'>
              Nombre del Proveedor
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
            <Input
              {...register('name')}
              maxLength={50} // Limita a 50 caracteres
            />
            {form.formState.errors.name && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col lg:col-span-1">
            <Label className='py-3'>
              Selecciona el Tipo de Documento:
              <span
                className={`ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  hasDocument
                    ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                    : 'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
                }`}
              >
                {hasDocument ? <Check className="mr-1 h-3 w-3" /> : null}
                {hasDocument ? 'Listo' : 'Requerido'}
              </span>
            </Label>
            <Select
              value={selectedDocumentType}
              defaultValue={form.getValues("document")}
              onValueChange={(value) =>
                setValue("document", value as "DNI" | "RUC" | "Otro Documento", {
                  shouldValidate: true,
                })
              }
            >
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">Selecciona el tipo de documento</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <SelectContent>
                <SelectItem value="DNI">DNI</SelectItem>
                <SelectItem value="RUC">RUC</SelectItem>
                <SelectItem value="Otro Documento">Otro Documento</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.document && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {form.formState.errors.document.message}
              </p>
            )}
          </div>

          <div className="flex flex-col lg:col-span-1">
            <Label className='py-3'>
              Numero del Documento
              <span
                className={`ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  hasDocumentNumber
                    ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                    : 'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
                }`}
              >
                {hasDocumentNumber ? <Check className="mr-1 h-3 w-3" /> : null}
                {hasDocumentNumber ? 'Listo' : 'Requerido'}
              </span>
            </Label>
            <Input
              type="text"
              maxLength={selectedDocumentType === "RUC" ? 11 : selectedDocumentType === "DNI" ? 8 : 25}
              onInput={(e) => {
                const input = e.target as HTMLInputElement;
                if (selectedDocumentType === "DNI") {
                  input.value = input.value.replace(/\D/g, "").slice(0, 8);
                } else if (selectedDocumentType === "RUC") {
                  input.value = input.value.replace(/\D/g, "").slice(0, 11);
                } else {
                  input.value = input.value.slice(0, 25);
                }
              }}
              {...register('documentNumber')}
            />
            {form.formState.errors.documentNumber && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {form.formState.errors.documentNumber.message}
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
            <Label className='py-3'>
              Selecciona un estado:
              {renderOptionalChip(Boolean(form.watch("status")))}
            </Label>
            <Select
              value={form.watch("status")}
              defaultValue={form.getValues("status")}
              onValueChange={(value) =>
                setValue("status", value as "Activo" | "Inactivo", {
                  shouldValidate: true,
                })
              }
            >
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SelectTrigger className="cursor-pointer">
                      <SelectValue />
                    </SelectTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">Selecciona el estado del proveedor</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <SelectContent>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col lg:col-span-2">
            <Label className='py-3'>
              Descripcion
              {renderOptionalChip(hasDescription)}
            </Label>
            <Input
              maxLength={100} // Limita a 100 caracteres
              {...register('description')}
            />
            {form.formState.errors.description && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <div className="flex flex-col lg:col-span-1">
            <Label className='py-3'>
              Telefono
              {renderOptionalChip(hasPhone)}
            </Label>
            <Input
              maxLength={100} // Limita a 100 caracteres
              {...register('phone')}
            />
          </div>

          <div className="flex flex-col lg:col-span-1">
            <Label className='py-3'>
              Direccion
              {renderOptionalChip(hasAdress)}
            </Label>
            <Input
              maxLength={100} // Limita a 100 caracteres
              {...register('adress')}
            />
          </div>

          <div className="flex flex-col lg:col-span-1">
            <Label className='py-3'>
              Email
              {renderOptionalChip(hasEmail)}
            </Label>
            <Input
              maxLength={100} // Limita a 100 caracteres
              {...register('email')}
            />
          </div>

          <div className="flex flex-col lg:col-span-1">
            <Label className='py-3'>
              Pagina Web
              {renderOptionalChip(hasWebsite)}
            </Label>
            <Input
              maxLength={100} // Limita a 100 caracteres
              {...register('website')}
            />
          </div>

          <div className="flex flex-col lg:col-span-2">
            <Label className='py-3'>
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
                      alt="Vista previa de proveedor"
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
                    onClick={() => setValue("image", "", { shouldValidate: true })}
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
                name: "",
                document: "Otro Documento",
                documentNumber: "",
                description: "",
                phone: "",
                adress: "",
                email: "@",
                website: "",
                image: "",
                status: "Activo", // Restablece el estado a "Activo"
              })
            }
          >
            Limpiar
          </Button>
          <Button className='w-full cursor-pointer bg-emerald-600 text-white transition-colors hover:bg-emerald-700 hover:shadow-sm dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-600 lg:w-auto lg:min-w-[160px]'>
            {params.id ? 'Actualizar Proveedor' : 'Crear Proveedor'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ProviderForm
