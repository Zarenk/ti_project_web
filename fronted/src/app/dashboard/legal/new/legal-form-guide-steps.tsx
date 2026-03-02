import {
  FileText,
  Users,
  Calendar,
  Tag,
  Save,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const LEGAL_FORM_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Tag className="h-5 w-5" />,
    title: "Tipo de expediente",
    description:
      "Selecciona el tipo de caso legal: civil, penal, laboral, tributario u otro según la naturaleza del proceso.",
    tips: [
      "El tipo determina los campos y opciones disponibles.",
      "Selecciona la jurisdicción o juzgado correspondiente.",
      "Agrega un título descriptivo para identificar el caso.",
    ],
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Partes involucradas",
    description:
      "Registra las partes del caso: demandante, demandado, abogados y otros participantes.",
    tips: [
      "Ingresa nombre y datos de contacto de cada parte.",
      "Define el rol de cada participante en el caso.",
      "Puedes agregar múltiples partes al expediente.",
    ],
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Descripción del caso",
    description:
      "Redacta una descripción clara del caso con los hechos relevantes y la pretensión legal.",
    tips: [
      "Sé específico en la descripción de los hechos.",
      "Incluye referencias a normas legales aplicables.",
      "La descripción ayuda a dar contexto rápido del expediente.",
    ],
  },
  {
    icon: <Calendar className="h-5 w-5" />,
    title: "Fechas clave",
    description:
      "Define las fechas importantes del caso: inicio, audiencias, plazos y vencimientos.",
    tips: [
      "La fecha de inicio es obligatoria.",
      "Las audiencias aparecerán en el calendario legal.",
      "Los plazos vencidos generan alertas automáticas.",
    ],
  },
  {
    icon: <Save className="h-5 w-5" />,
    title: "Guardar expediente",
    description:
      "Al guardar, el expediente queda registrado y disponible para seguimiento, documentos y actualizaciones.",
    tips: [
      "Verifica los datos antes de guardar.",
      "El expediente se crea con estado 'Activo'.",
      "Podrás agregar documentos y notas después de crearlo.",
    ],
  },
]
