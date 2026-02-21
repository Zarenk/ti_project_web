import {
  BookOpen,
  Filter,
  FileDown,
  Plus,
  CheckCircle2,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const JOURNALS_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "Libro Diario",
    description:
      "El Libro Diario registra cronológicamente todos los asientos contables de tu organización. Es el registro principal donde se anotan las operaciones del día a día.",
    tips: [
      "Los asientos se muestran ordenados por fecha, del más reciente al más antiguo.",
      "Cada asiento tiene un número correlativo único.",
      "Los asientos pueden tener estado: Borrador, Publicado o Anulado.",
    ],
  },
  {
    icon: <Filter className="h-5 w-5" />,
    title: "Filtros de periodo",
    description:
      "Filtra los asientos por periodo (día, mes o año) y selecciona una fecha específica para ver solo las operaciones de ese rango.",
    tips: [
      "Selecciona 'Día' para ver asientos de una fecha específica.",
      "Selecciona 'Mes' para ver todos los asientos del mes.",
      "Selecciona 'Año' para una vista anual completa.",
      "La fecha se puede cambiar con el selector de calendario.",
    ],
  },
  {
    icon: <Plus className="h-5 w-5" />,
    title: "Crear asiento",
    description:
      "Usa el botón 'Nuevo Asiento' para registrar una nueva operación contable. Define la fecha, descripción, cuentas afectadas y montos.",
    tips: [
      "Cada asiento debe tener al menos una línea al DEBE y una al HABER.",
      "El total del DEBE debe ser igual al total del HABER (partida doble).",
      "Puedes guardar como borrador y publicar después.",
      "Los asientos automáticos se generan desde ventas y compras.",
    ],
  },
  {
    icon: <CheckCircle2 className="h-5 w-5" />,
    title: "Estados del asiento",
    description:
      "Los asientos pasan por diferentes estados durante su ciclo de vida contable.",
    tips: [
      "Borrador: asiento creado pero aún no afecta los saldos.",
      "Publicado: asiento confirmado que ya impacta los saldos de cuentas.",
      "Anulado: asiento que fue revertido y ya no tiene efecto.",
      "Solo los asientos publicados se incluyen en reportes oficiales.",
    ],
  },
  {
    icon: <FileDown className="h-5 w-5" />,
    title: "Exportar PLE",
    description:
      "Exporta los registros del Libro Diario en formato PLE (Programa de Libros Electrónicos) compatible con SUNAT.",
    tips: [
      "PLE 5.1: exporta el Libro Diario en formato electrónico.",
      "PLE 6.1: exporta el Libro Mayor en formato electrónico.",
      "Los archivos generados cumplen con las especificaciones de SUNAT.",
      "Selecciona el periodo correcto antes de exportar.",
    ],
  },
]
