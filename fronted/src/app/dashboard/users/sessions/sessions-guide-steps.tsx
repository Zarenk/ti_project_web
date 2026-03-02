import {
  Wifi,
  Users,
  Search,
  Shield,
  Clock,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const SESSIONS_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Wifi className="h-5 w-5" />,
    title: "Sesiones activas",
    description:
      "Monitorea en tiempo real qué usuarios están conectados al sistema. Muestra el estado de conexión, rol y última actividad de cada usuario.",
    tips: [
      "Las sesiones se actualizan automáticamente cada 30 segundos.",
      "Usa el botón de refrescar para actualizar manualmente.",
      "Los usuarios 'online' tuvieron actividad en los últimos 2 minutos.",
      "Los usuarios 'idle' llevan más de 2 minutos sin actividad.",
    ],
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Tarjetas de resumen",
    description:
      "Las tarjetas superiores muestran estadísticas rápidas: total de sesiones activas, usuarios online, usuarios inactivos y organizaciones conectadas.",
    tips: [
      "'Activas' muestra el total de sesiones abiertas en este momento.",
      "'Online' cuenta los usuarios con actividad reciente.",
      "'Idle' cuenta los usuarios conectados pero inactivos.",
      "'Organizaciones' muestra cuántas organizaciones tienen usuarios activos (solo admins globales).",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar sesiones",
    description:
      "Usa la barra de búsqueda para filtrar sesiones por nombre de usuario, email, rol u organización.",
    tips: [
      "La búsqueda filtra en tiempo real mientras escribes.",
      "Puedes buscar por cualquier campo visible en las tarjetas de sesión.",
      "El contador muestra cuántas sesiones coinciden con tu búsqueda.",
    ],
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Roles y estados",
    description:
      "Cada sesión muestra el rol del usuario con un color distintivo y un indicador visual de su estado de conexión.",
    tips: [
      "El punto verde indica usuario online (actividad reciente).",
      "El punto ámbar indica usuario idle (sin actividad reciente).",
      "Los roles se muestran como badges de colores: púrpura para super admin, azul para admin, etc.",
      "El tiempo relativo ('hace 5 min') muestra cuándo fue la última actividad.",
    ],
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Última actividad",
    description:
      "Cada tarjeta de sesión muestra el tiempo transcurrido desde la última acción del usuario, con detalle exacto en el tooltip.",
    tips: [
      "Pasa el cursor sobre el tiempo para ver la fecha y hora exacta.",
      "Los administradores globales ven las organizaciones a las que pertenece cada usuario.",
      "Esta vista es útil para monitorear el uso del sistema y detectar sesiones inusuales.",
    ],
  },
]
