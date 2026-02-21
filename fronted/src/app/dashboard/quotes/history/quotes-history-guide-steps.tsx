import {
  History,
  Search,
  Eye,
  Calendar,
  FileText,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const QUOTES_HISTORY_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <History className="h-5 w-5" />,
    title: "Historial de Cotizaciones",
    description:
      "Consulta el registro histórico de todas las cotizaciones creadas. Revisa detalles, estados y el seguimiento de cada propuesta.",
    tips: [
      "Las cotizaciones se listan de la más reciente a la más antigua.",
      "Cada registro muestra número, cliente, monto y estado.",
      "Puedes ver el detalle completo haciendo clic en una cotización.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar en el historial",
    description:
      "Usa los filtros para encontrar cotizaciones específicas por cliente, fecha o estado.",
    tips: [
      "Filtra por rango de fechas para periodos específicos.",
      "Busca por nombre del cliente o número de cotización.",
      "Los filtros se combinan para búsquedas más precisas.",
    ],
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Ver detalle",
    description:
      "Accede al detalle completo de cualquier cotización: productos, precios, condiciones y estado actual.",
    tips: [
      "El detalle muestra cada producto con su precio y cantidad.",
      "Incluye subtotal, IGV y total de la cotización.",
      "Puedes ver las notas y condiciones agregadas.",
    ],
  },
  {
    icon: <Calendar className="h-5 w-5" />,
    title: "Filtro por periodo",
    description:
      "Selecciona un rango de fechas para ver cotizaciones de un periodo específico.",
    tips: [
      "Por defecto se muestra el mes actual.",
      "Útil para reportes mensuales o trimestrales.",
      "Los totales se recalculan según el filtro aplicado.",
    ],
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Reimprimir cotización",
    description:
      "Genera nuevamente el PDF de cualquier cotización del historial para reenviar al cliente o archivar.",
    tips: [
      "El PDF se genera con los datos originales de la cotización.",
      "Puedes descargar o imprimir directamente.",
      "Útil para seguimiento y auditoría.",
    ],
  },
]
