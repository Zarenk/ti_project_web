import { useEffect, useRef, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { checkSeries } from "../entries.api";
import { DeleteActionsGuard } from "@/components/delete-actions-guard";

interface AddSeriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  series: string[];
  setSeries: React.Dispatch<React.SetStateAction<string[]>>;
  quantity: number;
  getAllSeriesFromDataTable: () => string[]; // Nueva propiedad para recibir la función
}

export function AddSeriesDialog({ isOpen, onClose, series, setSeries, quantity, getAllSeriesFromDataTable }: AddSeriesDialogProps) {
  const [currentSeries, setCurrentSeries] = useState("");
  const inputRef = useRef<HTMLInputElement>(null); // Referencia al input

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus(); // Forzar el enfoque después de un pequeño retraso
      }, 100); // Ajusta el tiempo si es necesario
    }
  }, [isOpen]);

  const handleAddSeries = async () => {
    const normalizedSeries = currentSeries.trim();
    if (currentSeries.trim() === "") {
      toast.error("Por favor, ingresa un número de serie válido.");
      return;
    }
    if (series.includes(currentSeries)) {
      toast.error("El número de serie ya existe.");
      return;
    }
    if (series.length >= quantity) {
      toast.error(`Solo puedes agregar un máximo de ${quantity} series.`);
      return;
    }
    // Verificar si la serie ya existe en otros productos del DataTable
    const allSeriesInDataTable = getAllSeriesFromDataTable(); // Función para obtener todas las series del DataTable
    if (allSeriesInDataTable.includes(normalizedSeries)) {
      toast.error("El número de serie ya está asociado a otro producto en el formulario.");
      return;
    }
    // Llamar al backend para verificar si la serie ya existe en la base de datos
    try{
      const result = await checkSeries(normalizedSeries);

      if (result.exists) {
        toast.error('La serie ya está asociada a otro producto.');
        return;
      }
      setSeries((prev) => [...prev, currentSeries]);
      setCurrentSeries("");
      toast.success('Serie agregada correctamente.');
    }
    catch(error){
      console.error('Error al verificar la serie:', error);
      toast.error('Ocurrió un error al verificar la serie. Inténtalo nuevamente.');
    }
  };

  const handleRemoveSeries = (serial: string) => {
    setSeries((prev) => prev.filter((s) => s !== serial));
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          
          <AlertDialogTitle className="text-lg font-bold">
            Administrar Series
          </AlertDialogTitle>        
        </AlertDialogHeader>
        <AlertDialogDescription>
          Esta acción registrará el ingreso de series en los productos.
        </AlertDialogDescription>
        <p className="text-sm">
            Agrega o elimina números de serie para los productos seleccionados.
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="series-input" className="block text-sm font-medium">
              Número de Serie
            </label>
            <div className="flex gap-2 mt-1">
              <Input
                id="series-input"
                placeholder="Ejemplo: ABC123456"
                value={currentSeries}
                onChange={(e) => setCurrentSeries(e.target.value)}
                className="flex-1"
                ref={inputRef} // Asignar la referencia al input
              />
              <Button onClick={handleAddSeries} className="bg-blue-600 hover:bg-blue-700 text-white">
                Agregar
              </Button>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium">Series Agregadas</h3>
            {series.length > 0 ? (
              <ul className="mt-2 space-y-2 max-h-40  overflow-y-auto border rounded-md p-2">
                {series.map((serial, index) => (
                  <li
                    key={index}
                    className="flex justify-between items-center p-2 rounded-md shadow-sm border"
                  >
                    <span className="text-sm font-medium">{serial}</span>
                    <DeleteActionsGuard>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveSeries(serial)}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Eliminar
                      </Button>
                    </DeleteActionsGuard>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm mt-2">No se han agregado series aún.</p>
            )}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-gray-200 hover:bg-gray-300">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction className="bg-blue-600 hover:bg-blue-700 text-white">
            Guardar y Cerrar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
