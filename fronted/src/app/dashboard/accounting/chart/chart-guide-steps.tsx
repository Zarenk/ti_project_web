import {
  Wallet,
  Search,
  Plus,
  Layers,
  TrendingUp,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const CHART_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Wallet className="h-5 w-5" />,
    title: "Plan de Cuentas",
    description:
      "El Plan de Cuentas es el catálogo de todas las cuentas contables de tu organización. Cada cuenta se agrupa por tipo: Activo, Pasivo, Patrimonio, Ingreso y Gasto.",
    tips: [
      "Las cuentas están organizadas por tipo con colores distintivos.",
      "Cada cuenta tiene un código numérico único (ej: 1011, 4211).",
      "Basado en el Plan Contable General Empresarial (PCGE) peruano.",
    ],
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: "Tipos de cuenta",
    description:
      "Cada tipo de cuenta tiene un propósito diferente en la contabilidad de tu negocio.",
    tips: [
      "ACTIVO: Lo que tienes — efectivo, inventario, cuentas por cobrar.",
      "PASIVO: Lo que debes — deudas, cuentas por pagar, impuestos.",
      "PATRIMONIO: Capital del negocio y resultados acumulados.",
      "INGRESO: Dinero que entra por ventas y servicios.",
      "GASTO: Dinero que sale por costos y gastos operativos.",
    ],
  },
  {
    icon: <Search className="h-5 w-5" />,
    title: "Buscar cuentas",
    description:
      "Usa la barra de búsqueda para encontrar cuentas por código, nombre o tipo. Ideal cuando tienes muchas cuentas registradas.",
    tips: [
      "Escribe el código numérico para encontrar una cuenta específica.",
      "Busca por nombre parcial (ej: 'caja' para encontrar cuentas de caja).",
      "La búsqueda filtra en tiempo real mientras escribes.",
    ],
  },
  {
    icon: <Plus className="h-5 w-5" />,
    title: "Agregar cuenta",
    description:
      "Usa el botón 'Agregar cuenta' para crear una nueva cuenta contable. Define su código, nombre, tipo y saldo inicial.",
    tips: [
      "El código debe ser único y seguir la numeración PCGE.",
      "Selecciona el tipo de cuenta correcto para mantener la estructura.",
      "El saldo inicial se usa como punto de partida para el cálculo.",
      "Las cuentas creadas aparecen inmediatamente en la lista.",
    ],
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Saldos de cuentas",
    description:
      "Cada cuenta muestra su saldo actual calculado a partir de los asientos contables registrados.",
    tips: [
      "El saldo se actualiza automáticamente con cada asiento publicado.",
      "Los activos aumentan por el DEBE y disminuyen por el HABER.",
      "Los pasivos e ingresos aumentan por el HABER y disminuyen por el DEBE.",
      "Verifica que los saldos cuadren con tus registros físicos periódicamente.",
    ],
  },
]
