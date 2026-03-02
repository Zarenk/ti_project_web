import {
  ShoppingCart,
  Store,
  Package,
  Users,
  CreditCard,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const SALE_FORM_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Store className="h-5 w-5" />,
    title: "Seleccionar tienda",
    description:
      "Elige la tienda desde la cual se realizará la venta. Los productos disponibles y su stock dependen de la tienda seleccionada.",
    tips: [
      "Si tienes una sola tienda, se selecciona automáticamente.",
      "El stock mostrado corresponde a la tienda elegida.",
      "Cambiar la tienda actualiza la lista de productos disponibles.",
    ],
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Seleccionar cliente",
    description:
      "Busca y selecciona el cliente de la venta. Esto es necesario para generar facturas o boletas con datos fiscales.",
    tips: [
      "Busca por nombre o número de documento.",
      "El tipo de documento (DNI/RUC) determina si es boleta o factura.",
      "Si no seleccionas cliente, se usa un cliente genérico.",
    ],
  },
  {
    icon: <Package className="h-5 w-5" />,
    title: "Agregar productos",
    description:
      "Busca productos por nombre, código o categoría. Define la cantidad y precio de venta para cada producto.",
    tips: [
      "El stock disponible se muestra junto a cada producto.",
      "No puedes vender más unidades de las que hay en stock.",
      "El precio de venta viene predeterminado pero es editable.",
      "Puedes agregar múltiples productos a la misma venta.",
    ],
  },
  {
    icon: <CreditCard className="h-5 w-5" />,
    title: "Método de pago",
    description:
      "Selecciona el método de pago: efectivo, tarjeta, transferencia, Yape/Plin u otro método configurado.",
    tips: [
      "Efectivo: ingresa el monto recibido y el sistema calcula el vuelto.",
      "Tarjeta: registra el pago con tarjeta de débito o crédito.",
      "Yape/Plin: pago digital con billeteras móviles.",
      "Puedes dividir el pago entre múltiples métodos.",
    ],
  },
  {
    icon: <ShoppingCart className="h-5 w-5" />,
    title: "Confirmar venta",
    description:
      "Revisa el resumen con productos, totales y método de pago. Al confirmar, el stock se descuenta automáticamente y se genera el comprobante.",
    tips: [
      "El IGV (18%) se calcula automáticamente sobre el subtotal.",
      "Al confirmar, el stock se descuenta de la tienda seleccionada.",
      "Se genera automáticamente boleta o factura según el cliente.",
      "Usa el modo rápido para ventas frecuentes y simples.",
    ],
  },
]
