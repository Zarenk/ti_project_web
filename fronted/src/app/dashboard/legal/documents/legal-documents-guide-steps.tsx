import {
  FileText,
  Search,
  Upload,
  Download,
  FolderOpen,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const LEGAL_DOCUMENTS_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Documentos Legales",
    description:
      "Gestiona todos los documentos asociados a tus expedientes legales: escritos, resoluciones, notificaciones y evidencia.",
    tips: [
      "Los documentos se organizan por expediente.",
      "Cada documento muestra su tipo, fecha y expediente asociado.",
      "Puedes previsualizar documentos directamente en el sistema.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar documentos",
    description:
      "Encuentra documentos por nombre, tipo, expediente o fecha usando la barra de búsqueda.",
    tips: [
      "Busca por nombre del documento o número de expediente.",
      "Filtra por tipo: escrito, resolución, notificación, etc.",
      "Ordena por fecha de carga o nombre.",
    ],
  },
  {
    icon: <Upload className="h-5 w-5" />,
    title: "Subir documentos",
    description:
      "Sube nuevos documentos y asócialos a un expediente existente. Acepta PDF, imágenes y documentos de texto.",
    tips: [
      "Formatos soportados: PDF, JPG, PNG, DOC, DOCX.",
      "Define un nombre descriptivo para cada documento.",
      "Selecciona el expediente al que pertenece.",
      "El documento queda disponible inmediatamente.",
    ],
  },
  {
    icon: <Download className="h-5 w-5" />,
    title: "Descargar documentos",
    description:
      "Descarga cualquier documento a tu equipo para revisión, impresión o archivo local.",
    tips: [
      "Haz clic en el botón de descarga junto al documento.",
      "Los documentos se descargan en su formato original.",
      "Puedes descargar múltiples documentos individualmente.",
    ],
  },
  {
    icon: <FolderOpen className="h-5 w-5" />,
    title: "Organización",
    description:
      "Los documentos se organizan automáticamente por expediente, facilitando la revisión de toda la documentación de un caso.",
    tips: [
      "Cada expediente agrupa sus documentos relacionados.",
      "La fecha de carga se registra automáticamente.",
      "Mantén nombres descriptivos para facilitar la búsqueda.",
    ],
  },
]
