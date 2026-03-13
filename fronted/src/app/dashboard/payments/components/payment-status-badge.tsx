"use client"

import {
  Clock,
  Loader2,
  ArrowDownUp,
  CheckCircle2,
  XCircle,
  Timer,
  RotateCcw,
} from "lucide-react"
import type { PaymentStatus } from "../payments.api"

const STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  PENDING: {
    label: "Pendiente",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  PROCESSING: {
    label: "Procesando",
    icon: Loader2,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  SETTLING: {
    label: "Liquidando",
    icon: ArrowDownUp,
    className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  COMPLETED: {
    label: "Completado",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  FAILED: {
    label: "Fallido",
    icon: XCircle,
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
  EXPIRED: {
    label: "Expirado",
    icon: Timer,
    className: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
  },
  REFUNDED: {
    label: "Reembolsado",
    icon: RotateCcw,
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
}

interface PaymentStatusBadgeProps {
  status: PaymentStatus
  animate?: boolean
}

export function PaymentStatusBadge({ status, animate = true }: PaymentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
  const Icon = config.icon
  const isProcessing = status === "PROCESSING" || status === "SETTLING"

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-200 ${config.className} ${animate ? "animate-in fade-in zoom-in-90" : ""}`}
    >
      <Icon
        className={`h-3.5 w-3.5 flex-shrink-0 ${isProcessing ? "animate-spin" : ""}`}
      />
      {config.label}
    </span>
  )
}
