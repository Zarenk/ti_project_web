import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Users,
  Calendar,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const SALESDASHBOARD_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Dashboard de Ventas",
    description:
      "Analiza el rendimiento de tus ventas con métricas, gráficos y tablas interactivas. Monitorea ingresos, ganancias y tendencias en tiempo real.",
    tips: [
      "Las tarjetas superiores muestran métricas clave del periodo.",
      "Los datos se actualizan según el rango de fechas seleccionado.",
      "Haz clic en las tarjetas para ver más detalles.",
    ],
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Métricas principales",
    description:
      "Las tarjetas resumen muestran: ingresos totales, cantidad de ventas, ganancia neta, impuestos y número de clientes del periodo.",
    tips: [
      "Ingresos Totales: suma de todas las ventas en el periodo.",
      "Ventas: cantidad total de transacciones realizadas.",
      "Ganancia: diferencia entre ingresos y costos de productos.",
      "Clientes: número de clientes únicos que compraron.",
    ],
  },
  {
    icon: <ShoppingCart className="h-5 w-5" />,
    title: "Productos más vendidos",
    description:
      "El gráfico y tabla de productos top muestran cuáles son los productos más populares por cantidad vendida e ingresos generados.",
    tips: [
      "El gráfico de barras muestra los top 10 productos.",
      "La tabla detalla cantidad, ingresos y ganancia por producto.",
      "Usa esta información para decisiones de inventario y precios.",
    ],
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Clientes y categorías",
    description:
      "Visualiza los mejores clientes por volumen de compra y la distribución de ventas por categoría de productos.",
    tips: [
      "La tabla de clientes muestra los compradores más frecuentes.",
      "El gráfico de categorías muestra la distribución de ingresos.",
      "Útil para identificar oportunidades de venta cruzada.",
    ],
  },
  {
    icon: <Calendar className="h-5 w-5" />,
    title: "Filtro por periodo",
    description:
      "Selecciona un rango de fechas para analizar las ventas de un periodo específico. Todos los gráficos y métricas se actualizan automáticamente.",
    tips: [
      "Usa el selector de fechas en la parte superior derecha.",
      "Compara diferentes periodos para detectar tendencias.",
      "El gráfico de ganancia diaria muestra la evolución día a día.",
      "Los datos se cargan automáticamente al cambiar el rango.",
    ],
  },
]
