import {
  Tag,
  FileText,
  Image,
  ToggleLeft,
  Save,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const CATEGORY_FORM_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Tag className="h-5 w-5" />,
    title: "Nombre de la categoría",
    description:
      "Ingresa un nombre claro y descriptivo para la categoría. Este nombre aparecerá en los selectores de productos y en los reportes.",
    tips: [
      "El nombre es obligatorio y debe ser único.",
      "Usa nombres descriptivos: 'Bebidas', 'Limpieza', 'Alimentos'.",
      "El nombre se muestra en la tabla de categorías y en el catálogo.",
    ],
  },
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Descripción",
    description:
      "Agrega una descripción opcional que detalle qué tipo de productos pertenecen a esta categoría.",
    tips: [
      "La descripción es opcional pero recomendada.",
      "Ayuda a otros usuarios a clasificar correctamente los productos.",
      "Se muestra en la tabla de categorías como referencia.",
    ],
  },
  {
    icon: <Image className="h-5 w-5" />,
    title: "Imagen de categoría",
    description:
      "Sube una imagen representativa para la categoría. Esto ayuda a identificarla visualmente en la tabla y el catálogo.",
    tips: [
      "Formatos aceptados: JPG, PNG, WebP.",
      "Se recomienda una imagen cuadrada para mejor presentación.",
      "La imagen se redimensiona automáticamente al subirla.",
      "Puedes cambiar la imagen editando la categoría después.",
    ],
  },
  {
    icon: <ToggleLeft className="h-5 w-5" />,
    title: "Estado de la categoría",
    description:
      "Define si la categoría estará activa o inactiva. Solo las categorías activas aparecen disponibles al crear productos.",
    tips: [
      "'Activo' permite usar la categoría al crear o editar productos.",
      "'Inactivo' oculta la categoría del selector sin eliminarla.",
      "Puedes cambiar el estado en cualquier momento.",
    ],
  },
  {
    icon: <Save className="h-5 w-5" />,
    title: "Guardar categoría",
    description:
      "Haz clic en el botón de guardar para crear la categoría. Si estás editando, los cambios se aplican inmediatamente.",
    tips: [
      "Verifica que el nombre esté completo antes de guardar.",
      "Al crear, serás redirigido a la lista de categorías.",
      "Al actualizar, los productos asociados reflejan los cambios.",
    ],
  },
]
