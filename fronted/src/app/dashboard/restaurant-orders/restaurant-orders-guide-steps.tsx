import {
  UtensilsCrossed,
  Search,
  Clock,
  CheckCircle2,
  Filter,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const RESTAURANT_ORDERS_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <UtensilsCrossed className="h-5 w-5" />,
    title: "Órdenes de restaurante",
    description:
      "Visualiza y gestiona todas las órdenes del restaurante: de mesa, para llevar y delivery.",
    tips: [
      "Las órdenes se actualizan en tiempo real.",
      "Cada orden muestra tipo, mesa, estado y monto.",
      "Puedes filtrar por estado para ver solo las activas.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar órdenes",
    description:
      "Filtra órdenes por tipo, estado, mesa o cliente para encontrar rápidamente la que necesitas.",
    tips: [
      "Filtra por tipo: mesa, para llevar o delivery.",
      "Filtra por estado: abierta, en proceso, lista, etc.",
      "Busca por número de mesa o nombre del cliente.",
    ],
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Estados de la orden",
    description:
      "Las órdenes pasan por diferentes estados según su avance en el flujo del restaurante.",
    tips: [
      "Abierta: orden recién creada por el mesero.",
      "En proceso: cocina está preparando los platos.",
      "Lista: platos preparados, listos para servir.",
      "Cerrada: orden completada y pagada.",
    ],
  },
  {
    icon: <CheckCircle2 className="h-5 w-5" />,
    title: "Cerrar orden",
    description:
      "Al cerrar una orden se genera la cuenta y la mesa queda disponible para nuevos clientes.",
    tips: [
      "Verifica los productos antes de cerrar la orden.",
      "El cierre libera la mesa automáticamente.",
      "Se genera el comprobante de pago al cerrar.",
    ],
  },
  {
    icon: <Filter className="h-5 w-5" />,
    title: "Filtros avanzados",
    description:
      "Usa los filtros para segmentar las órdenes por periodo, tipo o estado.",
    tips: [
      "Filtra por rango de fechas para ver órdenes históricas.",
      "Combina filtros de tipo y estado para búsquedas precisas.",
      "Los totales se recalculan según los filtros aplicados.",
    ],
  },
]
