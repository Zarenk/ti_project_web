import {
  Tag,
  Printer,
  Package,
  Settings,
  QrCode,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const LABELS_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Tag className="h-5 w-5" />,
    title: "Generar etiquetas",
    description:
      "Crea etiquetas de productos con código de barras, nombre, precio y otros datos para impresión.",
    tips: [
      "Selecciona los productos para los que necesitas etiquetas.",
      "Define la cantidad de etiquetas por producto.",
      "Las etiquetas incluyen código de barras automáticamente.",
    ],
  },
  {
    icon: <Package className="h-5 w-5" />,
    title: "Seleccionar productos",
    description:
      "Elige los productos que necesitan etiquetas nuevas. Puedes seleccionar uno o varios productos a la vez.",
    tips: [
      "Busca productos por nombre o código de barras.",
      "Selecciona múltiples productos para imprimir en lote.",
      "Define cuántas etiquetas necesitas de cada producto.",
    ],
  },
  {
    icon: <Settings className="h-5 w-5" />,
    title: "Formato de etiqueta",
    description:
      "Configura el tamaño y contenido de las etiquetas según tu impresora y necesidades.",
    tips: [
      "Selecciona el tamaño de etiqueta compatible con tu impresora.",
      "Elige qué datos mostrar: nombre, precio, código, etc.",
      "Previsualiza antes de imprimir para verificar el formato.",
    ],
  },
  {
    icon: <QrCode className="h-5 w-5" />,
    title: "Códigos de barras",
    description:
      "Cada etiqueta incluye el código de barras del producto para escaneo rápido en ventas e inventario.",
    tips: [
      "El código de barras se genera automáticamente.",
      "Compatible con lectores de código de barras estándar.",
      "Verifica que el código sea legible antes de imprimir en lote.",
    ],
  },
  {
    icon: <Printer className="h-5 w-5" />,
    title: "Imprimir",
    description:
      "Envía las etiquetas a la impresora. Compatible con impresoras de etiquetas térmicas y estándar.",
    tips: [
      "Usa el botón de imprimir para enviar a la impresora.",
      "Configura los márgenes según tu impresora.",
      "Imprime una hoja de prueba antes de imprimir en lote.",
    ],
  },
]
