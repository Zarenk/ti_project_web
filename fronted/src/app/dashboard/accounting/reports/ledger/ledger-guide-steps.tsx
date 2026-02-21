import {
  BookOpen,
  Search,
  Calendar,
  Download,
  Layers,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const LEDGER_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "Libro Mayor",
    description:
      "El Libro Mayor muestra los movimientos de cada cuenta contable de forma individual. Permite ver todos los cargos y abonos que afectaron una cuenta en un periodo.",
    tips: [
      "Cada cuenta se muestra en una sección colapsable con su saldo.",
      "Los movimientos están ordenados cronológicamente.",
      "El saldo se calcula automáticamente sumando débitos y créditos.",
    ],
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: "Secciones por cuenta",
    description:
      "Cada cuenta contable tiene su propia sección que muestra el detalle de todos los movimientos: fecha, descripción, debe, haber y saldo acumulado.",
    tips: [
      "Haz clic en el encabezado de cada cuenta para expandir o colapsar.",
      "El saldo final aparece al pie de cada sección.",
      "Las cuentas se agrupan por tipo: Activo, Pasivo, Patrimonio, etc.",
      "El badge muestra el tipo de cuenta con su color correspondiente.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar cuentas",
    description:
      "Usa la barra de búsqueda para filtrar cuentas por código o nombre. Ideal para encontrar rápidamente una cuenta específica.",
    tips: [
      "Busca por código numérico (ej: 1011 para Caja).",
      "Busca por nombre parcial (ej: 'ventas' para cuentas de ventas).",
      "El filtro se aplica en tiempo real sobre las cuentas cargadas.",
    ],
  },
  {
    icon: <Calendar className="h-5 w-5" />,
    title: "Filtro por periodo",
    description:
      "Selecciona un rango de fechas para ver únicamente los movimientos de ese periodo. Útil para cierres mensuales o revisiones puntuales.",
    tips: [
      "Usa el selector de fecha para definir inicio y fin del periodo.",
      "Por defecto se muestra el mes actual.",
      "Los saldos se recalculan según el periodo seleccionado.",
      "Los movimientos fuera del rango no aparecen en la vista.",
    ],
  },
  {
    icon: <Download className="h-5 w-5" />,
    title: "Exportar Libro Mayor",
    description:
      "Descarga el Libro Mayor en formato compatible para archivo o presentación ante SUNAT.",
    tips: [
      "El archivo incluye todas las cuentas con movimientos en el periodo.",
      "El formato cumple con las especificaciones del PLE 6.1.",
      "Verifica el periodo seleccionado antes de exportar.",
      "Los datos exportados solo incluyen asientos publicados.",
    ],
  },
]
