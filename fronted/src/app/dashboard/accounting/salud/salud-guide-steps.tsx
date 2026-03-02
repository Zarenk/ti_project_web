import {
  Heart,
  TrendingUp,
  Shield,
  BarChart3,
  AlertTriangle,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const SALUD_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Heart className="h-5 w-5" />,
    title: "Salud del Negocio",
    description:
      "Evaluación simplificada de la salud financiera de tu empresa. Indicadores clave presentados de forma fácil de entender.",
    tips: [
      "Los indicadores se calculan automáticamente de tus datos.",
      "Verde: tu negocio está saludable. Rojo: requiere atención.",
      "Esta vista resume métricas financieras complejas de forma simple.",
    ],
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Rentabilidad",
    description:
      "Muestra si tu negocio está generando ganancias: la diferencia entre lo que vendes y lo que gastas.",
    tips: [
      "Un margen positivo indica que tu negocio es rentable.",
      "Compara con meses anteriores para ver la tendencia.",
      "Optimiza costos si el margen es bajo.",
    ],
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Liquidez",
    description:
      "Indica si tienes suficiente efectivo para cubrir tus obligaciones a corto plazo.",
    tips: [
      "Liquidez alta: puedes pagar deudas sin problema.",
      "Liquidez baja: podrías tener dificultades para pagar.",
      "Mantén un nivel saludable de efectivo disponible.",
    ],
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Indicadores clave",
    description:
      "Métricas resumidas que muestran el estado general de tu empresa en cifras claras.",
    tips: [
      "Cada indicador tiene un semáforo: verde, amarillo o rojo.",
      "Los valores se comparan con estándares del sector.",
      "Haz clic en un indicador para ver más detalles.",
    ],
  },
  {
    icon: <AlertTriangle className="h-5 w-5" />,
    title: "Recomendaciones",
    description:
      "El sistema genera recomendaciones basadas en tus indicadores para mejorar la salud financiera.",
    tips: [
      "Las recomendaciones se actualizan con cada cambio en los datos.",
      "Prioriza las acciones marcadas como urgentes.",
      "Consulta con un contador para decisiones importantes.",
    ],
  },
]
