import {
  History,
  Search,
  BarChart3,
  Users,
  Shield,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const HISTORY_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <History className="h-5 w-5" />,
    title: "Historial de actividad",
    description:
      "Aquí puedes consultar todo el registro de movimientos y acciones realizadas en el sistema. Incluye creaciones, ediciones, eliminaciones y accesos.",
    tips: [
      "El historial registra automáticamente cada acción relevante del sistema.",
      "Se muestran los movimientos de los últimos 30 días por defecto.",
      "Las métricas superiores resumen la actividad total, acción más frecuente y módulo más activo.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Filtros avanzados",
    description:
      "Usa los filtros para encontrar actividades específicas. Puedes filtrar por usuario, acción, módulo y severidad.",
    tips: [
      "El buscador de usuario tiene autocompletado — escribe parte del nombre para encontrarlo.",
      "Filtra por acción (crear, editar, eliminar) para ver un tipo específico de actividad.",
      "El filtro de módulo muestra solo actividades de un área (productos, ventas, etc.).",
      "Usa 'Resetear filtros' para limpiar todos los filtros de una vez.",
    ],
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Gráficos y tendencias",
    description:
      "Los gráficos muestran la evolución de la actividad a lo largo del tiempo, distribución por tipo de acción y un mapa de calor por día y hora.",
    tips: [
      "El gráfico de líneas muestra la tendencia diaria de movimientos.",
      "El gráfico circular muestra qué acciones se realizan con más frecuencia.",
      "El mapa de calor indica los días y horarios con mayor actividad.",
    ],
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Tabla de actividad",
    description:
      "La tabla detalla cada movimiento individual con fecha, usuario, acción, módulo y descripción. Puedes ordenar y paginar los resultados.",
    tips: [
      "Haz clic en los encabezados de columna para ordenar los resultados.",
      "La tabla se actualiza automáticamente al aplicar filtros.",
      "Cada fila muestra la hora exacta, el usuario que realizó la acción y el detalle.",
    ],
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Vista global (solo administradores)",
    description:
      "Los administradores globales ven un panel adicional con el resumen de movimientos de toda la organización, usuarios activos y tendencias globales.",
    tips: [
      "El resumen global muestra: total de movimientos, usuarios activos, acción y módulo más frecuente.",
      "Las tendencias globales incluyen gráficos de actividad de todos los usuarios.",
      "La tabla global muestra todos los movimientos sin filtrar por usuario.",
    ],
  },
]
