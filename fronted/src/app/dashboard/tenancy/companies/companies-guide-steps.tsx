import {
  Building,
  Search,
  Link2,
  Settings,
  Eye,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const COMPANIES_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Building className="h-5 w-5" />,
    title: "Empresas por organización",
    description:
      "Visualiza las empresas asociadas a cada organización. Una organización puede tener múltiples empresas o razones sociales.",
    tips: [
      "Cada empresa tiene su propio RUC y datos fiscales.",
      "Las empresas comparten usuarios y configuración de la org.",
      "Útil para grupos empresariales con múltiples razones sociales.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar empresas",
    description:
      "Filtra empresas por nombre, RUC u organización para encontrar rápidamente la que necesitas.",
    tips: [
      "Busca por nombre comercial o RUC.",
      "Filtra por organización para ver sus empresas.",
      "Ordena por nombre o fecha de creación.",
    ],
  },
  {
    icon: <Link2 className="h-5 w-5" />,
    title: "Asociación con organización",
    description:
      "Cada empresa está vinculada a una organización que determina sus módulos, usuarios y permisos.",
    tips: [
      "La organización padre define el plan y módulos.",
      "Los usuarios de la org tienen acceso a todas sus empresas.",
      "La configuración de la org se hereda a las empresas.",
    ],
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Detalle de empresa",
    description:
      "Accede al detalle de cada empresa para ver sus datos fiscales, configuración y estado.",
    tips: [
      "Haz clic en una empresa para ver su información completa.",
      "Puedes editar datos fiscales y de contacto.",
      "El estado puede ser activo o inactivo.",
    ],
  },
  {
    icon: <Settings className="h-5 w-5" />,
    title: "Editar empresa",
    description:
      "Modifica los datos de una empresa: nombre, RUC, dirección y configuraciones específicas.",
    tips: [
      "Los cambios en datos fiscales afectan la facturación.",
      "Puedes cambiar el estado de la empresa.",
      "Los cambios se aplican inmediatamente.",
    ],
  },
]
