import {
  UtensilsCrossed,
  MapPin,
  Package,
  Users,
  CreditCard,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const RESTAURANT_ORDER_FORM_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <UtensilsCrossed className="h-5 w-5" />,
    title: "Tipo de orden",
    description:
      "Selecciona cómo será atendida la orden: en mesa, para llevar o delivery.",
    tips: [
      "Mesa: el cliente consume en el restaurante.",
      "Para llevar: se empaqueta para que el cliente se lo lleve.",
      "Delivery: se envía a la dirección del cliente.",
    ],
  },
  {
    icon: <MapPin className="h-5 w-5" />,
    title: "Mesa o dirección",
    description:
      "Para órdenes de mesa selecciona la mesa disponible. Para delivery ingresa la dirección de entrega.",
    tips: [
      "Solo las mesas disponibles aparecen en el selector.",
      "La mesa se marca como ocupada al crear la orden.",
      "En delivery, la dirección y datos del cliente son obligatorios.",
    ],
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Cliente",
    description:
      "Busca y selecciona el cliente para la orden. Opcional para mesas, obligatorio para delivery.",
    tips: [
      "Busca por nombre o documento del cliente.",
      "El cliente es necesario para generar comprobante fiscal.",
      "Si no seleccionas cliente, se usa uno genérico.",
    ],
  },
  {
    icon: <Package className="h-5 w-5" />,
    title: "Agregar productos",
    description:
      "Selecciona los platos y productos del menú. Define cantidades y agrega notas especiales.",
    tips: [
      "Busca por nombre o filtra por categoría.",
      "El stock disponible se verifica automáticamente.",
      "Agrega notas especiales (sin sal, extra picante, etc.).",
      "El resumen se actualiza en tiempo real.",
    ],
  },
  {
    icon: <CreditCard className="h-5 w-5" />,
    title: "Confirmar orden",
    description:
      "Revisa el resumen y confirma la orden. Los platos se envían automáticamente a la pantalla de cocina.",
    tips: [
      "Verifica productos y cantidades antes de confirmar.",
      "La orden llega a cocina inmediatamente al confirmar.",
      "El subtotal, IGV y total se calculan automáticamente.",
    ],
  },
]
