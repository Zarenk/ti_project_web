import {
  Store,
  Package,
  Search,
  BarChart3,
  ArrowRightLeft,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const PRODUCTS_BY_STORE_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Store className="h-5 w-5" />,
    title: "Productos por Tienda",
    description:
      "Visualiza el inventario segmentado por tienda. Compara stock, precios y disponibilidad entre tus diferentes ubicaciones.",
    tips: [
      "Selecciona una tienda para ver su inventario específico.",
      "Cada producto muestra stock, precio y última actualización.",
      "Útil para decidir transferencias entre tiendas.",
    ],
  },
  {
    icon: <Package className="h-5 w-5" />,
    title: "Stock por ubicación",
    description:
      "Cada producto muestra su stock disponible en la tienda seleccionada, independiente de las demás tiendas.",
    tips: [
      "El stock es independiente por cada tienda.",
      "Un producto puede estar agotado en una tienda pero disponible en otra.",
      "Las ventas descuentan stock de la tienda donde se realizan.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar productos",
    description:
      "Filtra productos por nombre, categoría o código dentro de la tienda seleccionada.",
    tips: [
      "La búsqueda se aplica sobre los productos de la tienda actual.",
      "Puedes filtrar por categoría para ver grupos específicos.",
      "Ordena por stock para ver productos con menos existencias.",
    ],
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Comparación entre tiendas",
    description:
      "Compara el stock de un producto entre diferentes tiendas para optimizar la distribución.",
    tips: [
      "Identifica tiendas con exceso o falta de stock.",
      "Útil para planificar transferencias entre ubicaciones.",
      "Los datos se actualizan en tiempo real.",
    ],
  },
  {
    icon: <ArrowRightLeft className="h-5 w-5" />,
    title: "Transferencias",
    description:
      "Cuando una tienda tiene exceso y otra déficit, puedes planificar transferencias de mercadería.",
    tips: [
      "Identifica los desbalances de stock entre tiendas.",
      "Las transferencias se registran como movimientos de inventario.",
      "Coordina las transferencias para minimizar costos.",
    ],
  },
]
