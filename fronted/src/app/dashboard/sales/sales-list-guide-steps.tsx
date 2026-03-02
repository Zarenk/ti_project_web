import {
  Receipt,
  Search,
  Eye,
  Calendar,
  FileSpreadsheet,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const SALES_LIST_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Receipt className="h-5 w-5" />,
    title: "Historial de Ventas",
    description:
      "Consulta todas las ventas realizadas en tu organización. Cada registro muestra el cliente, monto, método de pago, fecha y estado.",
    tips: [
      "Las ventas se listan de la más reciente a la más antigua.",
      "Cada venta muestra su número, cliente y monto total.",
      "Puedes ver el detalle completo haciendo clic en una venta.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar ventas",
    description:
      "Usa la barra de búsqueda y los filtros para encontrar ventas por cliente, fecha, monto o método de pago.",
    tips: [
      "Busca por nombre del cliente o número de venta.",
      "Filtra por método de pago: efectivo, tarjeta, Yape, etc.",
      "Ordena por fecha, monto o cualquier columna visible.",
    ],
  },
  {
    icon: <Calendar className="h-5 w-5" />,
    title: "Filtro por fechas",
    description:
      "Selecciona un rango de fechas para ver ventas de un periodo específico. Útil para cierres diarios o mensuales.",
    tips: [
      "Usa el selector de rango de fechas para filtrar.",
      "Por defecto se muestra el mes actual.",
      "El resumen de totales se actualiza según el filtro.",
    ],
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Detalle de venta",
    description:
      "Haz clic en una venta para ver su detalle completo: productos vendidos, cantidades, precios, IGV y método de pago.",
    tips: [
      "El detalle muestra cada producto con su precio y cantidad.",
      "Incluye subtotal, IGV (18%) y total de la venta.",
      "Muestra el método de pago y datos del cliente.",
      "Puedes generar el comprobante (boleta/factura) desde el detalle.",
    ],
  },
  {
    icon: <FileSpreadsheet className="h-5 w-5" />,
    title: "Exportar y reportes",
    description:
      "Exporta las ventas a Excel o accede al dashboard de estadísticas para analizar tendencias y rendimiento.",
    tips: [
      "El botón de exportar genera un archivo con las ventas filtradas.",
      "Accede al Dashboard de ventas para gráficos y métricas.",
      "Los reportes incluyen totales, promedios y comparativas.",
    ],
  },
]
