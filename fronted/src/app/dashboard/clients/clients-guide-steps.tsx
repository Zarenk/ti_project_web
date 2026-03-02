import {
  Users,
  Search,
  UserPlus,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const CLIENTS_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Users className="h-5 w-5" />,
    title: "Lista de clientes",
    description:
      "Esta es la lista de todos los clientes registrados en tu organización. Los clientes son las personas o empresas a quienes les vendes productos o servicios.",
    tips: [
      "Los clientes genéricos se excluyen automáticamente de la lista.",
      "Cada cliente muestra su nombre, tipo de documento y número de documento.",
      "La tabla tiene ordenamiento y filtros por columna.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar clientes",
    description:
      "Usa la barra de búsqueda para encontrar clientes por nombre o número de documento.",
    tips: [
      "La búsqueda filtra en tiempo real mientras escribes.",
      "Puedes ordenar por cualquier columna haciendo clic en su encabezado.",
      "Los filtros se resetean al recargar la página.",
    ],
  },
  {
    icon: <UserPlus className="h-5 w-5" />,
    title: "Crear nuevo cliente",
    description:
      "Usa el botón 'Nuevo Cliente' para abrir el formulario de creación. Solo necesitas nombre, tipo de documento y número.",
    tips: [
      "El nombre del cliente es obligatorio.",
      "Tipos de documento disponibles: DNI, RUC, Carnet de Extranjería, Pasaporte u Otro.",
      "El número de documento es obligatorio.",
      "El cliente se crea inmediatamente al hacer clic en 'Crear'.",
    ],
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Tipos de documento",
    description:
      "Cada cliente necesita un tipo y número de documento. Esto es importante para la facturación y documentos tributarios.",
    tips: [
      "DNI: Documento Nacional de Identidad (8 dígitos).",
      "RUC: Registro Único de Contribuyentes (11 dígitos) — para empresas.",
      "Carnet de Extranjería: para clientes extranjeros residentes.",
      "El documento se usa automáticamente al generar facturas y boletas.",
    ],
  },
  {
    icon: <Pencil className="h-5 w-5" />,
    title: "Editar y eliminar clientes",
    description:
      "Desde la tabla puedes modificar los datos de un cliente o eliminarlo si ya no es necesario.",
    tips: [
      "Los cambios se aplican inmediatamente al guardar.",
      "Eliminar un cliente muestra una confirmación antes de proceder.",
      "Los clientes con ventas asociadas deben manejarse con cuidado al eliminar.",
    ],
  },
]
