import {
  BarChart3,
  BookOpen,
  Link2,
  FileText,
  Settings,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const ACCOUNTING_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Panel de contabilidad",
    description:
      "Este es el centro de tu módulo contable. Desde aquí puedes ver un resumen general de la situación financiera y acceder rápidamente a todas las secciones.",
    tips: [
      "Las métricas superiores muestran totales de activos, pasivos, patrimonio e ingresos.",
      "Los datos se actualizan con cada asiento contable registrado.",
      "Usa el botón de refrescar para obtener cifras actualizadas.",
    ],
  },
  {
    icon: <Link2 className="h-5 w-5" />,
    title: "Accesos rápidos",
    description:
      "Los enlaces rápidos te llevan directamente a las secciones más usadas: Plan de Cuentas, Diarios, Asientos, Libro Mayor y Balance de Comprobación.",
    tips: [
      "Cada enlace muestra una breve descripción de la sección.",
      "Estas son las herramientas esenciales para la gestión contable.",
      "Los accesos cambian según el modo (simple o contador).",
    ],
  },
  {
    icon: <Settings className="h-5 w-5" />,
    title: "Modo simple vs. contador",
    description:
      "Puedes alternar entre el modo simple (para dueños de negocio) y el modo contador (para profesionales contables) usando el toggle en la parte superior.",
    tips: [
      "Modo simple: muestra información financiera en lenguaje fácil de entender.",
      "Modo contador: muestra terminología técnica y herramientas avanzadas.",
      "El modo se guarda en tu sesión y persiste entre visitas.",
    ],
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Alertas y notificaciones",
    description:
      "La tarjeta de alertas te informa sobre asientos pendientes, desequilibrios o tareas contables que requieren atención.",
    tips: [
      "Los borradores pendientes aparecen como alerta hasta que se publiquen.",
      "Un desequilibrio entre debe y haber se marca como advertencia.",
      "Revisa las alertas periódicamente para mantener tu contabilidad al día.",
    ],
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "Exportación de datos",
    description:
      "Usa el botón de exportación para descargar tus datos contables en formatos compatibles con SUNAT y otros sistemas.",
    tips: [
      "Exporta el PLE 5.1 (Libro Diario) y PLE 6.1 (Libro Mayor).",
      "Los archivos generados cumplen con el formato requerido por SUNAT.",
      "Selecciona el periodo antes de exportar para obtener datos específicos.",
    ],
  },
]
