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
  isSubmitting: boolean
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
          Esta accion registrara el ingreso de productos en el sistema. Por favor, confirma si deseas proceder.
        </AlertDialogDescription>
        <p>Estas seguro de que deseas registrar este ingreso?</p>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsDialogOpen(false)} className="cursor-pointer">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onSubmit}
            disabled={isSubmitting}
            className="cursor-pointer"
          >
            {isSubmitting ? 'Registrando...' : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
