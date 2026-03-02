import { BookOpen, Upload, MessageSquare, Filter, FileCheck } from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const JURISPRUDENCE_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "Sistema de Jurisprudencia",
    description:
      "Gestiona documentos de jurisprudencia legal y realiza consultas inteligentes con IA para asistir en la investigación de precedentes judiciales.",
    tips: [
      "Los documentos se procesan automáticamente para extraer texto y generar embeddings",
      "Usa el asistente IA para consultar precedentes en lenguaje natural",
      "Todas las respuestas incluyen citas obligatorias a los documentos fuente",
    ],
  },
  {
    icon: <Upload className="h-5 w-5" />,
    title: "Subir Documentos",
    description:
      "Sube sentencias, casaciones y otros documentos judiciales en formato PDF. El sistema los procesará automáticamente.",
    tips: [
      "Formatos soportados: PDF de sentencias, casaciones y resoluciones",
      "El OCR se activa automáticamente si el PDF es una imagen escaneada",
      "Los embeddings se generan al completar la extracción de texto",
    ],
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: "Asistente de Jurisprudencia",
    description:
      "Realiza consultas en lenguaje natural sobre jurisprudencia. El asistente busca precedentes relevantes y proporciona respuestas citadas.",
    tips: [
      "Escribe tu consulta como si le preguntaras a un abogado experto",
      "Puedes filtrar por juzgado y año mínimo para resultados más precisos",
      "Cada respuesta incluye nivel de confianza: ALTA, MEDIA, BAJA o NO CONCLUYENTE",
    ],
  },
  {
    icon: <Filter className="h-5 w-5" />,
    title: "Filtros Avanzados",
    description:
      "Filtra documentos por juzgado, año o estado de procesamiento. Usa búsqueda por número de expediente y título.",
    tips: [
      "Filtra por juzgado: Corte Suprema, Tribunal Constitucional, etc.",
      "El filtro de año permite buscar jurisprudencia desde una fecha específica",
      "Combina filtros de estado para encontrar documentos pendientes de revisión",
    ],
  },
  {
    icon: <FileCheck className="h-5 w-5" />,
    title: "Estados de Documentos",
    description:
      "Cada documento pasa por un flujo de procesamiento que puedes monitorear desde la lista principal.",
    tips: [
      "PENDIENTE: Documento subido, esperando procesamiento automático",
      "PROCESANDO: Extrayendo texto y generando embeddings vectoriales",
      "COMPLETADO: Listo para consultas del asistente IA",
      "ERROR: Requiere revisión manual o reprocesamiento",
    ],
  },
]
