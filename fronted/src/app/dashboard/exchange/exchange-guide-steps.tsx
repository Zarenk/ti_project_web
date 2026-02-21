import {
  ArrowRightLeft,
  CalendarIcon,
  TrendingUp,
  History,
  Search,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const EXCHANGE_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <ArrowRightLeft className="h-5 w-5" />,
    title: "¿Qué es el tipo de cambio?",
    description:
      "Aquí registras y consultas los tipos de cambio del día para las monedas que maneja tu negocio (USD y EUR). Estos valores se usan automáticamente en ventas, compras y cotizaciones.",
    tips: [
      "El tipo de cambio se registra en Soles (PEN) por cada unidad de moneda extranjera.",
      "Puedes registrar un tipo de cambio por día y por moneda.",
      "Los valores registrados se usan en todo el sistema para conversiones automáticas.",
    ],
  },
  {
    icon: <CalendarIcon className="h-5 w-5" />,
    title: "Registrar tipo de cambio",
    description:
      "Usa el formulario de la izquierda para registrar un nuevo tipo de cambio. Selecciona la fecha, la moneda y el valor en soles.",
    tips: [
      "Selecciona la fecha con el calendario — por defecto es la fecha de hoy.",
      "Elige la moneda: Dólar (USD) o Euro (EUR).",
      "Ingresa el valor con hasta 4 decimales (ej: 3.7250).",
      "Haz clic en 'Registrar' para guardar el tipo de cambio.",
    ],
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Tarjetas de tasa actual",
    description:
      "Las tarjetas en la parte superior muestran el tipo de cambio más reciente para USD y EUR, junto con la tendencia respecto al valor anterior.",
    tips: [
      "La flecha verde indica que el tipo de cambio subió respecto al registro anterior.",
      "La flecha roja indica que bajó.",
      "El porcentaje muestra cuánto varió en relación al valor previo.",
    ],
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Gráfico de evolución",
    description:
      "El gráfico de líneas muestra la evolución histórica de los tipos de cambio a lo largo del tiempo. Puedes filtrar por moneda.",
    tips: [
      "Usa el selector 'Todas', 'USD' o 'EUR' para filtrar las líneas del gráfico.",
      "Pasa el cursor sobre el gráfico para ver el valor exacto en cada fecha.",
      "El gráfico se actualiza automáticamente al registrar nuevos valores.",
    ],
  },
  {
    icon: <History className="h-5 w-5" />,
    title: "Tabla de historial",
    description:
      "La tabla inferior muestra todos los registros de tipo de cambio ordenados por fecha. Puedes buscar y filtrar por rango de fechas.",
    tips: [
      "Usa la barra de búsqueda para filtrar por moneda (ej: 'USD').",
      "El selector de fecha filtra registros dentro de un rango específico.",
      "La tabla tiene paginación para navegar entre muchos registros.",
    ],
  },
]
