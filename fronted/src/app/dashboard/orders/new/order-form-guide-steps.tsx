import {
  UtensilsCrossed,
  MapPin,
  Package,
  Users,
  CreditCard,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const ORDER_FORM_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <UtensilsCrossed className="h-5 w-5" />,
    title: "Tipo de orden",
    description:
      "Selecciona el tipo de orden: para mesa (DINE_IN), para llevar (TAKEAWAY) o delivery. Cada tipo tiene campos específicos.",
    tips: [
      "Mesa: selecciona la mesa del restaurante asignada.",
      "Para llevar: se empaqueta para que el cliente se lo lleve.",
      "Delivery: requiere dirección de entrega del cliente.",
    ],
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Seleccionar cliente",
    description:
      "Busca y selecciona el cliente para la orden. Puedes buscar por nombre o documento.",
    tips: [
      "El cliente es opcional para órdenes de mesa.",
      "Para delivery, el cliente y su dirección son obligatorios.",
      "Si el cliente no existe, puedes crearlo desde la sección de Clientes.",
    ],
  },
  {
    icon: <MapPin className="h-5 w-5" />,
    title: "Mesa o dirección",
    description:
      "Para órdenes de mesa, selecciona la mesa disponible. Para delivery, ingresa la dirección de entrega.",
    tips: [
      "Solo se muestran las mesas disponibles (no ocupadas).",
      "La mesa queda marcada como ocupada al crear la orden.",
      "En delivery, selecciona la región y escribe la dirección completa.",
    ],
  },
  {
    icon: <Package className="h-5 w-5" />,
    title: "Agregar productos",
    description:
      "Busca productos del menú por nombre o categoría. Define la cantidad de cada producto y agrégalo a la orden.",
    tips: [
      "Busca por nombre o filtra por categoría.",
      "El stock disponible se verifica automáticamente.",
      "Puedes agregar notas especiales a cada producto.",
      "El resumen se actualiza en tiempo real al agregar productos.",
    ],
  },
  {
    icon: <CreditCard className="h-5 w-5" />,
    title: "Resumen y confirmar",
    description:
      "Revisa el resumen de la orden con todos los productos, cantidades y el total antes de confirmar.",
    tips: [
      "El subtotal, IGV y total se calculan automáticamente.",
      "Verifica los productos y cantidades antes de enviar.",
      "Al confirmar, la orden se envía a cocina automáticamente.",
      "Puedes modificar la orden antes de confirmarla.",
    ],
  },
]
