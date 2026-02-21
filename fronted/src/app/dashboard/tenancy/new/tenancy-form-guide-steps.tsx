import {
  Building2,
  FileText,
  Settings,
  Globe,
  Save,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const TENANCY_FORM_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Building2 className="h-5 w-5" />,
    title: "Datos de la organización",
    description:
      "Ingresa el nombre comercial, razón social y datos básicos de la nueva organización.",
    tips: [
      "El nombre es obligatorio y debe ser único.",
      "La razón social se usa en documentos fiscales.",
      "Puedes agregar logo y datos de contacto.",
    ],
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Datos fiscales",
    description:
      "Define el RUC, dirección fiscal y otros datos tributarios necesarios para la facturación.",
    tips: [
      "El RUC debe ser un número válido de 11 dígitos.",
      "La dirección fiscal aparece en facturas y boletas.",
      "Estos datos son obligatorios para documentos SUNAT.",
    ],
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: "Verticales",
    description:
      "Selecciona las verticales o módulos especializados que la organización necesita.",
    tips: [
      "Restaurante: habilita mesas, cocina, menú digital.",
      "Legal: habilita expedientes, calendario, documentos.",
      "Cada vertical agrega funcionalidades específicas.",
    ],
  },
  {
    icon: <Settings className="h-5 w-5" />,
    title: "Configuración inicial",
    description:
      "Define el plan, moneda predeterminada y configuraciones iniciales de la organización.",
    tips: [
      "Selecciona el plan según las necesidades del cliente.",
      "La moneda predeterminada se usa en ventas y compras.",
      "Puedes modificar la configuración después de crear.",
    ],
  },
  {
    icon: <Save className="h-5 w-5" />,
    title: "Crear organización",
    description:
      "Al guardar, la organización se crea con toda su configuración y queda lista para asignar usuarios.",
    tips: [
      "Verifica los datos fiscales antes de crear.",
      "El siguiente paso es asignar un super admin a la org.",
      "Los módulos base se configuran automáticamente.",
    ],
  },
]
