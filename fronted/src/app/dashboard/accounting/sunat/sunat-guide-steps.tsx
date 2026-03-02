import {
  FileText,
  Calendar,
  Download,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const SUNAT_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <FileText className="h-5 w-5" />,
    title: "SUNAT",
    description:
      "Centro de gestión tributaria. Genera y gestiona los documentos requeridos por SUNAT: libros electrónicos, declaraciones y reportes fiscales.",
    tips: [
      "Los reportes se generan a partir de tus registros contables.",
      "Verifica que la contabilidad esté al día antes de generar reportes.",
      "Los archivos cumplen con el formato PLE de SUNAT.",
    ],
  },
  {
    icon: <Calendar className="h-5 w-5" />,
    title: "Periodos tributarios",
    description:
      "Selecciona el periodo tributario (mes/año) para generar los reportes correspondientes.",
    tips: [
      "Las declaraciones mensuales se presentan antes del vencimiento.",
      "Cada periodo muestra su estado: pendiente, generado o presentado.",
      "Revisa el calendario de vencimientos de SUNAT.",
    ],
  },
  {
    icon: <Download className="h-5 w-5" />,
    title: "Generar PLE",
    description:
      "Genera los archivos del Programa de Libros Electrónicos (PLE) en formato compatible con SUNAT.",
    tips: [
      "PLE 5.1: Libro Diario en formato electrónico.",
      "PLE 6.1: Libro Mayor en formato electrónico.",
      "Descarga los archivos para subirlos al portal de SUNAT.",
    ],
  },
  {
    icon: <CheckCircle2 className="h-5 w-5" />,
    title: "Validación",
    description:
      "El sistema valida que los datos cumplan con los requisitos de SUNAT antes de generar los archivos.",
    tips: [
      "Se verifican: RUC válido, cuentas correctas y saldos cuadrados.",
      "Los errores de validación se muestran antes de generar.",
      "Corrige los errores en la contabilidad y regenera el reporte.",
    ],
  },
  {
    icon: <AlertTriangle className="h-5 w-5" />,
    title: "Recordatorios",
    description:
      "Alertas sobre vencimientos próximos y obligaciones tributarias pendientes.",
    tips: [
      "Las fechas de vencimiento se muestran con anticipación.",
      "Los reportes vencidos se marcan como atrasados.",
      "Presenta tus declaraciones a tiempo para evitar multas.",
    ],
  },
]
