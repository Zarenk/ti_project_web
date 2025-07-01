import React, { useEffect, useRef, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { checkSeries } from "../entries.api";

interface EditSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  series: string[];
  setSeries: (updatedSeries: string[]) => void;
  quantity: number; // Cantidad máxima permitida
  getAllSeriesFromDataTable: () => string[]; // Nueva propiedad para recibir la función
}

export const EditSeriesModal: React.FC<EditSeriesModalProps> = ({ isOpen, onClose, series, setSeries, quantity, getAllSeriesFromDataTable }) => {
  const [newSeries, setNewSeries] = useState("");
  const inputRef = useRef<HTMLInputElement>(null); // Referencia al input

  useEffect(() => {
      if (isOpen) {
        setTimeout(() => {
          inputRef.current?.focus(); // Forzar el enfoque después de un pequeño retraso
        }, 100); // Ajusta el tiempo si es necesario
      }
  }, [isOpen]);

  const handleAddSeries = async () => {
    const normalizedSeries = newSeries.trim();
    if (!newSeries.trim()) {
      toast.error("Por favor, ingresa un número de serie válido.");
      return;
    }
    if (series.includes(newSeries)) {
      toast.error("El número de serie ya existe.");
      return;
    }
    if (series.length >= quantity) {
      toast.error(`No puedes agregar más de ${quantity} series.`);
      return;
    }
    // Verificar si la serie ya existe en otros productos del DataTable
    const allSeriesInDataTable = getAllSeriesFromDataTable(); // Función para obtener todas las series del DataTable
    if (allSeriesInDataTable.includes(normalizedSeries)) {
      toast.error("El número de serie ya está asociado a otro producto en el formulario.");
      return;
    }
    try {
      // Llamar al backend para verificar si la serie ya existe en la base de datos
      const result = await checkSeries(normalizedSeries);
  
      if (result.exists) {
        toast.error('La serie ya está asociada a otro producto.');
        return;
      }
  
      // Si no existe, agregar la serie al arreglo
      setSeries([...series, normalizedSeries]);
      setNewSeries('');
      toast.success('Serie agregada correctamente.');
      inputRef.current?.focus(); // Enfocar el input después de agregar
    } catch (error) {
      console.error('Error al verificar la serie:', error);
      toast.error('Ocurrió un error al verificar la serie. Inténtalo nuevamente.');
    }
  };

  const handleRemoveSeries = (serial: string) => {
    setSeries(series.filter((s) => s !== serial));
    toast.success("Serie eliminada correctamente.");
    inputRef.current?.focus(); // Enfocar el input después de eliminar
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Evitar el comportamiento predeterminado del Enter
      handleAddSeries(); // Llamar a la función de agregar
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Editar Series</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription>
          Esta acción registrará el ingreso de series en los productos.
        </AlertDialogDescription>
        <div className="space-y-4">
          <ul className="list-disc pl-5 max-h-32 overflow-y-auto">
            {series.map((serial, index) => (
              <li key={index} className="flex items-center justify-between">
                <span>{serial}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveSeries(serial)}
                >
                  <X className="w-4 h-4 text-red-500" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Agregar serie"
              value={newSeries}
              onChange={(e) => setNewSeries(e.target.value)}
              onKeyDown={handleKeyDown} // Detectar la tecla Enter
              className="w-full"
              ref={inputRef} // Asignar la referencia al input
            />
            <Button variant="outline" onClick={handleAddSeries}>
              <Plus className="w-4 h-4 text-green-500" />
            </Button>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cerrar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};