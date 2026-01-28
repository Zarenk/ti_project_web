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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogCancel onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </AlertDialogCancel>
            </TooltipTrigger>
            <TooltipContent>Cancela el registro y vuelve al formulario.</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogAction
                onClick={onSubmit}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                {isSubmitting ? 'Registrando...' : 'Confirmar'}
              </AlertDialogAction>
            </TooltipTrigger>
            <TooltipContent>Confirma y guarda el ingreso de productos.</TooltipContent>
          </Tooltip>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
