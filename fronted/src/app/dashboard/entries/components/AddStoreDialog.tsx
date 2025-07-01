import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { checkStoreExists, createStore } from "../../stores/stores.api";
import { UseFormSetValue } from "react-hook-form";
import { EntriesType } from "../new/entries.form";

interface AddStoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  setStores: React.Dispatch<React.SetStateAction<{ id: number; name: string; description:string; ruc:string; adress: string }[]>>;
  setValue: UseFormSetValue<EntriesType>; // Para actualizar valores en el formulario principal
}

export function AddStoreDialog({ isOpen, onClose, setStores, setValue }: AddStoreDialogProps) {
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreAddress, setNewStoreAddress] = useState("");
  const [newStoreDescription, setNewStoreDescription] = useState("");
  const [newStoreRuc, setNewStoreRuc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddStore = async () => {
    if (!newStoreName || !newStoreAddress) {
      toast.error("Por favor, completa los campos Nombre y Direccion de la tienda.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Verificar si la tienda ya existe
      const exists = await checkStoreExists(newStoreName);
      if (exists) {
        toast.error("El proveedor ya existe en la base de datos.");
        return;
      }

      // Crear la tienda en el backend
      const createdStore = await createStore({
        name: newStoreName,
        description: newStoreDescription || "Descripción predeterminada",
        ruc: newStoreRuc,
        adress: newStoreAddress,
      });

      if (createdStore && createdStore.id) {
        // Actualizar la lista de tiendas en el componente principal
        setStores((prev) => [...prev, createdStore]);

        // Actualizar los valores del formulario principal
        setValue("store_name", createdStore.name);
        setValue("store_adress", createdStore.adress);

        // Limpiar los campos y cerrar el diálogo
        setNewStoreName("");
        setNewStoreAddress("");
        setNewStoreDescription("");
        setNewStoreRuc("");
        onClose();
        toast.success("Tienda agregada correctamente.");
      } else {
        throw new Error("No se pudo crear la tienda. Verifique los datos ingresados.");
      }
    } catch (error: any) {
      console.error("Error al agregar la tienda:", error);
      toast.error(error.message || "Error al agregar la tienda.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Agregar Nueva Tienda</AlertDialogTitle>
          <AlertDialogDescription>
            Completa los campos para registrar una nueva tienda.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="new-store-name" className="text-sm font-medium">
              Nombre de la tienda
            </Label>
            <Input
              id="new-store-name"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              placeholder="Ingresa el nombre de la tienda"
              maxLength={100}
            />
          </div>
          <div>
            <Label htmlFor="new-store-description" className="text-sm font-medium">
              Descripcion / Razon Social(Opcional)
            </Label>
            <Input
              id="new-store-description"
              value={newStoreDescription}
              onChange={(e) => setNewStoreDescription(e.target.value)}
              placeholder="Ingresa las descripcion/razon social de la tienda(Opcional)"
              maxLength={100}
            />
          </div>
          <div>
            <Label htmlFor="new-store-ruc" className="text-sm font-medium">
              RUC(Opcional)
            </Label>
            <Input
              id="new-store-ruc"
              value={newStoreRuc}
              onChange={(e) => {
                // Permitir solo números y limitar a 11 caracteres
                const value = e.target.value.replace(/\D/g, ''); // Elimina caracteres no numéricos
                setNewStoreRuc(value.slice(0, 11)); // Limita a 11 caracteres
              }}
              placeholder="Ingresa el ruc de la tienda(Opcional)"
              maxLength={11}
            />
          </div>
          <div>
            <Label htmlFor="new-store-address" className="text-sm font-medium">
              Dirección de la tienda
            </Label>
            <Input
              id="new-store-address"
              value={newStoreAddress}
              onChange={(e) => setNewStoreAddress(e.target.value)}
              placeholder="Ingresa la dirección de la tienda"
              maxLength={100}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleAddStore} disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AddStoreDialog;