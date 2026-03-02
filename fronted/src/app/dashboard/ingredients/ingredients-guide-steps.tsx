import {
  Apple,
  Search,
  Plus,
  AlertTriangle,
  Package,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const INGREDIENTS_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Apple className="h-5 w-5" />,
    title: "Insumos y existencias",
    description:
      "Gestiona los ingredientes e insumos de tu restaurante. Controla existencias, costos y alertas de reposición.",
    tips: [
      "Cada insumo muestra su stock actual, unidad y costo.",
      "Los insumos con stock bajo se resaltan con alerta.",
      "Los insumos se usan en las recetas de los platos del menú.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar insumos",
    description:
      "Encuentra insumos rápidamente por nombre, categoría o código usando la barra de búsqueda.",
    tips: [
      "La búsqueda filtra en tiempo real mientras escribes.",
      "Puedes filtrar por categoría de insumo.",
      "Ordena por stock, nombre o fecha de última actualización.",
    ],
  },
  {
    icon: <Plus className="h-5 w-5" />,
    title: "Agregar insumo",
    description:
      "Registra nuevos insumos con nombre, unidad de medida, stock inicial y costo unitario.",
    tips: [
      "Define la unidad de medida correcta (kg, lt, unidad, etc.).",
      "El costo unitario se usa para calcular el costo de recetas.",
      "El stock se actualiza automáticamente con cada uso en recetas.",
    ],
  },
  {
    icon: <AlertTriangle className="h-5 w-5" />,
    title: "Alertas de stock",
    description:
      "Configura el stock mínimo de cada insumo para recibir alertas cuando se esté agotando.",
    tips: [
      "Los insumos bajo el mínimo se marcan con alerta roja.",
      "Revisa las alertas periódicamente para evitar faltantes.",
      "Un insumo agotado puede impedir la preparación de platos.",
    ],
  },
  {
    icon: <Package className="h-5 w-5" />,
    title: "Movimientos de stock",
    description:
      "Registra entradas y salidas de insumos para mantener el inventario actualizado.",
    tips: [
      "Las salidas se descuentan automáticamente con cada orden.",
      "Registra entradas manuales al recibir mercadería.",
      "El historial de movimientos se conserva para auditoría.",
    ],
  },
]
