import {
  BarChart3,
  Package,
  TrendingUp,
  Calendar,
  Download,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const PRODUCT_REPORT_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Reporte de productos",
    description:
      "Analiza el rendimiento de ventas por producto. Identifica los más vendidos, los más rentables y los que necesitan atención.",
    tips: [
      "Los datos se calculan a partir del historial de ventas.",
      "Los gráficos muestran tendencias de venta por producto.",
      "Útil para decisiones de inventario y pricing.",
    ],
  },
  {
    icon: <Package className="h-5 w-5" />,
    title: "Productos más vendidos",
    description:
      "Ranking de productos ordenados por cantidad vendida o ingresos generados en el periodo seleccionado.",
    tips: [
      "Ordena por cantidad para ver los más populares.",
      "Ordena por ingresos para ver los que generan más dinero.",
      "Compara con periodos anteriores para detectar cambios.",
    ],
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Rentabilidad por producto",
    description:
      "Muestra la ganancia real de cada producto considerando el costo de compra y el precio de venta.",
    tips: [
      "El margen se calcula como: precio venta - costo compra.",
      "Los productos con mayor margen son los más rentables.",
      "Identifica productos con margen bajo para ajustar precios.",
    ],
  },
  {
    icon: <Calendar className="h-5 w-5" />,
    title: "Filtro por periodo",
    description:
      "Selecciona un rango de fechas para analizar las ventas de un periodo específico.",
    tips: [
      "Usa el selector de fechas para definir el rango.",
      "Compara diferentes periodos para detectar estacionalidad.",
      "Los totales se recalculan automáticamente.",
    ],
  },
  {
    icon: <Download className="h-5 w-5" />,
    title: "Exportar reporte",
    description:
      "Descarga el reporte en formato Excel o PDF para análisis externo o presentaciones.",
    tips: [
      "El archivo incluye todos los datos del periodo seleccionado.",
      "Útil para reuniones de equipo y análisis de negocio.",
      "Los datos exportados respetan los filtros aplicados.",
    ],
  },
]
