"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { SelectTrigger, SelectValue } from '@radix-ui/react-select'
import { Select, SelectContent, SelectItem } from '@/components/ui/select'
import { z } from 'zod'
import { createCategory, updateCategory } from '../categories.api'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'


export function CategoryForm({product}: any) {

    //definir el esquema de validacion
    const categorySchema = z.object({
    name: z.string({
      required_error: "Se requiere el nombre de la categoria",
    })
      .min(3, "El nombre de la categoria debe tener al menos 3 caracteres")
      .max(50, "El nombre de la categoria no puede tener más de 50 caracteres")
      .regex(/^[a-zA-Z0-9\s]+$/, "El nombre solo puede contener letras, números y espacios"),
    description: z.string({
    }),
    image: z.string()
      .url("La imagen debe ser una URL válida") // Valida que sea una URL válida
      //.regex(/\.(jpg|jpeg|png|gif)$/i, "La imagen debe tener una extensión válida (.jpg, .jpeg, .png, .gif)") // Valida extensiones
      .optional() // El campo es opcional
      .or(z.literal("")), // Permite que el campo sea una cadena vacía
    status: z.enum(["Activo", "Inactivo"]).optional(),
    }) //{name: "", lastname: "", age: z.number()}

    //inferir el tipo de dato
    type CategoryType = z.infer<typeof categorySchema>;

    //hook de react-hook-form
    const form = useForm<CategoryType>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
        name: product?.name || '',
        description: product?.description || '',
        status: product?.status || "Activo" , // Valor predeterminado
        image: product?.image || '',       
    }
    });

  const { handleSubmit, register, setValue} = form;

  const router = useRouter();
  const params = useParams<{id: string}>();

  // Estado para manejar el error del nombre si se repite
const [nameError, setNameError] = useState<string | null>(null);

  //handlesubmit para manejar los datos
  const onSubmit = handleSubmit(async (data) => {
    try{
        if(params?.id){
            await updateCategory(params.id,{
            ...data,});
            toast.success("Categoria actualizada correctamente."); // Notificación de éxito
            router.push("/dashboard/categories"),
            router.refresh();
        }
        else{
            await createCategory({
                ...data,});
                toast.success("Categoria creada correctamente."); // Notificación de éxito
                router.push("/dashboard/categories");
                router.refresh();
        }    
    }
    catch(error: any){

        if (error.response?.status === 409 || error.response?.data?.message.includes("ya existe")) {
            setNameError(error.response?.data?.message || "El nombre de la categoria ya existe.");
            console.log("Estado nameError actualizado:", error.response?.data?.message);
        } else {
            console.error("Error inesperado:", error.message);
        }
    }  
    })       


  return (
    <div className="container mx-auto max-w-lg grid sm:max-w-md md:max-w-lg lg:max-w-xl">
      <form className='flex flex-col gap-2'onSubmit={onSubmit}>
                <div className='flex flex-col'>
                    <Label className='py-3'>
                        Nombre de la Categoria
                    </Label>
                    <Input
                    {...register('name')}></Input>
                    {form.formState.errors.name && (
                        <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
                    )}
                    {nameError && (
                            <p className="text-red-500 text-sm">{nameError}</p> // Muestra el error del nombre duplicado
                    )}
                </div>
                <div className='flex flex-col'>
                    <Label className='py-3'>
                        Descripcion
                    </Label>
                    <Input
                    {...register('description')}></Input>
                    {form.formState.errors.description && (
                        <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>
                    )}
                </div>
                <div className='flex flex-col'>                    
                    <Label className='py-3'>
                        Imagen
                    </Label>                
                    <Input
                    {...register('image')}></Input>
                    {form.formState.errors.image && (
                        <p className="text-red-500 text-sm">{form.formState.errors.image.message}</p>
                    )}
                </div>
                <div className='flex flex-col'>
                    <Label className='py-3'>
                        Seleccion un estado
                    </Label>
                    <Select value={form.watch("status")}
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
                            params.id ? 'Actualizar Categoria' : 'Crear Categoria'
                        }
                    </Button><Button className=''
                    type="button" // Evita que el botón envíe el formulario
                    onClick={() => 
                        form.reset({
                            name: "",
                            description: "",
                            image: "",
                            status: "Activo", // Restablece el estado a "Activo"
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

export default CategoryForm
