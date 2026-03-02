import {
  FolderTree,
  Search,
  Plus,
  Pencil,
  Image,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const CATEGORIES_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <FolderTree className="h-5 w-5" />,
    title: "Lista de categorías",
    description:
      "Esta es la lista de todas las categorías de productos de tu organización. Las categorías te permiten agrupar y organizar tus productos para facilitar la búsqueda y los reportes.",
    tips: [
      "Cada categoría muestra su nombre, descripción, estado e imagen.",
      "Las categorías activas se usan al crear o editar productos.",
      "Puedes ordenar la tabla haciendo clic en los encabezados de columna.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar categorías",
    description:
      "Usa la barra de búsqueda o los filtros de columna para encontrar categorías por nombre o descripción.",
    tips: [
      "La búsqueda filtra en tiempo real mientras escribes.",
      "Puedes ocultar o mostrar columnas desde el botón de vistas.",
      "Los filtros se resetean al recargar la página.",
    ],
  },
  {
    icon: <Plus className="h-5 w-5" />,
    title: "Crear nueva categoría",
    description:
      "Usa el botón 'Nueva Categoría' para agregar una categoría. Define su nombre, descripción opcional, estado e imagen representativa.",
    tips: [
      "El nombre de la categoría es obligatorio y debe ser descriptivo.",
      "La descripción es opcional pero ayuda a identificar el tipo de productos.",
      "Puedes subir una imagen para representar visualmente la categoría.",
      "La categoría queda disponible inmediatamente para asignar productos.",
    ],
  },
  {
    icon: <Pencil className="h-5 w-5" />,
    title: "Editar y eliminar",
    description:
      "Desde la tabla puedes editar los datos de una categoría o eliminarla si ya no la necesitas.",
    tips: [
      "Los cambios en nombre o descripción se reflejan en todos los productos asociados.",
      "Cambiar el estado a 'Inactivo' oculta la categoría del selector de productos.",
      "Eliminar una categoría requiere confirmación previa.",
      "Las categorías con productos asociados deben manejarse con cuidado.",
    ],
  },
  {
    icon: <Image className="h-5 w-5" />,
    title: "Imágenes de categoría",
    description:
      "Cada categoría puede tener una imagen asociada que se muestra en la tabla y en el catálogo de productos.",
    tips: [
      "Las imágenes ayudan a identificar visualmente cada categoría.",
      "Se recomienda usar imágenes cuadradas para mejor visualización.",
      "El sistema redimensiona automáticamente las imágenes subidas.",
    ],
  },
]
