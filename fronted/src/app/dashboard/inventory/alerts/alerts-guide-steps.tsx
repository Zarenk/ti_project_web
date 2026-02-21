import {
  Bell,
  AlertTriangle,
  Package,
  TrendingDown,
  Settings,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const ALERTS_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Bell className="h-5 w-5" />,
    title: "Alertas de inventario",
    description:
      "Monitorea productos con stock bajo o agotado. Las alertas te ayudan a reponer mercadería antes de quedarte sin existencias.",
    tips: [
      "Los productos bajo el stock mínimo se listan aquí.",
      "Los productos agotados se resaltan con mayor urgencia.",
      "Las alertas se actualizan en tiempo real.",
    ],
  },
  {
    icon: <AlertTriangle className="h-5 w-5" />,
    title: "Niveles de alerta",
    description:
      "Los productos se clasifican por urgencia: stock crítico (rojo), stock bajo (amarillo) y stock normal.",
    tips: [
      "Rojo: stock en 0 o muy por debajo del mínimo.",
      "Amarillo: stock cercano al mínimo configurado.",
      "Atiende primero los productos con alerta roja.",
    ],
  },
  {
    icon: <Package className="h-5 w-5" />,
    title: "Productos afectados",
    description:
      "Cada alerta muestra el producto, su stock actual, stock mínimo configurado y la tienda donde se encuentra.",
    tips: [
      "El stock mínimo se configura en la ficha del producto.",
      "Puedes ver en qué tienda(s) el stock está bajo.",
      "Haz clic en un producto para ir a su detalle.",
    ],
  },
  {
    icon: <TrendingDown className="h-5 w-5" />,
    title: "Tendencias",
    description:
      "Identifica patrones de consumo para anticipar cuándo un producto necesitará reposición.",
    tips: [
      "Los productos con ventas frecuentes bajan stock más rápido.",
      "Revisa las alertas diariamente para evitar quiebres de stock.",
      "Usa esta información para planificar tus compras.",
    ],
  },
  {
    icon: <Settings className="h-5 w-5" />,
    title: "Configurar alertas",
    description:
      "Ajusta los niveles de stock mínimo de cada producto desde su ficha para personalizar las alertas.",
    tips: [
      "Define un stock mínimo realista según la rotación del producto.",
      "Productos de alta rotación necesitan un mínimo más alto.",
      "Puedes desactivar alertas para productos estacionales.",
    ],
  },
]
