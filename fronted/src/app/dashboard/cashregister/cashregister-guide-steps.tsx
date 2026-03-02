import {
  Landmark,
  DoorOpen,
  DoorClosed,
  Banknote,
  ClipboardList,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const CASHREGISTER_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Landmark className="h-5 w-5" />,
    title: "Gestión de Cajas",
    description:
      "Administra las cajas registradoras de tu negocio. Abre y cierra turnos, controla el efectivo y lleva un registro detallado de cada operación.",
    tips: [
      "Cada caja tiene un estado: abierta o cerrada.",
      "Solo una caja puede estar abierta por usuario a la vez.",
      "El saldo se calcula en tiempo real con cada transacción.",
    ],
  },
  {
    icon: <DoorOpen className="h-5 w-5" />,
    title: "Abrir caja",
    description:
      "Para iniciar operaciones debes abrir una caja con un monto inicial de efectivo. Este monto será la base para el control del turno.",
    tips: [
      "Ingresa el monto de apertura (efectivo contado al inicio).",
      "La fecha y hora de apertura se registran automáticamente.",
      "El usuario que abre la caja queda asociado al turno.",
    ],
  },
  {
    icon: <DoorClosed className="h-5 w-5" />,
    title: "Cerrar caja",
    description:
      "Al finalizar el turno, cierra la caja declarando el efectivo real. El sistema calcula automáticamente si hay diferencia con lo esperado.",
    tips: [
      "Ingresa el monto de cierre (efectivo contado al final).",
      "El sistema muestra la diferencia entre lo esperado y lo real.",
      "Un resumen del turno se genera automáticamente al cerrar.",
      "Las diferencias se registran para auditoría.",
    ],
  },
  {
    icon: <Banknote className="h-5 w-5" />,
    title: "Movimientos de caja",
    description:
      "Registra entradas y salidas de efectivo adicionales: retiros, depósitos, gastos menores y otros movimientos fuera de las ventas.",
    tips: [
      "Las ventas se registran automáticamente en la caja activa.",
      "Puedes agregar ingresos o egresos manuales con descripción.",
      "Cada movimiento queda asociado al turno activo.",
    ],
  },
  {
    icon: <ClipboardList className="h-5 w-5" />,
    title: "Historial de turnos",
    description:
      "Consulta el historial de todos los turnos anteriores con sus detalles de apertura, cierre, ventas y movimientos.",
    tips: [
      "Cada turno muestra apertura, cierre y totales.",
      "Puedes ver el detalle de transacciones de cada turno.",
      "El historial se filtra por fecha y por caja.",
      "Útil para auditorías y control interno.",
    ],
  },
]
