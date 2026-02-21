import {
  Calendar,
  Bell,
  Clock,
  StickyNote,
  Plus,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const LEGAL_CALENDAR_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Calendar className="h-5 w-5" />,
    title: "Calendario Legal",
    description:
      "Visualiza todas las fechas importantes de tus expedientes: audiencias, plazos, vencimientos y recordatorios en un calendario interactivo.",
    tips: [
      "Los puntos de colores indican eventos y notas en cada dia.",
      "Cada evento esta asociado a un expediente especifico.",
      "Los colores distinguen tipos de evento (audiencia, plazo, etc.).",
    ],
  },
  {
    icon: <Bell className="h-5 w-5" />,
    title: "Recordatorios automaticos",
    description:
      "Configura recordatorios en tus notas y eventos para recibir alertas por email cuando se acerque la fecha.",
    tips: [
      "Las notas con recordatorio muestran un icono de campana.",
      "Campana amarilla = pendiente de enviar.",
      "Campana gris = recordatorio ya enviado.",
    ],
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Eventos del dia",
    description:
      "Selecciona un dia para ver todos sus eventos ordenados cronologicamente en el panel lateral.",
    tips: [
      "Haz clic en un evento para ir al detalle del expediente.",
      "Los eventos muestran hora, ubicacion y tipo.",
      "Filtra eventos por estado desde el encabezado.",
    ],
  },
  {
    icon: <StickyNote className="h-5 w-5" />,
    title: "Notas por fecha",
    description:
      "Agrega notas independientes a cualquier dia. Las notas pueden ser privadas (solo tu las ves) o publicas (visibles para toda la empresa).",
    tips: [
      "Usa colores para organizar tus notas visualmente.",
      "Las notas privadas solo las ve su creador.",
      "Puedes editar o eliminar tus propias notas.",
    ],
  },
  {
    icon: <Plus className="h-5 w-5" />,
    title: "Crear notas rapido",
    description:
      "Selecciona un dia y haz clic en 'Agregar' para crear una nota con color, recordatorio y privacidad.",
    tips: [
      "Elige entre 6 colores para categorizar tus notas.",
      "Activa 'Solo para mi' para notas personales.",
      "Agrega recordatorio para recibir alerta por email.",
    ],
  },
]
