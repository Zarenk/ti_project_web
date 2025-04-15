import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

interface StoreChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function StoreChangeDialog({ isOpen, onClose, onConfirm }: StoreChangeDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cambiar de Tienda</AlertDialogTitle>
          <AlertDialogDescription>
            Ya tiene registros ingresados en la tabla. Si selecciona otra tienda, se reiniciará todo. ¿Desea continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              onClose(); // Cierra el AlertDialog
            }}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm(); // Ejecuta la acción de confirmación
              onClose(); // Cierra el AlertDialog
            }}
          >
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}