import React, { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";

interface EditSeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  series: string[];
  setSeries: (updatedSeries: string[]) => void;
  quantity: number; // Cantidad máxima permitida
}

export const EditSeriesModal: React.FC<EditSeriesModalProps> = ({ isOpen, onClose, series, setSeries, quantity }) => {
  const [newSeries, setNewSeries] = useState("");

  const handleAddSeries = () => {
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
    setSeries([...series, newSeries]);
    setNewSeries("");
    toast.success("Serie agregada correctamente.");
  };

  const handleRemoveSeries = (serial: string) => {
    setSeries(series.filter((s) => s !== serial));
    toast.success("Serie eliminada correctamente.");
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Editar Series</AlertDialogTitle>
        </AlertDialogHeader>
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
              className="w-full"
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