"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { createProduct, updateProduct } from '../products.api'
import { uploadProductImage } from '../products.api'
import { getBrands } from '../../brands/brands.api'
import { createCategory, getCategories } from '../../categories/categories.api'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { z } from 'zod'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { IconName, icons } from '@/lib/icons'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useTenantSelection } from '@/context/tenant-selection-context'

interface ProductFormProps {
  product: any
  categories: any
  onSuccess?: (savedProduct: any) => void | Promise<void>
  onCancel?: () => void
}

export function ProductForm({
  product,
  categories,
  onSuccess,
  onCancel,
}: ProductFormProps) {

    //definir el esquema de validacion
    const imageSchema = z
      .string()
      .trim()
      .refine(
        (val) =>
          val.length === 0 ||
          /^https?:\/\//.test(val) ||
          val.startsWith('/uploads'),
        'La imagen debe ser una URL valida, una ruta relativa o puede quedar vacia',
      )

    const productSchema = z.object({
    name: z.string({
      required_error: "Se requiere el nombre del producto",
    })
      .min(3, "El nombre del producto debe tener al menos 3 caracteres")
      .max(200, "El nombre del producto no puede tener mas de 200 caracteres")
      .regex(
        /^[\p{L}0-9\s]+$/u,
        "El nombre solo puede contener letras, numeros y espacios",
      ),
    description: z.string({
    }),
    brand: z.string().optional(),
    price: z.number({
      required_error: "Se requiere el precio del producto",
      }).min(0, "El precio debe ser un numero positivo")
      .max(99999999.99, "El precio no puede exceder 99999999.99"),
    priceSell: z.number({
      required_error: "Se requiere el precio de venta del producto",
      }).min(0, "El precio de venta debe ser un numero positivo")
      .max(99999999.99, "El precio no puede exceder 99999999.99"),
    images: z.array(imageSchema).optional(),
    status: z.enum(["Activo", "Inactivo"]).optional(),
    categoryId: z.string().nonempty("Debe seleccionar una categoria"), // Validar categoria
    processor: z.string().optional(),
    ram: z.string().optional(),
    storage: z.string().optional(),
    graphics: z.string().optional(),
    screen: z.string().optional(),
    resolution: z.string().optional(),
    refreshRate: z.string().optional(),
    connectivity: z.string().optional(),
    features: z
      .array(
        z.object({
          icon: z.string().optional(),
          title: z.string().min(1, 'Ingrese un titulo'),
          description: z.string().optional(),
        })
      )
      .optional(),
    }) //{name: "", lastname: "", age: z.number()}

    //inferir el tipo de dato
    type ProductType = z.infer<typeof productSchema>;

    const buildFormValues = (source?: any): ProductType => {
      const specification = source?.specification ?? {}
      const brandName =
        typeof source?.brand === 'string'
          ? source.brand
          : source?.brand?.name ?? ''

      const toNumber = (value: unknown): number => {
        if (typeof value === 'number' && Number.isFinite(value)) {
          return value
        }
        if (typeof value === 'string') {
          const parsed = Number(value)
          return Number.isFinite(parsed) ? parsed : 0
        }
        return 0
      }

      const images = Array.isArray(source?.images)
        ? source.images.filter((img: unknown): img is string => typeof img === 'string')
        : []

      const features = Array.isArray(source?.features)
        ? source.features.map((feature: any) => ({
            icon: feature?.icon ?? '',
            title: feature?.title ?? '',
            description: feature?.description ?? '',
          }))
        : []

      return {
        name: source?.name ?? '',
        description: source?.description ?? '',
        brand: brandName,
        price: toNumber(source?.price),
        priceSell: toNumber(source?.priceSell),
        images: images.length > 0 ? images : [''],
        status: (source?.status as 'Activo' | 'Inactivo') ?? 'Activo',
        categoryId:
          source?.categoryId != null
            ? String(source.categoryId)
            : source?.category?.id != null
              ? String(source.category.id)
              : '',
        processor: specification?.processor ?? '',
        ram: specification?.ram ?? '',
        storage: specification?.storage ?? '',
        graphics: specification?.graphics ?? '',
        screen: specification?.screen ?? '',
        resolution: specification?.resolution ?? '',
        refreshRate: specification?.refreshRate ?? '',
        connectivity: specification?.connectivity ?? '',
        features,
      }
    }

    const defaultValues = useMemo(() => buildFormValues(product), [product])
    const emptyProductValues = useMemo(() => buildFormValues(undefined), [])

    //hook de react-hook-form
    const form = useForm<ProductType>({
    resolver: zodResolver(productSchema),
    defaultValues,
    });

  const { handleSubmit, register, setValue, clearErrors, control } = form;
  const {
    fields: imageFields,
    append: appendImage,
    remove: removeImage,
  } = useFieldArray<ProductType, 'images'>({ control, name: 'images' });

  const {
    fields: featureFields,
    append: appendFeature,
    remove: removeFeature,
  } = useFieldArray<ProductType, 'features'>({ control, name: 'features' });

  const router = useRouter();
  const params = useParams();
  const rawRouteId = params?.id;
  const routeProductId =
    typeof rawRouteId === 'string'
      ? rawRouteId
      : Array.isArray(rawRouteId)
        ? rawRouteId[0]
        : undefined;
  const currentProductId =
    product?.id != null
      ? product.id
      : routeProductId;

  const [brands, setBrands] = useState<any[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<any[]>(categories ?? []);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const { version } = useTenantSelection();
  const tenantFetchRef = useRef(true);
  const versionResetRef = useRef(true);
  const [isLoadingBrands, setIsLoadingBrands] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  // Estado para manejar el error del nombre si se repite
  const [nameError, setNameError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  useEffect(() => {
    setCategoryOptions(categories ?? [])
    setIsLoadingCategories(false)
  }, [categories])

  useEffect(() => {
    let cancelled = false
    const skipClear = tenantFetchRef.current
    tenantFetchRef.current = false

    const loadCategories = async () => {
      if (!skipClear) {
        setCategoryOptions([])
      }
      setIsLoadingCategories(true)
      try {
        const freshCategories = await getCategories()
        if (!cancelled) {
          setCategoryOptions(
            Array.isArray(freshCategories) ? freshCategories : [],
          )
        }
      } catch (error) {
        if (!cancelled) {
          setCategoryOptions([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCategories(false)
        }
      }
    }

    const loadBrands = async () => {
      if (!skipClear) {
        setBrands([])
      }
      setIsLoadingBrands(true)
      try {
        const res = await getBrands(1, 1000)
        if (!cancelled) {
          setBrands(
            Array.isArray(res?.data)
              ? res.data.map((b: any) => ({ ...b, name: b.name.toUpperCase() }))
              : [],
          )
        }
      } catch (error) {
        if (!cancelled) {
          setBrands([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingBrands(false)
        }
      }
    }

    void loadCategories()
    void loadBrands()

    return () => {
      cancelled = true
    }
  }, [version])

  useEffect(() => {
    if (versionResetRef.current) {
      versionResetRef.current = false
      return
    }

    setNameError(null)
    setIsCategoryDialogOpen(false)
    setNewCategoryName('')
    setNewCategoryDescription('')
    setCategoryError(null)
    form.reset(emptyProductValues)
    router.refresh()
  }, [version, emptyProductValues, form, router])

  const handleCreateCategory = async () => {
    const trimmedName = newCategoryName.trim()
    const trimmedDescription = newCategoryDescription.trim()

    if (trimmedName.length === 0) {
      setCategoryError('Ingrese el nombre de la categoria')
      return
    }

    setIsCreatingCategory(true)
    setCategoryError(null)

    try {
      const createdCategory = await createCategory({
        name: trimmedName,
        description: trimmedDescription.length > 0 ? trimmedDescription : undefined,
        status: 'Activo',
        image: undefined,
      })

      setCategoryOptions((prev) => {
        const exists = prev.some((category: any) => category.id === createdCategory.id)
        if (exists) {
          return prev.map((category: any) =>
            category.id === createdCategory.id ? createdCategory : category,
          )
        }
        return [...prev, createdCategory]
      })
      const createdId = createdCategory?.id != null ? String(createdCategory.id) : ''
      if (createdId) {
        setValue('categoryId', createdId, { shouldValidate: true, shouldDirty: true, shouldTouch: true })
        clearErrors('categoryId')
        await form.trigger('categoryId')
      }
      toast.success('Categoria creada correctamente.')
      setIsCategoryDialogOpen(false)
      setNewCategoryName('')
      setNewCategoryDescription('')
      setCategoryError(null)
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Error al crear la categoria'
      if (error?.response?.status === 409 || message.includes('ya existe')) {
        setCategoryError(message)
      } else {
        toast.error(message)
      }
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadProductImage(file);
      // Store relative upload path to avoid stale host/IP issues
      let toStore = url;
      try {
        const u = new URL(url);
        if (u.pathname.startsWith('/uploads')) {
          toStore = u.pathname; // persist only the path
        }
      } catch {
        // ignore, keep original
      }
      setValue(`images.${index}` as const, toStore);
    } catch (err) {
      console.error('Error subiendo imagen', err);
    }
  };

  //handlesubmit para manejar los datos
  const onSubmit = handleSubmit(async (data) => {
    setIsProcessing(true);
    setNameError(null);
    try {
        const { processor, ram, storage, graphics, screen, resolution, refreshRate, connectivity, features, ...productData } = data
        const spec: any = {}
        if (processor) spec.processor = processor
        if (ram) spec.ram = ram
        if (storage) spec.storage = storage
        if (graphics) spec.graphics = graphics
        if (screen) spec.screen = screen
        if (resolution) spec.resolution = resolution
        if (refreshRate) spec.refreshRate = refreshRate
        if (connectivity) spec.connectivity = connectivity

        const cleanedImages =
          productData.images?.map((img) => img.trim()).filter((img) => img.length > 0) ?? []
        const brand = productData.brand?.trim().toUpperCase()

        const payload = {
            ...productData,
            brand: brand || undefined,
            images: cleanedImages,
            categoryId: Number(productData.categoryId),
            specification: Object.keys(spec).length ? spec : undefined,
            features: features && features.length
              ? features.map((f) => ({
                  icon: f.icon || undefined,
                  title: f.title,
                  description: f.description || undefined,
                }))
              : undefined,
        }

        let savedProduct: any = null
        const formProductId =
          currentProductId != null ? String(currentProductId) : undefined
        const targetProductId = formProductId ?? undefined

        if (targetProductId) {
            savedProduct = await updateProduct(targetProductId, payload)
            toast.success("Producto actualizado correctamente."); // Notificaci??n de ?xito
            if (!onSuccess) {
                router.push("/dashboard/products");
                router.refresh();
            }
        } else {
            savedProduct = await createProduct(payload);
            toast.success("Producto creado correctamente."); // Notificaci??n de ?xito
            if (!onSuccess) {
                router.push("/dashboard/products");
                router.refresh();
            }
        }

        if (onSuccess) {
            await onSuccess(savedProduct);
        }
    } catch (error: any) {
        const message = error.response?.data?.message || error.message || 'Error inesperado'

        if (error.response?.status === 409 || message.includes('ya existe')) {
            setNameError(message);
            console.log("Estado nameError actualizado:", message);
        } else {
            console.error("Error inesperado:", message);
        }
    } finally {
      setIsProcessing(false);
    }
  });

  useEffect(() => {
  if (product?.categoryId != null) {
    setValue('categoryId', String(product.categoryId), { shouldValidate: true })
  }
  // solo cuando cambia el id del producto
  }, [product?.id, setValue])

  return (
    <div className="container mx-auto max-w-lg grid sm:max-w-md md:max-w-lg lg:max-w-xl">
      <form className='relative flex flex-col gap-2' onSubmit={onSubmit}>
        {isProcessing && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-foreground">Registrando producto...</p>
            </div>
          </div>
        )}
        <fieldset disabled={isProcessing} className="contents">
                    <div className='flex flex-col'>
                        <Label className='py-3'>
                            Nombre del Producto
                        </Label>
                        <Input
                        {...register('name')}
                        maxLength={200} // Limita a 50 caracteres
                        ></Input>
                        {form.formState.errors.name && (
                            <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
                        )}
                        {nameError && (
                            <p className="text-red-500 text-sm">{nameError}</p> // Muestra el error del nombre duplicado
                        )}
                    </div>
                    
                    <div className="flex flex-col">
                        <Label className='py-3'>
                            Descripcion
                        </Label>
                        <Input
                        maxLength={200} // Limita a 100 caracteres
                        {...register('description')}></Input>
                        {form.formState.errors.description && (
                            <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <Label className='py-3'>
                            Marca
                        </Label>
                        <Input
                        disabled={isProcessing || isLoadingBrands}
                        list="brand-options"
                        maxLength={50}
                        {...register('brand')}></Input>
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
                            <p className="text-red-500 text-sm">{form.formState.errors.brand.message}</p>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <Label className='py-3'>
                            Precio
                        </Label>
                        <Input 
                        step="0.01" // Permite valores con dos decimales
                        min={0} // Valor minimo permitido
                        max={99999999.99} // Valor maximo permitido
                        type="number" 
                        {...register('price', {valueAsNumber: true})}></Input>
                        {form.formState.errors.price && (
                            <p className="text-red-500 text-sm">{form.formState.errors.price.message}</p>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <Label className='py-3'>
                            Precio de Venta
                        </Label>
                        <Input 
                        step="0.01" // Permite valores con dos decimales
                        min={0} // Valor minimo permitido
                        max={99999999.99} // Valor maximo permitido
                        type="number"
                        {...register('priceSell', {valueAsNumber: true})}></Input>
                        {form.formState.errors.priceSell && (
                            <p className="text-red-500 text-sm">{form.formState.errors.priceSell.message}</p>
                        )}
                    </div>

                    <div className="flex flex-col">
                        {/* CATEGORIA */}
                        <Label className='py-3'>Categoria</Label>
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
                                      value={field.value ?? ''}                         // valor controlado
                                      onValueChange={(val) => { field.onChange(val); clearErrors('categoryId') }}
                                    >
                                      <SelectTrigger className="w-full border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
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
                                    {fieldState.error && (
                                      <p className="text-red-500">{fieldState.error.message}</p>
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
                            <DialogTrigger asChild>
                              <Button type="button" size="sm" variant="outline" className="whitespace-nowrap">
                                Nueva
                              </Button>
                            </DialogTrigger>
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
                        {form.formState.errors.categoryId && (
                            <p className="text-red-500">
                            {form.formState.errors.categoryId.message}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col pt-4">
                        <Label className='py-3 font-semibold'>Especificaciones (opcional)</Label>
                        <Input placeholder='Procesador' {...register('processor')} className='mb-2'></Input>
                        <Input placeholder='RAM' {...register('ram')} className='mb-2'></Input>
                        <Input placeholder='Almacenamiento' {...register('storage')} className='mb-2'></Input>
                        <Input placeholder='Graficos' {...register('graphics')} className='mb-2'></Input>
                        <Input placeholder='Pantalla' {...register('screen')} className='mb-2'></Input>
                        <Input placeholder='Resolucion' {...register('resolution')} className='mb-2'></Input>
                        <Input placeholder='Tasa de refresco' {...register('refreshRate')} className='mb-2'></Input>
                        <Input placeholder='Conectividad' {...register('connectivity')}></Input>
                    </div>

                    <div className="flex flex-col pt-4">
                        <Label className='py-3 font-semibold'>Caracteristicas (opcional)</Label>
                        {featureFields.map((field, index) => (
                          <div key={field.id} className="flex flex-col md:flex-row gap-2 mb-2">
                            <Select
                              disabled={isProcessing}
                              value={form.watch(`features.${index}.icon` as const)}
                              onValueChange={(value:any) =>
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
                            <Input placeholder='Titulo' {...register(`features.${index}.title` as const)} className='flex-1'/>
                            <Input placeholder='Descripcion' {...register(`features.${index}.description` as const)} className='flex-1'/>
                            {index > 0 && (
                              <Button type='button' variant='destructive' onClick={() => removeFeature(index)}>-</Button>
                            )}
                          </div>
                        ))}
                        <Button type='button' variant='outline' onClick={() => appendFeature({ icon: '', title: '', description: '' })}>Agregar caracteristica</Button>
                    </div>

                    <div className="flex flex-col">
                        <Label className='py-3'>
                            Seleccion un estado
                        </Label>
                        <Select value={form.watch("status")} disabled={isProcessing} // Sincroniza el valor del Select con el formulario
                        defaultValue={form.getValues("status")} onValueChange={(value:any) => setValue("status", value as "Activo" | "Inactivo", {shouldValidate: true})}>
                            <SelectTrigger>
                                <SelectValue /> {/*placeholder="Estado" */}
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Activo">Activo</SelectItem>
                                <SelectItem value="Inactivo">Inactivo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button className='mt-4'>
                        {
                            currentProductId ? 'Actualizar Producto' : 'Crear Producto'
                        }
                    </Button>
                    <Button className=''
                    type="button" // Evita que el boton envie el formulario
                    onClick={() => 
                        form.reset({
                            name: "",
                            description: "",
                            brand: "",
                            price: 0.0,
                            priceSell: 0.0,
                            images: [""],
                            status: "Activo", // Restablece el estado a "Activo"
                            categoryId: "",
                            processor: "",
                            ram: "",
                            storage: "",
                            graphics: "",
                            screen: "",
                            resolution: "",
                            refreshRate: "",
                            connectivity: "",
                            features: [],
                        })
                    } // Restablece el estado a "Activo"})} // Restablece los campos del formulario
                    >
                        Limpiar
                    </Button>
                    <Button 
                    className=""
                    type="button" // Evita que el boton envie el formulario
                    onClick={() => {
                        if (onCancel) {
                            onCancel()
                        } else {
                            router.back()
                        }
                    }} // Regresa a la pagina anterior o ejecuta onCancel
                    >
                        Volver
                    </Button>
        </fieldset>
      </form>
    </div>
  )
}

export default ProductForm
























