'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmationDialogProps {
  isDialogOpen: boolean
  setIsDialogOpen: (open: boolean) => void
  onSubmit: () => void
  isSubmitting: boolean // 🆕 nuevo prop
}

export const ConfirmationDialog = ({
  isDialogOpen,
  setIsDialogOpen,
  onSubmit,
  isSubmitting,
}: ConfirmationDialogProps) => {
  return (
    <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Registro</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription>
          Esta acción registrará el ingreso de productos en el sistema. Por favor, confirma si deseas proceder.
        </AlertDialogDescription>
        <p>¿Estás seguro de que deseas registrar este ingreso?</p>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsDialogOpen(false)}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onSubmit}  // No cierres el modal aquí, ya lo cierras dentro de handleConfirm
            disabled={isSubmitting}
          >
            {isSubmitting ? "Registrando..." : "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}