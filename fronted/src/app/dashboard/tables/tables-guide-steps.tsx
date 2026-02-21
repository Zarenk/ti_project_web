import {
  LayoutGrid,
  Plus,
  Users,
  Clock,
  Settings,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const TABLES_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <LayoutGrid className="h-5 w-5" />,
    title: "Gestión de mesas",
    description:
      "Administra las mesas de tu restaurante. Visualiza el estado de cada mesa en tiempo real: disponible, ocupada o reservada.",
    tips: [
      "Cada mesa muestra su número y estado actual con colores.",
      "Verde: disponible. Rojo: ocupada. Amarillo: reservada.",
      "El mapa se actualiza en tiempo real con cada orden.",
    ],
  },
  {
    icon: <Plus className="h-5 w-5" />,
    title: "Crear mesa",
    description:
      "Agrega nuevas mesas definiendo su número, capacidad y ubicación dentro del restaurante.",
    tips: [
      "El número de mesa debe ser único.",
      "Define la capacidad de personas para cada mesa.",
      "Puedes organizar las mesas por zonas o áreas.",
    ],
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Ocupar mesa",
    description:
      "Al asignar una orden a una mesa, esta cambia automáticamente a estado 'ocupada' hasta que la orden se cierre.",
    tips: [
      "La mesa se marca como ocupada al crear una orden de mesa.",
      "Puedes ver la orden activa de cada mesa ocupada.",
      "Al cerrar la orden, la mesa vuelve a estado disponible.",
    ],
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Tiempo de ocupación",
    description:
      "Monitorea cuánto tiempo lleva cada mesa ocupada para optimizar la rotación y el servicio.",
    tips: [
      "El tiempo se cuenta desde que se asignó la orden.",
      "Mesas con mucho tiempo ocupadas se resaltan visualmente.",
      "Útil para gestionar la capacidad del restaurante.",
    ],
  },
  {
    icon: <Settings className="h-5 w-5" />,
    title: "Editar y eliminar",
    description:
      "Modifica los datos de una mesa o elimínala si ya no está en uso.",
    tips: [
      "Puedes cambiar el número, capacidad o estado de una mesa.",
      "Solo se pueden eliminar mesas sin órdenes activas.",
      "Los cambios se reflejan inmediatamente en el mapa.",
    ],
  },
]
