import React, { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { toast } from "sonner";
import { transferProduct, getStoresWithProduct, getAllStores } from "../inventory.api";
import { jwtDecode } from "jwt-decode";
import { getAuthToken } from "@/utils/auth-token";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: number;
    name: string;
  } | null;
}

async function getUserIdFromToken(): Promise<number | null> {
  const token = await getAuthToken();
  if (!token) {
    console.error("No se encontró un token de autenticación");
    return null;
  }

  try {
    const decodedToken: { sub: number } = jwtDecode(token);
    return decodedToken.sub;
  } catch (error) {
    console.error("Error al decodificar el token:", error);
    return null;
  }
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, product }) => {
  const [formData, setFormData] = useState({
    sourceStoreId: "",
    destinationStoreId: "",
    quantity: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sourceStores, setSourceStores] = useState<{ id: number; name: string; stock: number }[]>([]);
  const [destinationStores, setDestinationStores] = useState<{ id: number; name: string }[]>([]);
  const [isSourcePopoverOpen, setIsSourcePopoverOpen] = useState(false); // Estado para el Popover de origen
  const [isDestinationPopoverOpen, setIsDestinationPopoverOpen] = useState(false); // Estado para el Popover de destino


  // Cargar las tiendas al abrir el modal
  useEffect(() => {
    if (isOpen && product) {
      fetchStores();
    }
  }, [isOpen, product]);

  const fetchStores = async () => {
    try {
      // Obtener las tiendas con stock del producto
      console.log("Cargando tiendas con stock del producto...");
      const sourceData = await getStoresWithProduct(product?.id || 0);
      console.log("Datos recibidos para tiendas de origen:", sourceData);
      // Transformar los datos para extraer solo las propiedades necesarias
      const transformedSourceStores = sourceData.map((item: any) => ({
        id: item.store.id, // ID de la tienda
        name: item.store.name, // Nombre de la tienda
        stock: item.stock, // Stock del producto en la tienda
      }));
  
      console.log("Tiendas transformadas para origen:", transformedSourceStores);
      setSourceStores(transformedSourceStores);

      // Obtener todas las tiendas
      const destinationData = await getAllStores();
      setDestinationStores(destinationData);
    } catch (error) {
      console.error("Error al cargar las tiendas:", error);
      toast.error("Error al cargar las tiendas.");
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.sourceStoreId || !formData.destinationStoreId || !formData.quantity) {
      toast.error("Por favor, completa todos los campos obligatorios.");
      return;
    }

    // Obtener el userId del token
    const userId = await getUserIdFromToken();
    if (!userId) {
        toast.error("No se pudo obtener el ID del usuario. Por favor, inicie sesión nuevamente.");
        return;
    }

    // Verificar si la cantidad a transferir es mayor al stock disponible
    const sourceStore = sourceStores.find(
        (store) => store.id.toString() === formData.sourceStoreId
    );

    if (!sourceStore) {
        toast.error("No se encontró la tienda de origen seleccionada.");
        return;
    }

    if (sourceStore.stock < parseInt(formData.quantity, 10)) {
        toast.error("La cantidad a transferir excede el stock disponible en la tienda de origen.");
        return;
    }

    try {
      setIsSubmitting(true);
      await transferProduct({
        sourceStoreId: parseInt(formData.sourceStoreId, 10),
        destinationStoreId: parseInt(formData.destinationStoreId, 10),
        productId: product?.id || 0,
        quantity: parseInt(formData.quantity, 10),
        description: formData.description || undefined,
        userId,
      });
      toast.success("Transferencia realizada con éxito.");
      
      onClose();
      setFormData({
        sourceStoreId: "",
        destinationStoreId: "",
        quantity: "",
        description: "",
      });

      location.reload(); // Refresca la página para actualizar los datos
    } catch (error: any) {
      toast.error(error.message || "Error al realizar la transferencia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Transferir Producto</AlertDialogTitle>
          <AlertDialogDescription>
            Completa los campos para transferir el producto seleccionado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          {/* Tienda de Origen */}
          <div>
            <label htmlFor="sourceStoreId" className="block text-sm font-medium">
              Tienda de Origen
            </label>
            <Popover open={isSourcePopoverOpen} onOpenChange={setIsSourcePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full text-left">
                  {formData.sourceStoreId
                    ? sourceStores.find((store) => store.id.toString() === formData.sourceStoreId)?.name
                    : "Selecciona la tienda de origen"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Buscar tienda de origen..." />
                  <CommandGroup>
                    {sourceStores.length > 0 ? (
                     sourceStores.map((store) => (
                      <CommandItem
                        key={store.id}
                        onSelect={() => { handleChange("sourceStoreId", store.id.toString())
                            setIsSourcePopoverOpen(false); // Cerrar el Popover
                        }}
                      >
                        {store.name}
                      </CommandItem>
                    ))
                    ):(
                      <div className="p-2 text-sm text-gray-500">No hay tiendas disponibles</div>
                    )}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Tienda de Destino */}
          <div>
            <label htmlFor="destinationStoreId" className="block text-sm font-medium">
              Tienda de Destino
            </label>
            <Popover open={isDestinationPopoverOpen} onOpenChange={setIsDestinationPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full text-left">
                  {formData.destinationStoreId
                    ? destinationStores.find((store) => store.id.toString() === formData.destinationStoreId)?.name
                    : "Selecciona la tienda de destino"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Buscar tienda de destino..." />
                  <CommandGroup>
                  {destinationStores
                    .filter((store) => store.id.toString() !== formData.sourceStoreId) // Excluir la tienda de origen
                    .map((store) => (
                      <CommandItem
                        key={store.id}
                        onSelect={() => {
                            handleChange("destinationStoreId", store.id.toString())
                            setIsDestinationPopoverOpen(false); // Cerrar el Popover
                        }}
                      >
                        {store.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Cantidad */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium">
              Cantidad
            </label>
            <input
              id="quantity"
              name="quantity"
              value={formData.quantity}
              onChange={(e) => handleChange("quantity", e.target.value)}
              placeholder="Ingresa la cantidad a transferir"
              type="number"
              className="w-full p-2 border rounded-md"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium">
              Descripción (opcional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Ingresa una descripción (opcional)"
              className="w-full p-2 border rounded-md"
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Transfiriendo..." : "Transferir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TransferModal;