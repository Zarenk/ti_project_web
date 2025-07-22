import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AddSeriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableSeries: string[]; // Series disponibles
  selectedSeries: string[]; // Series seleccionadas
  setSelectedSeries: React.Dispatch<React.SetStateAction<string[]>>; // Función para actualizar las series seleccionadas
  quantity: number; // Cantidad de productos seleccionados
}

export function AddSeriesDialog({
  isOpen,
  onClose,
  availableSeries,
  selectedSeries,
  setSelectedSeries,
  quantity,
}: AddSeriesDialogProps) {

  // Manejar la selección de series
  const handleSelectSeries = (serie: string, isChecked: boolean) => {
    if (isChecked) {
      if (selectedSeries.length >= quantity) {
        toast.error(`Solo puedes seleccionar un máximo de ${quantity} series.`);
        return;
      }
      setSelectedSeries((prev) => [...prev, serie]);
    } else {
      setSelectedSeries((prev) => prev.filter((s) => s !== serie));
    }
  };

  // Confirmar las series seleccionadas
  const handleConfirm = () => {
    if (selectedSeries.length !== quantity) {
      toast.error(`Debes seleccionar exactamente ${quantity} series.`);
      return;
    }
    toast.success("Series seleccionadas correctamente.");
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
            Seleccionar Series
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-gray-700 dark:text-gray-300">
            Selecciona las series que deseas usar para este producto. Puedes seleccionar hasta {quantity} series.
          </AlertDialogDescription>
  
        </AlertDialogHeader>
        <div className="space-y-4">
          {availableSeries.length > 0 ? (
            <div className="flex flex-col gap-2">
              {availableSeries.map((serie) => (
                <div key={serie} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={serie}
                    value={serie}
                    checked={selectedSeries.includes(serie)}
                    onChange={(e) => handleSelectSeries(serie, e.target.checked)}
                  />
                  <label htmlFor={serie}>{serie}</label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300">No hay series disponibles para este producto.</p>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-gray-200 hover:bg-gray-300 text-gray-800 dark:text-gray-100">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleConfirm}
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}