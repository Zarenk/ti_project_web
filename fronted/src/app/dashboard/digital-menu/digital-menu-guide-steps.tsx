import {
  Palette,
  Store,
  Clock,
  FolderTree,
  UtensilsCrossed,
  Share2,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const DIGITAL_MENU_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Palette className="h-5 w-5" />,
    title: "Apariencia y marca",
    description:
      "Personaliza el aspecto visual de tu carta digital: tema claro u oscuro, colores de acento y fondo, nombre del restaurante y descripcion.",
    tips: [
      "El tema oscuro es ideal para ambientes elegantes.",
      "Los colores de acento resaltan los precios y botones.",
      "El nombre y descripcion aparecen en el encabezado de la carta.",
    ],
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Horarios de atencion",
    description:
      "Configura los horarios de apertura y cierre para cada dia de la semana. Tus clientes veran esta informacion en la carta publica.",
    tips: [
      "Puedes marcar dias como 'Cerrado' individualmente.",
      "Los horarios solo se muestran si activas la opcion.",
      "Usa formato 24 horas para evitar confusiones.",
    ],
  },
  {
    icon: <FolderTree className="h-5 w-5" />,
    title: "Categorias",
    description:
      "Organiza el orden de las categorias en tu carta. Puedes reordenar, renombrar para la carta o ocultar categorias completas.",
    tips: [
      "Usa las flechas para reordenar las categorias.",
      "El nombre personalizado solo se muestra en la carta publica.",
      "Ocultar una categoria esconde todos sus platos en la carta.",
    ],
  },
  {
    icon: <UtensilsCrossed className="h-5 w-5" />,
    title: "Platos",
    description:
      "Controla que platos aparecen en la carta. Puedes ocultar platos individuales, marcarlos como destacados o personalizar su precio y descripcion.",
    tips: [
      "Los platos destacados (estrella) aparecen primero.",
      "El precio personalizado solo afecta la carta, no las ventas.",
      "La descripcion personalizada reemplaza la original en la carta.",
    ],
  },
  {
    icon: <Share2 className="h-5 w-5" />,
    title: "Compartir",
    description:
      "Genera un enlace y codigo QR para que tus clientes accedan a la carta desde su celular. Puedes personalizar el slug del enlace.",
    tips: [
      "Imprime el QR y colocalo en las mesas.",
      "El enlace funciona en cualquier dispositivo.",
      "Desactiva la carta publica para mantenerla privada mientras editas.",
    ],
  },
]
