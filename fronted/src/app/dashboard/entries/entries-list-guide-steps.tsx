import {
  ClipboardList,
  Search,
  Eye,
  Printer,
  PackagePlus,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const ENTRIES_LIST_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <ClipboardList className="h-5 w-5" />,
    title: "Control de ingresos",
    description:
      "Esta tabla muestra todos los registros de ingreso de mercadería. Cada registro detalla qué productos ingresaron, de qué proveedor, a qué tienda y en qué fecha.",
    tips: [
      "Los ingresos se listan del más reciente al más antiguo.",
      "Cada registro incluye proveedor, tienda, usuario y monto total.",
      "Puedes seleccionar múltiples registros para acciones en lote.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar registros",
    description:
      "Usa la barra de búsqueda y los filtros de columna para encontrar ingresos por proveedor, tienda, fecha o descripción.",
    tips: [
      "Filtra por nombre de proveedor o tienda.",
      "Ordena por fecha, monto o cualquier columna visible.",
      "Puedes ocultar o mostrar columnas según lo que necesites.",
    ],
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Ver detalle del ingreso",
    description:
      "Haz clic en una fila para ver el detalle completo del ingreso: productos, cantidades, precios unitarios y totales con IGV.",
    tips: [
      "El detalle muestra cada producto con su cantidad y precio.",
      "Se calcula automáticamente el subtotal, IGV (18%) y total.",
      "Puedes ver la información del proveedor y la tienda destino.",
      "El detalle incluye la fecha y el usuario que registró el ingreso.",
    ],
  },
  {
    icon: <Printer className="h-5 w-5" />,
    title: "Imprimir registros",
    description:
      "Selecciona uno o varios registros y usa el botón de impresión para generar un reporte con los detalles de los ingresos seleccionados.",
    tips: [
      "Selecciona registros con los checkboxes de la tabla.",
      "El botón 'Ver seleccionados' muestra un resumen antes de imprimir.",
      "El reporte incluye todos los detalles de productos y montos.",
    ],
  },
  {
    icon: <PackagePlus className="h-5 w-5" />,
    title: "Nuevo ingreso",
    description:
      "Usa el botón 'Nuevo Ingreso' para registrar una nueva entrada de mercadería con sus productos, proveedor y tienda de destino.",
    tips: [
      "El formulario permite seleccionar proveedor, tienda y productos.",
      "Cada producto requiere cantidad y precio unitario.",
      "El ingreso actualiza automáticamente el stock del inventario.",
      "Puedes usar el modo rápido para ingresos simples.",
    ],
  },
]
