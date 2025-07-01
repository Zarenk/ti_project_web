"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { createStore, updateStore } from '../stores.api'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { SelectTrigger, SelectValue } from '@radix-ui/react-select'
import { Select, SelectContent, SelectItem } from '@/components/ui/select'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'


export function StoreForm({store}: {store: any}) {

    //definir el esquema de validacion
    const storeSchema = z.object({
    name: z.string({
      required_error: "Se requiere el nombre de la tienda",
    })
      .min(3, "El nombre de la tienda debe tener al menos 3 caracteres")
      .max(50, "El nombre de la tienda no puede tener más de 50 caracteres")
      .regex(/^[a-zA-Z0-9\s]+$/, "El nombre solo puede contener letras, números y espacios"),
    description: z.string({
    }),
    ruc: z.string({
        required_error: "Se requiere el RUC",
      })
      .length(11, "El RUC debe tener exactamente 11 dígitos")
      .regex(/^\d{11}$/, "El RUC solo puede contener números"),
    phone: z.string({
    }),
    adress: z.string({
    }),
    email: z.string({
    }),
    website: z.string({
    }),
    image: z.string()
      .url("La imagen debe ser una URL válida") // Valida que sea una URL válida
      //.regex(/\.(jpg|jpeg|png|gif)$/i, "La imagen debe tener una extensión válida (.jpg, .jpeg, .png, .gif)") // Valida extensiones
      .optional() // El campo es opcional
      .or(z.literal("")), // Permite que el campo sea una cadena vacía
    status: z.enum(["Activo", "Inactivo"]).optional(),
    }) //{name: "", lastname: "", age: z.number()}

    //inferir el tipo de dato
    type StoreType = z.infer<typeof storeSchema>;

    //hook de react-hook-form
    const form = useForm<StoreType>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
        name: store?.name || '',
        description: store?.description || '',
        ruc: store?.ruc || '',
        phone: store?.phone || '',
        adress: store?.adress || '',
        email: store?.email || '',
        website: store?.website || '',
        status: store?.status || "Activo" , // Valor predeterminado
        image: store?.image || '',       
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

        if(params?.id){
            await updateStore(params.id, {...data})
            toast.success("Tienda actualizada correctamente."); // Notificación de éxito
            router.push("/dashboard/stores"),
            router.refresh();
        }
        else{
            await createStore({...data});
            toast.success("Tienda creada correctamente."); // Notificación de éxito
            router.push("/dashboard/stores");
            router.refresh();
        }
    }
    catch(error: any){

        if (error.response?.status === 409 || error.response?.data?.message.includes("ya existe")) {
            setNameError(error.response?.data?.message || "El nombre de la tienda ya existe.");
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
                            Nombre de la Tienda
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
                            Descripcion / RAZON SOCIAL
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
                            RUC
                        </Label>
                        <Input
                            maxLength={11} // Limita a 11 caracteres
                            {...register('ruc', {
                            onChange: (e) => {
                                // Permite solo números
                                e.target.value = e.target.value.replace(/\D/g, '');
                            },
                            })}
                            onInput={(e) => {
                            // Restringe la entrada a solo números
                            const input = e.target as HTMLInputElement;
                            input.value = input.value.replace(/\D/g, ''); // Reemplaza cualquier carácter no numérico
                            }}
                        />
                        {form.formState.errors.ruc && (
                            <p className="text-red-500 text-sm">{form.formState.errors.ruc.message}</p>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <Label className='py-3'>
                            Telefono
                        </Label>
                        <Input
                        maxLength={100} // Limita a 100 caracteres
                        {...register('phone')}></Input>
                        {form.formState.errors.description && (
                            <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <Label className='py-3'>
                            Direccion
                        </Label>
                        <Input
                        maxLength={100} // Limita a 100 caracteres
                        {...register('adress')}></Input>
                        {form.formState.errors.description && (
                            <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <Label className='py-3'>
                            Email
                        </Label>
                        <Input
                        maxLength={100} // Limita a 100 caracteres
                        {...register('email')}></Input>
                        {form.formState.errors.description && (
                            <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>
                        )}
                    </div>

                    <div className="flex flex-col">
                        <Label className='py-3'>
                            Pagina Web
                        </Label>
                        <Input
                        maxLength={100} // Limita a 100 caracteres
                        {...register('website')}></Input>
                        {form.formState.errors.description && (
                            <p className="text-red-500 text-sm">{form.formState.errors.description.message}</p>
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
                            params.id ? 'Actualizar Tienda' : 'Crear Tienda'
                        }
                    </Button>
                    <Button className=''
                    type="button" // Evita que el botón envíe el formulario
                    onClick={() => 
                        form.reset({
                            name: "",
                            description: "",
                            phone: "",
                            adress: "",
                            email: "@",
                            website: "",
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

export default StoreForm

