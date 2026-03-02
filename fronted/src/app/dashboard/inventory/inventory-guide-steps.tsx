import {
  Package,
  Search,
  Filter,
  BarChart3,
  Bell,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const INVENTORY_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Package className="h-5 w-5" />,
    title: "Inventario General",
    description:
      "Esta vista muestra todas las existencias de productos en tu organización. Puedes ver stock actual, precios, series y movimientos por tienda.",
    tips: [
      "Cada fila muestra un producto con su stock, precio y categoría.",
      "El stock se actualiza automáticamente con cada venta o ingreso.",
      "Puedes alternar entre vista de lista y vista de galería.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar productos",
    description:
      "Usa la barra de búsqueda para encontrar productos por nombre, código o categoría. También puedes filtrar por tienda específica.",
    tips: [
      "La búsqueda filtra en tiempo real mientras escribes.",
      "Puedes filtrar por tienda para ver stock de una ubicación específica.",
      "El filtro de categoría permite agrupar productos similares.",
    ],
  },
  {
    icon: <Filter className="h-5 w-5" />,
    title: "Filtros avanzados",
    description:
      "Usa los filtros para segmentar el inventario por categoría, rango de fechas, stock mínimo o tienda.",
    tips: [
      "Filtra por categoría para ver productos de un tipo específico.",
      "El filtro de fechas muestra movimientos en un rango de tiempo.",
      "Activa 'Solo stock bajo' para ver productos que necesitan reposición.",
      "Los filtros se combinan para búsquedas más precisas.",
    ],
  },
  {
    icon: <Bell className="h-5 w-5" />,
    title: "Alertas de stock",
    description:
      "Los productos con stock por debajo del mínimo configurado se resaltan con alertas visuales para que puedas reponerlos a tiempo.",
    tips: [
      "Los productos con stock bajo se marcan con un indicador rojo.",
      "El stock mínimo se configura en la ficha de cada producto.",
      "Usa el botón 'Ingresar items' para registrar nuevas compras rápidamente.",
    ],
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Resumen y exportación",
    description:
      "La vista incluye métricas de resumen como total de productos, valor del inventario y productos con stock bajo.",
    tips: [
      "Las métricas se actualizan en tiempo real con cada cambio.",
      "Puedes seleccionar productos para ver sus detalles completos.",
      "La tabla soporta ordenamiento por cualquier columna.",
      "Usa el botón de impresión para generar reportes del inventario.",
    ],
  },
]
