import {
  FileText,
  Filter,
  Plus,
  CheckCircle2,
  Trash2,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const ENTRIES_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Asientos contables",
    description:
      "Esta vista muestra todos los asientos contables registrados. Cada asiento representa una operación financiera con sus cuentas al debe y al haber.",
    tips: [
      "Las métricas superiores muestran el total de asientos, borradores y totales de debe/haber.",
      "Cada asiento muestra su número, fecha, descripción y estado.",
      "Los asientos automáticos provienen de ventas y compras del sistema.",
    ],
  },
  {
    icon: <Filter className="h-5 w-5" />,
    title: "Filtros avanzados",
    description:
      "Usa los filtros para encontrar asientos por periodo, estado, tipo de fuente o texto de búsqueda.",
    tips: [
      "Filtra por día, mes o año usando el selector de periodo.",
      "Filtra por estado: Borrador, Publicado o Anulado.",
      "Busca por descripción, número o monto del asiento.",
      "El indicador de balance muestra si el debe y haber están cuadrados.",
    ],
  },
  {
    icon: <Plus className="h-5 w-5" />,
    title: "Nuevo asiento",
    description:
      "Crea un asiento contable manual definiendo las cuentas, montos y descripción de la operación.",
    tips: [
      "Selecciona las cuentas del Plan de Cuentas para cada línea.",
      "Ingresa los montos al DEBE y al HABER según la operación.",
      "La suma del DEBE debe ser igual a la suma del HABER.",
      "Agrega una descripción clara que identifique la operación.",
    ],
  },
  {
    icon: <CheckCircle2 className="h-5 w-5" />,
    title: "Publicar asiento",
    description:
      "Los asientos en borrador deben publicarse para que afecten los saldos de las cuentas contables.",
    tips: [
      "Un asiento publicado actualiza automáticamente los saldos.",
      "Verifica que el asiento esté balanceado antes de publicar.",
      "Los asientos publicados aparecen en el Libro Mayor y Balance.",
      "Una vez publicado, solo se puede anular (no editar).",
    ],
  },
  {
    icon: <Trash2 className="h-5 w-5" />,
    title: "Eliminar y anular",
    description:
      "Los borradores pueden eliminarse directamente. Los asientos publicados deben anularse, lo cual revierte su efecto contable.",
    tips: [
      "Eliminar un borrador lo remueve permanentemente del sistema.",
      "Anular un asiento publicado genera un contraasiento automático.",
      "Los asientos anulados permanecen visibles con estado 'Anulado'.",
      "Las operaciones de eliminación requieren confirmación.",
    ],
  },
]
