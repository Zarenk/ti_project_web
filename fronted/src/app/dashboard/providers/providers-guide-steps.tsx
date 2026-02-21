import {
  Users,
  Search,
  LayoutGrid,
  FileSpreadsheet,
  MousePointerClick,
  Eye,
  Pencil,
  Trash2,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const PROVIDERS_LIST_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Users className="h-5 w-5" />,
    title: "Lista de proveedores",
    description:
      "Esta es la lista principal de todos tus proveedores registrados. Desde aquí puedes buscar, filtrar, exportar y gestionar la información de cada proveedor.",
    tips: [
      "Puedes cambiar entre vista de tabla y vista de galería con los íconos en la barra de herramientas.",
      "La vista de galería muestra tarjetas con los datos de contacto de cada proveedor.",
      "La preferencia de vista se guarda automáticamente para tu próxima visita.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Búsqueda y filtros",
    description:
      "Usa la barra de búsqueda para encontrar proveedores por nombre. También puedes filtrar por rango de fechas y ocultar/mostrar columnas.",
    tips: [
      "La búsqueda filtra automáticamente mientras escribes.",
      "El selector de fecha permite filtrar proveedores por fecha de creación.",
      "Usa el botón 'Vistas' (escritorio) o el ícono de columnas (móvil) para elegir qué columnas mostrar.",
      "El botón 'Reset' limpia todos los filtros aplicados.",
    ],
  },
  {
    icon: <LayoutGrid className="h-5 w-5" />,
    title: "Vista de galería",
    description:
      "La vista de galería muestra tarjetas con el nombre, documento, descripción, teléfono, email, sitio web y dirección de cada proveedor.",
    tips: [
      "Cada tarjeta muestra las iniciales del proveedor como avatar.",
      "Los datos de contacto se muestran con íconos para fácil identificación.",
      "Puedes editar, ver detalle o eliminar desde los botones de cada tarjeta.",
    ],
  },
  {
    icon: <FileSpreadsheet className="h-5 w-5" />,
    title: "Importar desde Excel",
    description:
      "Puedes cargar proveedores masivamente desde un archivo Excel. El sistema valida los datos antes de importarlos.",
    tips: [
      "Usa el botón 'Importar Excel' en la parte superior de la página.",
      "El archivo debe tener columnas: nombre, documento, número, teléfono, dirección, email, etc.",
      "Después de subir, puedes revisar y confirmar los datos antes de guardarlos.",
    ],
  },
  {
    icon: <MousePointerClick className="h-5 w-5" />,
    title: "Selección múltiple y acciones en lote",
    description:
      "En la vista de tabla puedes seleccionar varios proveedores con las casillas de verificación para realizar acciones masivas.",
    tips: [
      "Usa la casilla del encabezado para seleccionar/deseleccionar todos.",
      "Con proveedores seleccionados aparecen botones: eliminar, imprimir, editar y ver.",
      "La impresión genera un documento formateado con los proveedores seleccionados.",
      "La edición masiva permite cambiar datos de varios proveedores a la vez.",
    ],
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Ver detalle del proveedor",
    description:
      "Haz doble clic en cualquier fila de la tabla para ver el detalle completo del proveedor en una ventana modal.",
    tips: [
      "La vista muestra todos los datos: nombre, documento, contacto, estado y fecha.",
      "También puedes acceder desde el menú de acciones (⋮) → 'Visualizar'.",
      "Desde el detalle puedes ir directamente a editar el proveedor.",
    ],
  },
  {
    icon: <Pencil className="h-5 w-5" />,
    title: "Editar proveedor",
    description:
      "Desde el menú de acciones (⋮) selecciona 'Modificar' para abrir el formulario de edición con los datos precargados.",
    tips: [
      "Se valida que el nombre y número de documento no estén duplicados.",
      "Puedes cambiar el tipo de documento, contacto, imagen y estado.",
      "Los cambios se guardan al hacer clic en 'Actualizar Proveedor'.",
    ],
  },
  {
    icon: <Trash2 className="h-5 w-5" />,
    title: "Eliminar proveedor",
    description:
      "Desde el menú de acciones (⋮) selecciona 'Eliminar' para borrar un proveedor. Se mostrará un diálogo de confirmación.",
    tips: [
      "Eliminar un proveedor es permanente — no se puede deshacer.",
      "Solo usuarios con permisos de eliminación pueden ver esta opción.",
      "También puedes eliminar varios proveedores seleccionándolos y usando el botón de eliminar masivo.",
    ],
  },
]
