import {
  Scale,
  Search,
  Calendar,
  Download,
  TrendingUp,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const TRIAL_BALANCE_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Scale className="h-5 w-5" />,
    title: "Balance de Comprobación",
    description:
      "El Balance de Comprobación muestra las sumas y saldos de todas las cuentas contables. Es una herramienta clave para verificar que la contabilidad está cuadrada.",
    tips: [
      "La tabla muestra cada cuenta con sus totales de debe, haber y saldo.",
      "Si la suma total del debe es igual al haber, la contabilidad está balanceada.",
      "Un indicador verde confirma que el balance cuadra correctamente.",
    ],
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Sumas y saldos",
    description:
      "Cada fila muestra el total de movimientos al debe y al haber de una cuenta, junto con su saldo deudor o acreedor resultante.",
    tips: [
      "Saldo Deudor: cuando el total del debe es mayor que el haber.",
      "Saldo Acreedor: cuando el total del haber es mayor que el debe.",
      "Las cuentas de activo y gasto normalmente tienen saldo deudor.",
      "Las cuentas de pasivo, patrimonio e ingreso normalmente tienen saldo acreedor.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar cuentas",
    description:
      "Filtra las cuentas por código o nombre para encontrar rápidamente la información que necesitas.",
    tips: [
      "Escribe el código o nombre de la cuenta en la barra de búsqueda.",
      "La tabla se filtra en tiempo real mientras escribes.",
      "Los totales generales se recalculan según el filtro aplicado.",
    ],
  },
  {
    icon: <Calendar className="h-5 w-5" />,
    title: "Periodo del balance",
    description:
      "Selecciona el rango de fechas para generar el balance. Puedes ver balances mensuales, trimestrales o del periodo que necesites.",
    tips: [
      "Usa el selector de fechas para definir el periodo de consulta.",
      "Por defecto se muestra el mes actual.",
      "El balance se recalcula automáticamente al cambiar el periodo.",
      "Útil para cierres mensuales y presentaciones a SUNAT.",
    ],
  },
  {
    icon: <Download className="h-5 w-5" />,
    title: "Exportar balance",
    description:
      "Descarga el Balance de Comprobación para archivo, análisis externo o presentación tributaria.",
    tips: [
      "El archivo incluye todas las cuentas con movimientos en el periodo.",
      "Verifica que el balance cuadre antes de exportar.",
      "Los datos exportados solo incluyen asientos publicados.",
      "Útil como herramienta de control antes del cierre contable.",
    ],
  },
]
