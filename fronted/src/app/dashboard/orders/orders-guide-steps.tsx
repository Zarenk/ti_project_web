import {
  ClipboardList,
  Search,
  ShoppingCart,
  Clock,
  Plus,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const ORDERS_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <ClipboardList className="h-5 w-5" />,
    title: "Lista de órdenes",
    description:
      "Visualiza todas las órdenes y cotizaciones de tu organización. Cada orden muestra su estado, cliente, monto y fecha de creación.",
    tips: [
      "Las órdenes se listan de la más reciente a la más antigua.",
      "Cada orden tiene un estado: pendiente, en proceso, completada o cancelada.",
      "Puedes ver los detalles completos haciendo clic en una orden.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar órdenes",
    description:
      "Usa la barra de búsqueda para encontrar órdenes por número, cliente o estado.",
    tips: [
      "Filtra por estado para ver solo órdenes pendientes o completadas.",
      "Busca por nombre del cliente o número de orden.",
      "Ordena por fecha, monto o cualquier columna visible.",
    ],
  },
  {
    icon: <ShoppingCart className="h-5 w-5" />,
    title: "Detalle de la orden",
    description:
      "Cada orden contiene los productos solicitados con cantidades, precios y el total calculado con IGV.",
    tips: [
      "El detalle muestra cada producto con su precio unitario.",
      "El subtotal, IGV (18%) y total se calculan automáticamente.",
      "Puedes ver la información del cliente asociado.",
    ],
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Estados de la orden",
    description:
      "Las órdenes pasan por diferentes estados según su avance en el flujo de trabajo.",
    tips: [
      "Pendiente: orden creada pero aún no procesada.",
      "En proceso: orden aceptada y en preparación.",
      "Completada: orden entregada y finalizada.",
      "Cancelada: orden anulada antes de completarse.",
    ],
  },
  {
    icon: <Plus className="h-5 w-5" />,
    title: "Crear nueva orden",
    description:
      "Usa el botón para crear una nueva orden seleccionando cliente, productos y condiciones de la cotización.",
    tips: [
      "Selecciona los productos y cantidades para la orden.",
      "Asigna un cliente o crea uno nuevo desde el formulario.",
      "La orden puede convertirse en venta al ser completada.",
      "Puedes generar un PDF de la cotización para enviar al cliente.",
    ],
  },
]
