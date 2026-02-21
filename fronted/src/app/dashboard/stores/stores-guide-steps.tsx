import {
  Store,
  Search,
  LayoutGrid,
  MousePointerClick,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const STORES_LIST_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Store className="h-5 w-5" />,
    title: "Lista de tiendas",
    description:
      "Esta es la lista principal de todas tus tiendas o sucursales. Desde aquí puedes buscar, filtrar y gestionar la información de cada punto de venta.",
    tips: [
      "Puedes cambiar entre vista de tabla y vista de galería con los íconos en la barra de herramientas.",
      "La vista de galería muestra tarjetas con los datos de cada tienda.",
      "La preferencia de vista se guarda automáticamente.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Búsqueda y filtros",
    description:
      "Usa la barra de búsqueda para encontrar tiendas por nombre. También puedes filtrar por rango de fechas y ocultar/mostrar columnas.",
    tips: [
      "La búsqueda filtra automáticamente mientras escribes.",
      "El selector de fecha permite filtrar tiendas por fecha de creación.",
      "Usa el botón 'Vistas' para elegir qué columnas mostrar en la tabla.",
      "El botón 'Reset' limpia todos los filtros aplicados.",
    ],
  },
  {
    icon: <LayoutGrid className="h-5 w-5" />,
    title: "Vista de galería",
    description:
      "La vista de galería muestra tarjetas con el nombre, RUC, descripción, teléfono, email, sitio web y dirección de cada tienda.",
    tips: [
      "Cada tarjeta muestra las iniciales de la tienda como avatar.",
      "Los datos de contacto se muestran con íconos para fácil identificación.",
      "Puedes editar, ver detalle o eliminar desde los botones de cada tarjeta.",
    ],
  },
  {
    icon: <MousePointerClick className="h-5 w-5" />,
    title: "Selección múltiple y acciones en lote",
    description:
      "En la vista de tabla puedes seleccionar varias tiendas con las casillas de verificación para realizar acciones masivas.",
    tips: [
      "Usa la casilla del encabezado para seleccionar/deseleccionar todas.",
      "Con tiendas seleccionadas aparecen botones: eliminar, imprimir, editar y ver.",
      "La impresión genera un documento formateado con las tiendas seleccionadas.",
    ],
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Ver detalle de la tienda",
    description:
      "Haz doble clic en cualquier fila de la tabla para ver el detalle completo de la tienda en una ventana modal.",
    tips: [
      "La vista muestra todos los datos: nombre, RUC, contacto, estado y fecha de creación.",
      "También puedes acceder desde el menú de acciones (⋮) → 'Visualizar'.",
      "Desde el detalle puedes ir directamente a editar la tienda.",
    ],
  },
  {
    icon: <Pencil className="h-5 w-5" />,
    title: "Editar tienda",
    description:
      "Desde el menú de acciones (⋮) selecciona 'Modificar' para abrir el formulario de edición con los datos precargados.",
    tips: [
      "Puedes cambiar el nombre, RUC, contacto, imagen y estado.",
      "Los cambios se guardan al hacer clic en 'Actualizar Tienda'.",
      "Usa 'Cancelar' o 'Volver' para salir sin guardar.",
    ],
  },
  {
    icon: <Trash2 className="h-5 w-5" />,
    title: "Eliminar tienda",
    description:
      "Desde el menú de acciones (⋮) selecciona 'Eliminar' para borrar una tienda. Se mostrará un diálogo de confirmación.",
    tips: [
      "Eliminar una tienda es permanente — no se puede deshacer.",
      "Solo usuarios con permisos de eliminación pueden ver esta opción.",
      "Si la tienda tiene inventario asignado, considera mover los productos antes de eliminarla.",
    ],
  },
]
