import {
  Truck,
  Store,
  Package,
  Calculator,
  Save,
} from "lucide-react"
import type { GuideStep } from "@/components/page-guide-dialog"

export const ENTRY_FORM_GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Truck className="h-5 w-5" />,
    title: "Seleccionar proveedor",
    description:
      "Elige el proveedor del cual estás recibiendo la mercadería. Puedes buscar por nombre o RUC en el selector.",
    tips: [
      "El proveedor es obligatorio para registrar el ingreso.",
      "Busca por nombre o número de documento del proveedor.",
      "Si el proveedor no existe, créalo primero en la sección de Proveedores.",
    ],
  },
  {
    icon: <Store className="h-5 w-5" />,
    title: "Seleccionar tienda",
    description:
      "Selecciona la tienda o almacén donde se recibirá la mercadería. El stock se actualizará en esa ubicación.",
    tips: [
      "La tienda determina dónde se sumará el stock.",
      "Si tienes una sola tienda, se selecciona automáticamente.",
      "Puedes cambiar la tienda antes de guardar el ingreso.",
    ],
  },
  {
    icon: <Package className="h-5 w-5" />,
    title: "Agregar productos",
    description:
      "Agrega los productos que ingresan al inventario. Busca por nombre o código de barras, define la cantidad y el precio unitario de compra.",
    tips: [
      "Busca productos por nombre, código o categoría.",
      "Define la cantidad recibida de cada producto.",
      "Ingresa el precio de compra unitario (sin IGV).",
      "Puedes agregar múltiples productos en un solo registro.",
    ],
  },
  {
    icon: <Calculator className="h-5 w-5" />,
    title: "Moneda y totales",
    description:
      "Selecciona la moneda de la compra (Soles o Dólares). El sistema calcula automáticamente subtotal, IGV y total.",
    tips: [
      "PEN (Soles) es la moneda predeterminada.",
      "USD (Dólares) usa el tipo de cambio configurado.",
      "El IGV (18%) se calcula automáticamente sobre el subtotal.",
      "Verifica los totales antes de guardar el registro.",
    ],
  },
  {
    icon: <Save className="h-5 w-5" />,
    title: "Guardar registro",
    description:
      "Al guardar, el sistema registra el ingreso y actualiza automáticamente el stock de cada producto en la tienda seleccionada.",
    tips: [
      "El stock se incrementa inmediatamente al guardar.",
      "El registro queda asociado al usuario que lo creó.",
      "Puedes editar el registro después si necesitas corregir datos.",
      "Usa el modo rápido para ingresos simples y frecuentes.",
    ],
  },
]
