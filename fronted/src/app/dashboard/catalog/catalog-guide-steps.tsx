import {
  Package,
  Tags,
  ImagePlus,
  LayoutGrid,
  FileSpreadsheet,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const CATALOG_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Package className="h-5 w-5" />,
    title: "¿Qué es el catálogo?",
    description:
      "El catálogo te permite generar un documento visual (PDF) o una hoja de cálculo (Excel) con los productos de tu negocio. Ideal para compartir con clientes, distribuidores o equipo de ventas.",
    tips: [
      "El proceso tiene 3 pasos: seleccionar categorías, personalizar y exportar.",
      "Puedes ocultar productos específicos que no quieras incluir.",
      "El catálogo generado incluye imágenes, precios y categorías.",
    ],
  },
  {
    icon: <Tags className="h-5 w-5" />,
    title: "Paso 1: Seleccionar categorías",
    description:
      "Elige las categorías de productos que quieres incluir en tu catálogo. Solo los productos de las categorías seleccionadas aparecerán.",
    tips: [
      "Haz clic en las categorías para seleccionarlas o deseleccionarlas.",
      "La barra de estadísticas muestra cuántos productos y categorías tienes seleccionados.",
      "Puedes ocultar productos individuales que no desees incluir.",
      "Necesitas al menos una categoría seleccionada para continuar.",
    ],
  },
  {
    icon: <ImagePlus className="h-5 w-5" />,
    title: "Paso 2: Personalizar catálogo",
    description:
      "Personaliza tu catálogo: sube una portada, elige el diseño (cuadrícula o lista), edita precios y gestiona imágenes de productos.",
    tips: [
      "Sube una imagen de portada en JPG o PNG para la primera página del PDF.",
      "Elige entre diseño 'Cuadrícula' (3x3 productos por página) o 'Lista' (1 producto por fila).",
      "Puedes editar el precio de venta y el precio anterior de cada producto directamente.",
      "Sube o cambia imágenes de productos individuales desde esta vista.",
    ],
  },
  {
    icon: <LayoutGrid className="h-5 w-5" />,
    title: "Diseño y vista previa",
    description:
      "Visualiza cómo se verá tu catálogo antes de exportarlo. El diseño elegido afecta la distribución de productos en el PDF.",
    tips: [
      "Cuadrícula (3x3): muestra 9 productos por página — ideal para catálogos visuales.",
      "Lista (1x1): muestra 1 producto por fila — ideal para listados detallados.",
      "Los productos ocultos no aparecen en la vista previa ni en el archivo final.",
      "La configuración de diseño se guarda automáticamente para tu próxima visita.",
    ],
  },
  {
    icon: <FileSpreadsheet className="h-5 w-5" />,
    title: "Paso 3: Exportar",
    description:
      "Revisa el resumen de tu catálogo y descárgalo en el formato que prefieras: PDF visual con imágenes o Excel con datos tabulares.",
    tips: [
      "El PDF incluye portada (si la subiste), imágenes de productos y precios.",
      "El Excel incluye nombre, categoría, precios y stock de cada producto.",
      "El resumen muestra: categorías, productos visibles/ocultos, diseño y precios editados.",
      "Usa 'Empezar de nuevo' si quieres resetear toda la configuración.",
    ],
  },
]
