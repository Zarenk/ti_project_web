import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SeriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  series: string[]; // Series a mostrar
}

export function SeriesModal({ isOpen, onClose, series }: SeriesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg"
      aria-hidden={false} // Asegúrate de que el modal no esté oculto para los lectores de pantalla
      tabIndex={0} // Permite que el modal reciba el foco
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Series del Producto</DialogTitle>
          <DialogDescription>
            Aquí puedes ver las series asociadas al producto seleccionado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {series.length > 0 ? (
            <ul className="list-disc pl-5">
              {series.map((serie, index) => (
                <li key={index} className="text-gray-100">
                  {serie}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No hay series disponibles para este producto.</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose} 
          className="bg-blue-600 hover:bg-blue-700 text-white"
          autoFocus // Asegura que este botón reciba el foco automáticamente
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}