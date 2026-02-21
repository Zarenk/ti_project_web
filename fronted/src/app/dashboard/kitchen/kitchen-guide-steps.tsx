import {
  ChefHat,
  Clock,
  CheckCircle2,
  Bell,
  Layers,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const KITCHEN_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <ChefHat className="h-5 w-5" />,
    title: "Comanda y cocina",
    description:
      "Pantalla de cocina en tiempo real. Muestra las órdenes pendientes de preparación, en proceso y listas para servir.",
    tips: [
      "Las órdenes se actualizan en tiempo real via WebSocket.",
      "Cada tarjeta muestra los productos a preparar.",
      "El color indica la prioridad y tiempo de espera.",
    ],
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Órdenes pendientes",
    description:
      "Las nuevas órdenes aparecen automáticamente cuando un mesero las registra desde el sistema de mesas.",
    tips: [
      "Las órdenes más antiguas tienen mayor prioridad visual.",
      "El tiempo transcurrido se muestra en cada tarjeta.",
      "Las órdenes urgentes se resaltan con color diferente.",
    ],
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: "Productos a preparar",
    description:
      "Cada orden muestra la lista detallada de productos con cantidades y notas especiales del cliente.",
    tips: [
      "Las notas especiales se muestran debajo de cada producto.",
      "La cantidad se indica claramente para evitar errores.",
      "Los productos se agrupan por orden para facilitar la preparación.",
    ],
  },
  {
    icon: <CheckCircle2 className="h-5 w-5" />,
    title: "Marcar como lista",
    description:
      "Cuando un plato está preparado, márcalo como listo para notificar al mesero que puede servirlo.",
    tips: [
      "Haz clic en el botón para marcar la orden como lista.",
      "El mesero recibe una notificación automática.",
      "La orden se mueve a la sección de 'Listas para servir'.",
    ],
  },
  {
    icon: <Bell className="h-5 w-5" />,
    title: "Notificaciones",
    description:
      "El sistema notifica con sonido y visual cuando llegan nuevas órdenes a cocina.",
    tips: [
      "Las nuevas órdenes activan una alerta sonora.",
      "La pantalla se actualiza automáticamente sin recargar.",
      "Ideal para usar en una pantalla dedicada en la cocina.",
    ],
  },
]
