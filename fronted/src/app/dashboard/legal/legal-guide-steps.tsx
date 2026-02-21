import {
  Scale,
  Search,
  Plus,
  Clock,
  FileText,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const LEGAL_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Scale className="h-5 w-5" />,
    title: "Expedientes legales",
    description:
      "Gestiona los expedientes y casos legales de tu organización. Lleva un control detallado de cada caso con fechas, documentos y seguimiento.",
    tips: [
      "Cada expediente tiene un número, estado y fechas clave.",
      "Los estados indican el avance del caso legal.",
      "Puedes asociar documentos y notas a cada expediente.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar expedientes",
    description:
      "Filtra expedientes por número, estado, tipo o fecha para encontrar rápidamente un caso específico.",
    tips: [
      "Busca por número de expediente o descripción.",
      "Filtra por estado: activo, en proceso, cerrado.",
      "Ordena por fecha de creación o última actualización.",
    ],
  },
  {
    icon: <Plus className="h-5 w-5" />,
    title: "Nuevo expediente",
    description:
      "Crea un nuevo expediente definiendo tipo de caso, partes involucradas, fechas y descripción.",
    tips: [
      "Define el tipo de caso y la jurisdicción.",
      "Agrega las partes involucradas (demandante, demandado).",
      "Establece fechas clave y plazos del proceso.",
    ],
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Seguimiento",
    description:
      "Monitorea el avance de cada expediente con actualizaciones de estado, notas y fechas de audiencia.",
    tips: [
      "Registra cada movimiento o actualización del caso.",
      "Las fechas de audiencia se muestran en el calendario legal.",
      "Los plazos vencidos se resaltan con alerta visual.",
    ],
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Documentos asociados",
    description:
      "Adjunta documentos relevantes a cada expediente: escritos, resoluciones, notificaciones y evidencia.",
    tips: [
      "Sube documentos PDF, imágenes o archivos de texto.",
      "Cada documento queda asociado al expediente.",
      "Accede a los documentos desde la sección de Documentos Legales.",
    ],
  },
]
