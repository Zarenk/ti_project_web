import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, AlertTriangle } from "lucide-react";
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

  const hasName = Boolean(newStoreName && String(newStoreName).trim().length > 0);
  const hasRazon = Boolean(newStoreDescription && String(newStoreDescription).trim().length > 0);
  const hasRuc = Boolean(newStoreRuc && String(newStoreRuc).trim().length === 11);
  const canSave = hasName && hasRazon && hasRuc && !isSubmitting;

  const handleAddStore = async () => {
    if (!hasName || !hasRazon || !hasRuc) {
      toast.error("Por favor completa Nombre, Razon Social y RUC (11 dígitos) antes de guardar.");
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
              <span
                className={`ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  hasName
                    ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                    : 'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
                }`}
              >
                {hasName ? <Check className="h-3 w-3" /> : null}
                {hasName ? 'Listo' : 'Requerido'}
              </span>
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
              Razon Social
              <span
                className={`ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  hasRazon
                    ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                    : 'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
                }`}
              >
                {hasRazon ? <Check className="h-3 w-3" /> : null}
                {hasRazon ? 'Listo' : 'Requerido'}
              </span>
            </Label>
            <Input
              id="new-store-description"
              value={newStoreDescription}
              onChange={(e) => setNewStoreDescription(e.target.value)}
              placeholder="Ingresa la razon social de la tienda"
              maxLength={100}
            />
          </div>
          <div>
            <Label htmlFor="new-store-ruc" className="text-sm font-medium">
              RUC
              <span
                className={`ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  hasRuc
                    ? 'border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                    : 'border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'
                }`}
              >
                {hasRuc ? <Check className="h-3 w-3" /> : null}
                {hasRuc ? 'Listo' : 'Requerido'}
              </span>
            </Label>
            <Input
              id="new-store-ruc"
              value={newStoreRuc}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setNewStoreRuc(value.slice(0, 11));
              }}
              placeholder="Ingresa el RUC (11 dígitos)"
              maxLength={11}
            />
            {!hasRuc && newStoreRuc.length > 0 && (
              <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-rose-200/70 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                RUC debe tener 11 dígitos.
              </p>
            )}
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
          <AlertDialogAction onClick={handleAddStore} disabled={!canSave}>
            {isSubmitting ? "Guardando..." : "Guardar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AddStoreDialog;