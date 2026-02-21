import {
  Package,
  Search,
  LayoutGrid,
  FileSpreadsheet,
  MousePointerClick,
  ArrowRightLeft,
  Trash2,
  Eye,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const PRODUCTS_LIST_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Package className="h-5 w-5" />,
    title: "Vista general de productos",
    description:
      "Esta es la lista principal de todos tus productos registrados. Desde aquí puedes buscar, filtrar, exportar, editar y gestionar cada producto de tu inventario.",
    tips: [
      "Puedes cambiar entre vista de tabla y vista de galería con los íconos en la parte superior.",
      "La vista de galería muestra imágenes grandes — ideal para identificar productos rápidamente.",
      "La vista se guarda automáticamente para tu próxima visita.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Búsqueda y filtros",
    description:
      "Usa la barra de búsqueda para encontrar productos por nombre. También puedes filtrar por categoría, rango de fechas y estado de migración.",
    tips: [
      "La búsqueda se activa automáticamente mientras escribes (con un pequeño retraso).",
      "El filtro de categoría permite ver solo productos de una categoría específica.",
      "El selector de fecha filtra por fecha de creación del producto.",
      "Usa 'Resetear' para limpiar todos los filtros de una vez.",
    ],
  },
  {
    icon: <LayoutGrid className="h-5 w-5" />,
    title: "Vista de galería",
    description:
      "La vista de galería muestra tarjetas con la imagen, nombre, categoría, precios y estado de cada producto. Es más visual y práctica para catálogos.",
    tips: [
      "Puedes ajustar cuántos productos se muestran por página (12, 24 o 48).",
      "La búsqueda y filtro de categoría funcionan igual en ambas vistas.",
      "Haz doble clic en una tarjeta para ir al detalle del producto.",
    ],
  },
  {
    icon: <FileSpreadsheet className="h-5 w-5" />,
    title: "Exportar a Excel",
    description:
      "Descarga la lista de productos en formato Excel (.xls) para reportes, análisis o respaldo de datos.",
    tips: [
      "El botón de exportar está en la barra de herramientas (ícono de tabla con flecha).",
      "Se exportan todos los productos visibles según los filtros aplicados.",
      "El archivo incluye: nombre, categoría, precios, estado y fecha de creación.",
    ],
  },
  {
    icon: <MousePointerClick className="h-5 w-5" />,
    title: "Selección múltiple y acciones en lote",
    description:
      "En la vista de tabla puedes seleccionar varios productos con las casillas de verificación para realizar acciones masivas.",
    tips: [
      "Usa la casilla del encabezado para seleccionar/deseleccionar todos los productos de la página.",
      "Con productos seleccionados aparecen botones de acciones: eliminar, imprimir, editar masivo y ver.",
      "La edición masiva permite cambiar estado y precios de varios productos a la vez.",
      "La impresión genera un documento formateado con los productos seleccionados.",
    ],
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Ver detalle del producto",
    description:
      "Haz doble clic en cualquier fila de la tabla (o tarjeta en galería) para ver el detalle completo del producto en una ventana modal.",
    tips: [
      "La vista de detalle muestra: nombre, descripción, precios, categoría, estado e imágenes.",
      "Desde el detalle puedes ir directamente a editar el producto.",
      "También puedes acceder al detalle desde el menú de acciones (⋮) → 'Ver detalle'.",
    ],
  },
  {
    icon: <ArrowRightLeft className="h-5 w-5" />,
    title: "Migración y estado Legacy",
    description:
      "Si tu negocio fue actualizado a un nuevo sistema vertical, algunos productos pueden aparecer como 'Legacy'. El asistente de migración te ayuda a actualizarlos.",
    tips: [
      "Los productos Legacy son los que aún no tienen los campos extra del nuevo sistema.",
      "Usa el filtro 'Legacy' / 'Migrados' / 'Todos' para identificar cuáles faltan por migrar.",
      "El botón 'Asistente de migración' te guía paso a paso para actualizar productos Legacy.",
    ],
  },
  {
    icon: <Trash2 className="h-5 w-5" />,
    title: "Editar y eliminar productos",
    description:
      "Cada producto tiene un menú de acciones (⋮) con opciones para ver detalle, editar o eliminar.",
    tips: [
      "'Editar' te lleva al formulario de producto con todos los datos precargados.",
      "'Eliminar' muestra una confirmación antes de borrar — esta acción no se puede deshacer.",
      "Solo usuarios con permisos de administrador pueden eliminar productos.",
    ],
  },
]
