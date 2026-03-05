"use client"

import Link from "next/link"
import { ShieldAlert } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type SubscriptionBlockedDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Human-readable name of the blocked feature (e.g. "transmisión SUNAT") */
  feature?: string
}

export function SubscriptionBlockedDialog({
  open,
  onOpenChange,
  feature,
}: SubscriptionBlockedDialogProps) {
  const featureText = feature
    ? `La función de ${feature} no está disponible con tu suscripción actual.`
    : "Esta función no está disponible con tu suscripción actual."

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 sm:mx-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <AlertDialogTitle>Función no disponible</AlertDialogTitle>
          <AlertDialogDescription>
            {featureText} Actualiza tu plan para continuar utilizando todas las
            funcionalidades de la plataforma.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">
            Cerrar
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Link href="/dashboard/account/plan" className="cursor-pointer">
              Ver planes
            </Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
