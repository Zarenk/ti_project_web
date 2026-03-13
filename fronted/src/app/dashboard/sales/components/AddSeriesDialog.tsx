import { useState, useRef } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Plus, AlertCircle } from "lucide-react";
import { registerNewSeries } from "../sales.api";

interface AddSeriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableSeries: string[]; // Series disponibles
  selectedSeries: string[]; // Series seleccionadas
  setSelectedSeries: React.Dispatch<React.SetStateAction<string[]>>; // Función para actualizar las series seleccionadas
  quantity: number; // Cantidad de productos seleccionados
  /** Product ID for registering new series */
  productId?: number;
  /** Store ID for registering new series */
  storeId?: number;
  /** Callback when a new series is registered successfully */
  onSeriesRegistered?: (serial: string) => void;
}

export function AddSeriesDialog({
  isOpen,
  onClose,
  availableSeries,
  selectedSeries,
  setSelectedSeries,
  quantity,
  productId,
  storeId,
  onSeriesRegistered,
}: AddSeriesDialogProps) {
  const [newSerialInput, setNewSerialInput] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const registerInputRef = useRef<HTMLInputElement>(null);

  const canRegister = !!productId && !!storeId && selectedSeries.length < quantity;

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

  const handleRegister = async () => {
    const trimmed = newSerialInput.trim();
    if (!trimmed || !productId || !storeId) return;

    // Client-side duplicate check
    if (selectedSeries.includes(trimmed) || availableSeries.includes(trimmed)) {
      setRegisterError("Esta serie ya existe o ya está seleccionada.");
      return;
    }

    setIsRegistering(true);
    setRegisterError(null);
    try {
      await registerNewSeries({ serial: trimmed, productId, storeId });
      // Auto-select the newly registered series
      setSelectedSeries((prev) => [...prev, trimmed]);
      onSeriesRegistered?.(trimmed);
      setNewSerialInput("");
      toast.success(`Serie "${trimmed}" registrada correctamente.`);
      registerInputRef.current?.focus();
    } catch (err: any) {
      setRegisterError(err.message || "Error al registrar la serie.");
    } finally {
      setIsRegistering(false);
    }
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
            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
              {availableSeries.map((serie) => (
                <div key={serie} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={serie}
                    value={serie}
                    checked={selectedSeries.includes(serie)}
                    onChange={(e) => handleSelectSeries(serie, e.target.checked)}
                    className="cursor-pointer"
                  />
                  <label htmlFor={serie} className="cursor-pointer">{serie}</label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-700 dark:text-gray-300">No hay series disponibles para este producto.</p>
          )}

          {/* Register new series */}
          {canRegister && (
            <div className="space-y-2 border-t pt-3">
              <span className="text-xs font-medium text-muted-foreground">
                Registrar nueva serie
              </span>
              <div className="flex items-center gap-2">
                <Input
                  ref={registerInputRef}
                  value={newSerialInput}
                  onChange={(e) => {
                    setNewSerialInput(e.target.value);
                    setRegisterError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleRegister();
                    }
                  }}
                  placeholder="Número de serie"
                  className="h-8 text-sm"
                  disabled={isRegistering}
                />
                <Button
                  type="button"
                  size="sm"
                  className="h-8 shrink-0 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleRegister}
                  disabled={isRegistering || !newSerialInput.trim()}
                >
                  {isRegistering ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Plus className="mr-1 h-3.5 w-3.5" />
                  )}
                  {isRegistering ? "" : "Registrar"}
                </Button>
              </div>
              {registerError && (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{registerError}</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground/50">
                Registra series que no se ingresaron durante la compra.
              </p>
            </div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 dark:text-gray-100">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleConfirm}
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
