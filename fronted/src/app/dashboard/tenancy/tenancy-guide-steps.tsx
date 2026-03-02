import {
  Building2,
  Search,
  Plus,
  Settings,
  Users,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const TENANCY_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Building2 className="h-5 w-5" />,
    title: "Organizaciones",
    description:
      "Administra las organizaciones del sistema. Cada organización es un tenant independiente con sus propios datos, usuarios y configuraciones.",
    tips: [
      "Cada organización tiene su propio inventario, ventas y contabilidad.",
      "Los usuarios pertenecen a una o más organizaciones.",
      "Solo super administradores pueden gestionar organizaciones.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar organizaciones",
    description:
      "Encuentra organizaciones por nombre, RUC o estado usando la barra de búsqueda.",
    tips: [
      "Busca por nombre comercial o razón social.",
      "Filtra por estado: activa o inactiva.",
      "La lista muestra el plan y número de usuarios de cada org.",
    ],
  },
  {
    icon: <Plus className="h-5 w-5" />,
    title: "Crear organización",
    description:
      "Registra una nueva organización con sus datos fiscales, plan y configuración inicial.",
    tips: [
      "Define nombre, RUC y datos de la empresa.",
      "Selecciona el plan y módulos habilitados.",
      "La organización queda disponible inmediatamente.",
    ],
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Usuarios y permisos",
    description:
      "Cada organización tiene sus propios usuarios con roles y permisos específicos.",
    tips: [
      "Asigna usuarios existentes a la organización.",
      "Define roles: Admin, Empleado o Cliente.",
      "Los permisos se configuran por módulo.",
    ],
  },
  {
    icon: <Settings className="h-5 w-5" />,
    title: "Configuración",
    description:
      "Configura los módulos habilitados, verticales y ajustes específicos de cada organización.",
    tips: [
      "Habilita o deshabilita módulos según el plan.",
      "Configura verticales (restaurante, legal, etc.).",
      "Los cambios de configuración se aplican inmediatamente.",
    ],
  },
]
