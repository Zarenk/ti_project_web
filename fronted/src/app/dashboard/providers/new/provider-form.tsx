"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { createProvider, updateProvider } from '../providers.api'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams, useRouter } from 'next/navigation'
import { SelectTrigger, SelectValue } from '@radix-ui/react-select'
import { Select, SelectContent, SelectItem } from '@/components/ui/select'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'


export function ProviderForm({provider}: {provider: any}) {

    //definir el esquema de validacion
    const providerSchema = z.object({
    name: z.string({
      required_error: "Se requiere el nombre del proveedor",
    })
      .min(3, "El nombre del proveedor debe tener al menos 3 caracteres")
      .max(50, "El nombre del proveedor no puede tener más de 50 caracteres")
      .regex(/^[a-zA-Z0-9\s]+$/, "El nombre solo puede contener letras, números y espacios"),
    document: z.enum(["Sin Documento", "DNI", "RUC"], {
        required_error: "El tipo de documento es obligatorio",
      }),
    documentNumber: z.string({}),
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
      .url("La imagen debe ser una URL válida") // Valida que sea una URL válida
      //.regex(/\.(jpg|jpeg|png|gif)$/i, "La imagen debe tener una extensión válida (.jpg, .jpeg, .png, .gif)") // Valida extensiones
      .optional() // El campo es opcional
      .or(z.literal("")), // Permite que el campo sea una cadena vacía
    status: z.enum(["Activo", "Inactivo"]).optional(),
    }) //{name: "", lastname: "", age: z.number()}

    //inferir el tipo de dato
    type ProviderType = z.infer<typeof providerSchema>;

    //hook de react-hook-form
    const form = useForm<ProviderType>({
    resolver: zodResolver(providerSchema),
    defaultValues: {
        name: provider?.name || '',
        document: provider?.document || "Sin Documento",
        documentNumber: provider?.documentNumber || '', 
        description: provider?.description || '',
        phone: provider?.phone || '',
        adress: provider?.adress || '',
        email: provider?.email || '',
        website: provider?.website || '',
        status: provider?.status || "Activo" , // Valor predeterminado
        image: provider?.image || '',       
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
        // Validar el número de documento según el tipo de documento
        if (data.document === "DNI" && !/^\d{8}$/.test(data.documentNumber)) {
            toast.error("El número de documento debe tener exactamente 8 dígitos para DNI");
            return;
        }

        if (data.document === "RUC" && !/^\d{11}$/.test(data.documentNumber)) {
            toast.error("El número de documento debe tener exactamente 11 dígitos para RUC");
            return;
        }

        if (data.document === "Sin Documento" && data.documentNumber) {
            toast.error("No se debe ingresar un número de documento para 'Sin Documento'");
            return;
        }

        if(params?.id){
            await updateProvider(params.id, {...data})
            toast.success("Proveedor actualizado correctamente."); // Notificación de éxito
            router.push("/dashboard/providers"),
            router.refresh();
        }
        else{
            await createProvider({...data});
            toast.success("Proveedor creado correctamente."); // Notificación de éxito
            router.push("/dashboard/providers");
            router.refresh();
        }
    }
    catch(error: any){

        if (error.response?.status === 409 || error.response?.data?.message.includes("ya existe")) {
            setNameError(error.response?.data?.message || "El nombre del proveedor ya existe.");
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
                            Nombre del Proveedor
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
                            Seleccione el Tipo de Documento
                        </Label>
                        <Select value={form.watch("document")} // Sincroniza el valor del Select con el formulario
                        defaultValue={form.getValues("document")} onValueChange={(value) => setValue("document", value as "DNI" | "RUC" | "Sin Documento", {shouldValidate: true})}>
                            <SelectTrigger>
                                <SelectValue /> {/*placeholder="Documento" */}
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DNI">DNI</SelectItem>
                                <SelectItem value="RUC">RUC</SelectItem>
                                <SelectItem value="Sin Documento">Sin Documento</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col">
                        <Label className='py-3'>
                            Numero del Documento
                        </Label>
                        <Input
                        type="text" // Mantén el tipo como "text" para que el valor sea una cadena
                        maxLength={11} // Limita a 100 caracteres
                        onInput={(e) => {
                            const input = e.target as HTMLInputElement;
                            input.value = input.value.replace(/\D/g, ""); // Reemplaza cualquier carácter no numérico
                        }}
                        {...register('documentNumber')}></Input>
                        {form.formState.errors.documentNumber && (
                            <p className="text-red-500 text-sm">{form.formState.errors.documentNumber.message}</p>
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
                            params.id ? 'Actualizar Proveedor' : 'Crear Proveedor'
                        }
                    </Button>
                    <Button className=''
                    type="button" // Evita que el botón envíe el formulario
                    onClick={() => 
                        form.reset({
                            name: "",
                            document: "Sin Documento",
                            documentNumber: "",
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

export default ProviderForm

