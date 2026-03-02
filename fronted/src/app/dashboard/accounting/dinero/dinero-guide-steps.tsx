import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const DINERO_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <DollarSign className="h-5 w-5" />,
    title: "Mi Dinero",
    description:
      "Vista simplificada de tu situación financiera. Muestra cuánto dinero tienes, cuánto te deben y cuánto debes de forma fácil de entender.",
    tips: [
      "Los montos se muestran en la moneda principal de tu organización.",
      "Los datos se calculan a partir de tus registros contables.",
      "Esta vista es la versión simplificada del Balance General.",
    ],
  },
  {
    icon: <Wallet className="h-5 w-5" />,
    title: "Efectivo disponible",
    description:
      "Muestra el saldo actual de tus cuentas de efectivo: caja, bancos y cuentas por cobrar.",
    tips: [
      "Incluye efectivo en caja y saldos bancarios.",
      "Las cuentas por cobrar muestran lo que te deben clientes.",
      "Se actualiza con cada venta y cobro registrado.",
    ],
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Ingresos",
    description:
      "Resumen de los ingresos del periodo: ventas, cobros y otros ingresos de tu negocio.",
    tips: [
      "Los ingresos provienen principalmente de las ventas.",
      "Se muestra el total del periodo seleccionado.",
      "Compara con periodos anteriores para ver tendencias.",
    ],
  },
  {
    icon: <TrendingDown className="h-5 w-5" />,
    title: "Gastos",
    description:
      "Resumen de los gastos del periodo: compras, costos operativos y otros egresos.",
    tips: [
      "Los gastos incluyen compras de mercadería y costos operativos.",
      "Los gastos se registran automáticamente con cada compra.",
      "Identifica gastos excesivos para optimizar costos.",
    ],
  },
  {
    icon: <PieChart className="h-5 w-5" />,
    title: "Resumen financiero",
    description:
      "El resumen muestra la diferencia entre ingresos y gastos: tu ganancia o pérdida del periodo.",
    tips: [
      "Verde indica ganancia (ingresos > gastos).",
      "Rojo indica pérdida (gastos > ingresos).",
      "Revisa este resumen periódicamente para tomar decisiones.",
    ],
  },
]
