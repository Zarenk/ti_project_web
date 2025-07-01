import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { checkStoreExists, createStore } from "../../stores/stores.api";
import { UseFormSetValue } from "react-hook-form";
import { SalesType } from "../new/sales-form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { checkClientExists, createClient } from "../../clients/clients.api";

interface AddClientDialogProps {
  isOpen: boolean;
  onClose: () => void;
  setClients: React.Dispatch<React.SetStateAction<{ id: number; name: string; type:string; typeNumber:string; }[]>>;
  setValue: UseFormSetValue<SalesType>; // Para actualizar valores en el formulario principal
  updateTipoComprobante: (tipoComprobante: string) => void;
}

export function AddClientDialog({ isOpen, onClose, setClients, setValue, updateTipoComprobante }: AddClientDialogProps) {
  const [newClientName, setNewClientName] = useState("");
  const [newClientNumberType, setNewClientNumberType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

// COMBOBOX DE COMPROBANTE
const [openType, setOpenType] = useState(false); // Controla si el combobox está abierto
const [valueType, setValueType] = useState(""); // Almacena el valor seleccionado
//

  const handleAddClient = async () => {
    if (!newClientName || !newClientNumberType) {
      toast.error("Por favor, completa todos los campos.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Verificar si el cliente ya existe
      const exists = await checkClientExists(newClientNumberType);
      if (exists) {
        toast.error("El cliente ya existe. No se puede duplicar.");
        setIsSubmitting(false); // Asegúrate de restablecer el estado de envío
        return;
      }

      // Validar según el tipo de documento seleccionado
      if (valueType === "DNI" && newClientNumberType.length !== 8) {
        toast.error("El DNI debe tener exactamente 8 dígitos.");
        return; // Detiene el proceso si no cumple la validación
      }

      if (valueType === "RUC" && newClientNumberType.length !== 11) {
        toast.error("El RUC debe tener exactamente 11 dígitos.");
        return; // Detiene el proceso si no cumple la validación
      }

      // Crear el cliente en el backend
      const createdClient = await createClient({
        name: newClientName,
        type: valueType,
        typeNumber: newClientNumberType,
      });

      if (createdClient && createdClient.id) {
        // Actualizar la lista de clientes en el componente principal
        setClients((prev) => [...prev, createdClient]);

        // Actualizar los valores del formulario principal
        setValue("client_name", createdClient.name);
        setValue("client_type", createdClient.type);
        setValue("client_typeNumber", createdClient.typeNumber);

        // Actualizar el combobox de tipoComprobante según el tipo de cliente
        if (createdClient.type === "RUC") {
          setValue("tipoComprobante", "FACTURA");
          updateTipoComprobante("FACTURA"); // Actualiza el tipo de comprobante en SalesForm
        } else if (createdClient.type === "SIN DOCUMENTO") {
          setValue("tipoComprobante", "SIN COMPROBANTE");
          updateTipoComprobante("SIN COMPROBANTE");
        } else {
          setValue("tipoComprobante", "BOLETA");
          updateTipoComprobante("BOLETA");
        }

        // Limpiar los campos y cerrar el diálogo
        setNewClientName("");
        setNewClientNumberType("");
        onClose();
        toast.success("Cliente agregado correctamente.");
      } else {
        throw new Error("No se pudo crear al cliente. Verifique los datos ingresados.");
      }
    } catch (error: any) {
      console.error("Error al agregar el cliente:", error);
      toast.error(error.message || "Error al agregar el cliente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Agregar Nuevo Cliente</AlertDialogTitle>
          <AlertDialogDescription>
            Completa los campos para registrar un nuevo cliente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="new-client-name" className="text-sm font-medium">
              Nombre del Cliente
            </Label>
            <Input
              id="new-client-name"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Ingresa el nombre de la tienda"
              maxLength={100}
            />
          </div>
          <div>
            <Label htmlFor="new-client-type" className="text-sm font-medium">
              Tipo de Documento
            </Label>
            <Popover open={openType} onOpenChange={setOpenType}>
                <PopoverTrigger asChild>
                   <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openType}
                    className="w-[260px] justify-between text-xs"
                    >
                    {valueType || "Selecciona un tipo de comprobante..."}
                    <ChevronsUpDown className="opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar tipo de comprobante..." />
                      <CommandList>
                        <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                        <CommandGroup>
                          {["SIN DOCUMENTO", "DNI", "RUC", "CARNET DE EXTRANJERIA", "OTRO"].map((type, index) => (
                          <CommandItem
                            key={`${type}-${index}`}
                            value={type}
                            onSelect={(currentValue) => {
                              if (currentValue === valueType) return; // 👈 si es el mismo, no hacer nada
                              setValueType(currentValue === valueType ? "" : currentValue);
                              setNewClientNumberType(""); // ← limpia el número al cambiar tipo
                              setOpenType(false); // Cierra el combobox
                            }}
                            >
                            {type}
                            <Check
                            className={cn(
                            "ml-auto",
                            valueType === type ? "opacity-100" : "opacity-0"
                            )}
                            />
                          </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                </PopoverContent>
              </Popover>
          </div>
          <div>
            <Label htmlFor="new-client-number" className="text-sm font-medium">
              N° de Documento
            </Label>
            <Input
              id="new-client-number"
              value={newClientNumberType}
              onChange={(e) => {
                
                const inputValue = e.target.value;
                // Validar que solo se ingresen números
                if (!/^\d*$/.test(inputValue)) {
                  toast.error("Solo se permiten números.");
                  return;
                }

                // Validar según el tipo de documento seleccionado
                if (valueType === "DNI" && inputValue.length > 8) {
                  toast.error("El DNI debe tener exactamente 8 dígitos.");
                  return;
                }

                if (valueType === "RUC" && inputValue.length > 11) {
                  toast.error("El RUC debe tener exactamente 11 dígitos.");
                  return;
                }
                
                setNewClientNumberType(inputValue)
              }}
              onBlur={() => {
                // Validar longitud exacta al perder el foco
                if (valueType === "DNI" && newClientNumberType.length !== 8) {
                  toast.error("El DNI debe tener exactamente 8 dígitos.");
                }
            
                if (valueType === "RUC" && newClientNumberType.length !== 11) {
                  toast.error("El RUC debe tener exactamente 11 dígitos.");
                }
              }}
              placeholder="Ingresa el número de documento"
              maxLength={20}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleAddClient} disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : "Guardar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AddClientDialog;