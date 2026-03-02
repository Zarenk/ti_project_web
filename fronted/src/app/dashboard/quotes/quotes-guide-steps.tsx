import {
  FileText,
  Search,
  Send,
  Clock,
  Printer,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const QUOTES_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Cotizaciones",
    description:
      "Crea y gestiona cotizaciones para tus clientes. Una cotización es una propuesta de precios que puede convertirse en una venta confirmada.",
    tips: [
      "Cada cotización tiene un número correlativo único.",
      "Las cotizaciones muestran cliente, productos y monto total.",
      "Puedes convertir una cotización aprobada en venta directamente.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar cotizaciones",
    description:
      "Filtra cotizaciones por cliente, fecha, estado o número para encontrar rápidamente la que necesitas.",
    tips: [
      "Busca por nombre del cliente o número de cotización.",
      "Filtra por estado: pendiente, aprobada o rechazada.",
      "Ordena por fecha o monto para facilitar la búsqueda.",
    ],
  },
  {
    icon: <Send className="h-5 w-5" />,
    title: "Crear cotización",
    description:
      "Selecciona un cliente, agrega productos con cantidades y precios, y genera una cotización profesional.",
    tips: [
      "Selecciona los productos y define precios especiales si aplica.",
      "El IGV se calcula automáticamente sobre el subtotal.",
      "Puedes agregar notas o condiciones especiales a la cotización.",
      "La cotización se puede enviar al cliente como PDF.",
    ],
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: "Estados de cotización",
    description:
      "Las cotizaciones pasan por diferentes estados según la respuesta del cliente.",
    tips: [
      "Pendiente: cotización enviada, esperando respuesta.",
      "Aprobada: el cliente aceptó, lista para convertir en venta.",
      "Rechazada: el cliente no aceptó la propuesta.",
      "Vencida: pasó la fecha de validez sin respuesta.",
    ],
  },
  {
    icon: <Printer className="h-5 w-5" />,
    title: "Generar PDF",
    description:
      "Genera un documento PDF profesional de la cotización para enviar al cliente o imprimir.",
    tips: [
      "El PDF incluye logo, datos de la empresa y productos.",
      "Puedes personalizar las condiciones de la cotización.",
      "Descarga o imprime directamente desde el sistema.",
    ],
  },
]
