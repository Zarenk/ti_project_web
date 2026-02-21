import {
  Tag,
  Search,
  PlusCircle,
  ImageIcon,
  Pencil,
  Trash2,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const BRANDS_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Tag className="h-5 w-5" />,
    title: "¿Qué son las marcas?",
    description:
      "Las marcas son etiquetas que puedes asignar a tus productos para organizarlos mejor. Por ejemplo: Samsung, Nike, Epson, etc. Cada marca puede tener un logo en SVG y/o PNG.",
    tips: [
      "Las marcas aparecen como opción al crear o editar un producto.",
      "Tener marcas bien organizadas facilita la búsqueda y filtrado de productos.",
      "Los logos se muestran junto al nombre de la marca en toda la aplicación.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar y ordenar marcas",
    description:
      "Usa la barra de búsqueda para encontrar marcas por nombre. También puedes ordenarlas por fecha de creación o alfabéticamente.",
    tips: [
      "Escribe en el campo 'Buscar marca...' y los resultados se filtran automáticamente.",
      "Activa 'Ordenar por última marca ingresada' para ver las más recientes primero.",
      "Sin esa opción, las marcas se ordenan alfabéticamente (A → Z).",
    ],
  },
  {
    icon: <PlusCircle className="h-5 w-5" />,
    title: "Crear una nueva marca",
    description:
      "Usa el formulario 'Agregar nueva marca' en la parte superior. Solo necesitas un nombre — los logos son opcionales.",
    tips: [
      "El nombre es obligatorio — el campo se resalta en rojo si está vacío al guardar.",
      "Puedes agregar un logo SVG (vectorial) y/o un logo PNG/JPEG (imagen).",
      "Si subes un JPEG, se convierte automáticamente a PNG antes de guardarse.",
      "Haz clic en 'Guardar' para crear la marca.",
    ],
  },
  {
    icon: <ImageIcon className="h-5 w-5" />,
    title: "Logos de marca (SVG y PNG)",
    description:
      "Cada marca puede tener dos tipos de logo: un SVG (vectorial, escala sin perder calidad) y un PNG/JPEG (imagen estándar).",
    tips: [
      "El logo SVG es ideal para íconos y fondos — se ve nítido en cualquier tamaño.",
      "El logo PNG se usa como respaldo o para imágenes con fotografía.",
      "Si una marca tiene PNG pero no SVG, aparece el botón 'PNG a SVG' para convertirlo automáticamente.",
      "La vista previa aparece debajo del campo de subida antes de guardar.",
    ],
  },
  {
    icon: <Pencil className="h-5 w-5" />,
    title: "Editar una marca existente",
    description:
      "Haz clic en 'Editar' junto a cualquier marca para cargar sus datos en el formulario. Modifica lo que necesites y haz clic en 'Actualizar'.",
    tips: [
      "Al editar, el formulario cambia su título a 'Editar marca' y el botón dice 'Actualizar'.",
      "Puedes cambiar el nombre y reemplazar los logos subiendo nuevos archivos.",
      "Usa el botón 'Cancelar' para salir del modo edición sin guardar cambios.",
    ],
  },
  {
    icon: <Trash2 className="h-5 w-5" />,
    title: "Eliminar una marca",
    description:
      "Haz clic en 'Eliminar' junto a la marca que deseas borrar. Se mostrará un diálogo de confirmación antes de proceder.",
    tips: [
      "Eliminar una marca es permanente — no se puede deshacer.",
      "Solo usuarios con permisos de eliminación pueden ver este botón.",
      "Si la marca está asignada a productos, estos quedarán sin marca asociada.",
    ],
  },
]
