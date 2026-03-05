"use client"

import Link from "next/link"
import { ShieldAlert, CreditCard, Lock } from "lucide-react"
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
import type { GraceTier } from "@/types/subscription"

type SubscriptionBlockedDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Human-readable name of the blocked feature (e.g. "transmisión SUNAT") */
  feature?: string
  /** Current grace tier from the error response */
  graceTier?: GraceTier | "NONE" | null
}

const TIER_CONFIG: Record<
  string,
  { title: string; description: string; icon: typeof ShieldAlert }
> = {
  SOFT: {
    title: "Función premium no disponible",
    description:
      "Tu suscripción ha vencido. Las funciones premium están restringidas hasta que actualices tu método de pago.",
    icon: ShieldAlert,
  },
  RESTRICTED: {
    title: "Acceso restringido",
    description:
      "Tu cuenta tiene acceso limitado debido a un pago pendiente. Solo operaciones básicas están habilitadas.",
    icon: ShieldAlert,
  },
  READ_MOSTLY: {
    title: "Modo solo lectura",
    description:
      "Tu cuenta está en modo de solo lectura. No puedes crear ni editar registros hasta que regularices tu pago.",
    icon: Lock,
  },
  LOCKED: {
    title: "Cuenta suspendida",
    description:
      "Tu cuenta ha sido suspendida por falta de pago. Regulariza tu situación para recuperar el acceso completo.",
    icon: Lock,
  },
}

export function SubscriptionBlockedDialog({
  open,
  onOpenChange,
  feature,
  graceTier,
}: SubscriptionBlockedDialogProps) {
  const tier = graceTier && graceTier !== "NONE" ? graceTier : null
  const config = tier ? TIER_CONFIG[tier] : null

  const title = config?.title ?? "Función no disponible"
  const Icon = config?.icon ?? ShieldAlert

  const featureText = feature
    ? `La función de ${feature} no está disponible con tu suscripción actual.`
    : "Esta función no está disponible con tu suscripción actual."

  const description = config
    ? config.description
    : `${featureText} Actualiza tu plan para continuar utilizando todas las funcionalidades de la plataforma.`

  const isLocked = tier === "LOCKED" || tier === "READ_MOSTLY"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div
            className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full sm:mx-0 ${
              isLocked
                ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
                : "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400"
            }`}
          >
            <Icon className="h-6 w-6" />
          </div>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <AlertDialogCancel className="cursor-pointer">
            Cerrar
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Link
              href="/dashboard/account/billing"
              className="cursor-pointer gap-1.5"
            >
              <CreditCard className="h-4 w-4" />
              Método de pago
            </Link>
          </AlertDialogAction>
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
