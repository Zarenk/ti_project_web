import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner";
import { checkProviderExists, createProvider } from "../../providers/providers.api";
import { useState } from "react";
import { UseFormSetValue } from "react-hook-form";
import { EntriesType } from "../new/entries.form";

interface AddStoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  setProviders: React.Dispatch<React.SetStateAction<{ id: number; name: string; description:string; adress: string }[]>>;
  setValue: UseFormSetValue<EntriesType>; // Para actualizar valores en el formulario principal
}

export function AddProviderDialog({ isOpen, onClose, setProviders, setValue }: AddStoreDialogProps) {

  const [newProviderName, setNewProviderName] = useState(""); // Estado para el nombre del nuevo proveedor
  const [newProviderAddress, setNewProviderAddress] = useState(""); // Estado para la dirección del nuevo proveedor
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddProvider = async () => {
    // Aquí puedes realizar la lógica para registrar el nuevo proveedor
    if (!newProviderName || !newProviderAddress) {
      toast.error("Por favor, completa todos los campos.");
      return;
    }

    try {
      // Verificar si el proveedor ya existe
      const exists = await checkProviderExists(newProviderName);

      if (exists) {
        // Si el proveedor ya existe, muestra un mensaje de error
        toast.error("El proveedor ya existe en la base de datos.");
        return;
      }

      // Crear el proveedor en el backend
      const createdProvider = await createProvider({
        name: newProviderName,
        adress: newProviderAddress,
        description: "Descripción predeterminada",
      });

      if (createdProvider && createdProvider.id) {
        // Simula agregar el proveedor a la lista
        setProviders((prev) => [...prev, createdProvider]);
        setValue("provider_name", createdProvider.name); // Setea el nombre del proveedor en el formulario
        setValue("provider_adress", createdProvider.adress); // Setea la dirección del proveedor en el formulario
        setNewProviderName(""); // Limpia los campos
        setNewProviderAddress("");
        toast.success("Proveedor agregado correctamente.");
        onClose(); // Cierra el diálogo
      }else{
        throw new Error("No se pudo crear el proveedor. Verifique los datos ingresados.");
      }
    } catch(error:any){
      console.error("Error al agregar el proveedor:", error);
      toast.error(error.message || "Error al agregar el proveedor.")
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Agregar Nuevo Proveedor</AlertDialogTitle>
                    <AlertDialogDescription>
                        Completa los campos para registrar un nuevo proveedor.
                    </AlertDialogDescription>
            </AlertDialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="new-provider-name" className="text-sm font-medium">
                        Nombre del Proveedor
                        </Label>
                        <Input
                        id="new-provider-name"
                        value={newProviderName}
                        onChange={(e) => setNewProviderName(e.target.value)}
                        placeholder="Ingresa el nombre del proveedor"
                        maxLength={100} // Agregado maxLength
                        />
                    </div>
                    <div>
                        <Label htmlFor="new-provider-address" className="text-sm font-medium">
                        Dirección del Proveedor
                        </Label>
                        <Input
                        id="new-provider-address"
                        value={newProviderAddress}
                        onChange={(e) => setNewProviderAddress(e.target.value)}
                        placeholder="Ingresa la dirección del proveedor"
                        maxLength={100} // Agregado maxLength
                        />
                    </div>
                </div>
            <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleAddProvider} disabled={isSubmitting}>
                        {isSubmitting ? "Guardando..." : "Guardar"}
                    </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
  )
}

export default AddProviderDialog
