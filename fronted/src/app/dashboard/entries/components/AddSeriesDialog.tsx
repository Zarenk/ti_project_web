import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AddSeriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  series: string[];
  setSeries: React.Dispatch<React.SetStateAction<string[]>>;
  quantity: number;
}

export function AddSeriesDialog({ isOpen, onClose, series, setSeries, quantity }: AddSeriesDialogProps) {
  const [currentSeries, setCurrentSeries] = useState("");

  const handleAddSeries = () => {
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
    setSeries((prev) => [...prev, currentSeries]);
    setCurrentSeries("");
  };

  const handleRemoveSeries = (serial: string) => {
    setSeries((prev) => prev.filter((s) => s !== serial));
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-gray-100">
            Administrar Series
          </AlertDialogTitle>
          <p className="text-sm text-gray-100">
            Agrega o elimina números de serie para los productos seleccionados.
          </p>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div>
            <label htmlFor="series-input" className="block text-sm font-medium text-gray-100">
              Número de Serie
            </label>
            <div className="flex gap-2 mt-1">
              <Input
                id="series-input"
                placeholder="Ejemplo: ABC123456"
                value={currentSeries}
                onChange={(e) => setCurrentSeries(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddSeries} className="bg-blue-600 hover:bg-blue-700 text-white">
                Agregar
              </Button>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-100">Series Agregadas</h3>
            {series.length > 0 ? (
              <ul className="mt-2 space-y-2 max-h-40  overflow-y-auto border rounded-md p-2 bg-gray-900">
                {series.map((serial, index) => (
                  <li
                    key={index}
                    className="flex justify-between items-center bg-gray-800 p-2 rounded-md shadow-sm border"
                  >
                    <span className="text-sm font-medium text-gray-100">{serial}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveSeries(serial)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Eliminar
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-100 mt-2">No se han agregado series aún.</p>
            )}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-gray-200 hover:bg-gray-300 text-gray-100">
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