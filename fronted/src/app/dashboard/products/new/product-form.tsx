"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { createProduct, updateProduct } from '../products.api'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { SelectTrigger, SelectValue } from '@radix-ui/react-select'
import { Select, SelectContent, SelectItem } from '@/components/ui/select'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export function ProductForm({product, categories}: {product: any; categories: any}) {

    //definir el esquema de validacion
    const productSchema = z.object({
    name: z.string({
      required_error: "Se requiere el nombre del producto",
    })
      .min(3, "El nombre del producto debe tener al menos 3 caracteres")
      .max(50, "El nombre del producto no puede tener más de 50 caracteres")
      .regex(/^[a-zA-Z0-9\s]+$/, "El nombre solo puede contener letras, números y espacios"),
    description: z.string({
    }),
    price: z.number({
      required_error: "Se requiere el precio del producto",
      }).min(0, "El precio debe ser un número positivo")
      .max(99999999.99, "El precio no puede exceder 99999999.99"),
    priceSell: z.number({
      required_error: "Se requiere el precio de venta del producto",
      }).min(0, "El precio de venta debe ser un número positivo")
      .max(99999999.99, "El precio no puede exceder 99999999.99"),
    image: z.string()
      .url("La imagen debe ser una URL válida") // Valida que sea una URL válida
      //.regex(/\.(jpg|jpeg|png|gif)$/i, "La imagen debe tener una extensión válida (.jpg, .jpeg, .png, .gif)") // Valida extensiones
      .optional() // El campo es opcional
      .or(z.literal("")), // Permite que el campo sea una cadena vacía
    status: z.enum(["Activo", "Inactivo"]).optional(),
    categoryId: z.string().nonempty("Debe seleccionar una categoría"), // Validar categoría
    }) //{name: "", lastname: "", age: z.number()}

    //inferir el tipo de dato
    type ProductType = z.infer<typeof productSchema>;

    //hook de react-hook-form
    const form = useForm<ProductType>({
    resolver: zodResolver(productSchema),
    defaultValues: {
        name: product?.name || '',
        description: product?.description || '',
        price: product?.price || 0.00,
        priceSell: product?.priceSell || 0.00,
        status: product?.status || "Activo" , // Valor predeterminado
        image: product?.image || '',       
        categoryId: product?.categoryId? String(product.categoryId) : '',
    }
    });

  const { handleSubmit, register, setValue } = form;

  const router = useRouter();
  const params = useParams<{id: string}>();

  // Estado para manejar el error del nombre si se repite
  const [nameError, setNameError] = useState<string | null>(null);

  //handlesubmit para manejar los datos
  const onSubmit = handleSubmit(async (data) => {
    try{
        const payload={
            ...data,
            categoryId: Number(data.categoryId), // Convierte categoryId a un número
        }

        if(params?.id){
            await updateProduct(params.id, payload)
            toast.success("Producto actualizado correctamente."); // Notificación de éxito
            router.push("/dashboard/products"),
            router.refresh();
        }
        else{
            await createProduct(payload);
            toast.success("Producto creado correctamente."); // Notificación de éxito
            router.push("/dashboard/products");
            router.refresh();
        }
    }
    catch(error: any){

        if (error.response?.status === 409 || error.response?.data?.message.includes("ya existe")) {
            setNameError(error.response?.data?.message || "El nombre del producto ya existe.");
            console.log("Estado nameError actualizado:", error.response?.data?.message);
        } else {
            console.error("Error inesperado:", error.message);
        }
    }
        
    })      

    useEffect(() => {
        console.log("Estado nameError:", nameError);
        if (product?.categoryId) {
          setValue('categoryId', String(product.categoryId)); // Setea el valor inicial del categoryId
        }
    }, [nameError, product, setValue]);

  return (
    <div className="container mx-auto max-w-lg grid sm:max-w-md md:max-w-lg lg:max-w-xl">
      <form className='flex flex-col gap-2'onSubmit={onSubmit}>
                    <div className='flex flex-col'>
                        <Label className='py-3'>
                            Nombre del Producto
                        </Label>
                        <Input
                        {...register('name')}
                        maxLength={50} // Limita a 50 caracteres
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
                        maxLength={100} // Limita a 100 caracteres
                        {...register('description')}></Input>
                        {form.formState.errors.description && (
                            <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <Label className='py-3'>
                            Precio
                        </Label>
                        <Input 
                        step="0.01" // Permite valores con dos decimales
                        min={0.00} // Valor mínimo permitido
                        max={99999999.99} // Valor máximo permitido
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
                        min={0.00} // Valor mínimo permitido
                        max={99999999.99} // Valor máximo permitido
                        type="number"
                        {...register('priceSell', {valueAsNumber: true})}></Input>
                        {form.formState.errors.priceSell && (
                            <p className="text-red-500 text-sm">{form.formState.errors.priceSell.message}</p>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <Label className='py-3'>
                            Imagen
                        </Label>                
                        <Input
                        maxLength={200} // Limita a 100 caracteres
                        {...register('image')}></Input>
                        {form.formState.errors.image && (
                            <p className="text-red-500 text-sm">{form.formState.errors.image.message}</p>
                        )}
                    </div>
                    
                    <div className="flex flex-col">
                        {/* CATEGORIA */}
                        <Label className='py-3'>Categoría</Label>                    
                        <Select
                            value={form.watch("categoryId")}                       
                            onValueChange={(value) => setValue("categoryId", value, { shouldValidate: true })
                        }
                        >                      
                            <SelectTrigger className="border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <SelectValue placeholder="Seleccione una categoría">
                                    {categories.find((category: any) => String(category.id) === form.watch("categoryId"))?.name || "Seleccione una categoria"}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border border-gray-400 rounded-lg max-h-60 overflow-y-auto">
                            {categories.map((category: any) => (
                                <SelectItem 
                                key={category.id} 
                                value={String(category.id)}
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                >
                                {category.name}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        {form.formState.errors.categoryId && (
                            <p className="text-red-500">
                            {form.formState.errors.categoryId.message}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <Label className='py-3'>
                            Seleccion un estado
                        </Label>
                        <Select value={form.watch("status")} // Sincroniza el valor del Select con el formulario
                        defaultValue={form.getValues("status")} onValueChange={(value) => setValue("status", value as "Activo" | "Inactivo", {shouldValidate: true})}>
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
                            params.id ? 'Actualizar Producto' : 'Crear Producto'
                        }
                    </Button>
                    <Button className=''
                    type="button" // Evita que el botón envíe el formulario
                    onClick={() => 
                        form.reset({
                            name: "",
                            description: "",
                            price: 0.0,
                            priceSell: 0.0,
                            image: "",
                            status: "Activo", // Restablece el estado a "Activo"
                            categoryId: "",
                        })
                    } // Restablece el estado a "Activo"})} // Restablece los campos del formulario
                    >
                        Limpiar
                    </Button>
                    <Button 
                    className=""
                    type="button" // Evita que el botón envíe el formulario
                    onClick={() => router.back()} // Regresa a la página anterior
                    >
                        Volver
                    </Button>
        </form>
    </div>
  )
}

export default ProductForm

