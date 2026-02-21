"use client"

import {
  Package,
  DollarSign,
  ImageIcon,
  Layers,
  Boxes,
  Barcode,
  Settings,
} from "lucide-react"

import { PageGuideButton, type GuideStep } from "@/components/page-guide-dialog"

const GUIDE_STEPS: GuideStep[] = [
  {
    icon: <Package className="h-5 w-5" />,
    title: "Información básica",
    description:
      "Empieza con el nombre del producto (obligatorio) y selecciona una categoría. El sistema verifica automáticamente que el nombre no esté duplicado.",
    tips: [
      "El nombre se valida en tiempo real — espera el check verde antes de continuar.",
      "Puedes crear una nueva categoría sin salir del formulario con el botón (+).",
      "La marca es opcional y tiene autocompletado con las marcas existentes.",
    ],
  },
  {
    icon: <DollarSign className="h-5 w-5" />,
    title: "Precios y stock",
    description:
      "Define el precio de compra, precio de venta y la cantidad inicial de stock. Usa los botones +/− para ajustes rápidos.",
    tips: [
      "El precio de compra es lo que pagaste al proveedor.",
      "El precio de venta es lo que cobra tu negocio al cliente.",
      "El stock inicial es opcional — puedes asignarlo después con entradas de inventario.",
    ],
  },
  {
    icon: <ImageIcon className="h-5 w-5" />,
    title: "Imágenes del producto",
    description:
      "Agrega una o varias imágenes. Puedes subir archivos desde tu dispositivo o pegar URLs directamente.",
    tips: [
      "Formatos soportados: JPG, PNG, WebP.",
      "Puedes agregar múltiples imágenes — la primera será la principal.",
      "Las imágenes se previsualizan antes de guardar.",
    ],
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: "Características y campos extra",
    description:
      "Agrega características personalizadas (icono + título + descripción). Si tu negocio tiene campos especiales configurados, aparecerán automáticamente según la categoría.",
    tips: [
      "Las características aparecen en la ficha del producto visible para tu equipo.",
      "Los campos marcados con (*) son obligatorios según la configuración de tu negocio.",
      "Verticales como Computadoras muestran campos técnicos: procesador, RAM, etc.",
    ],
  },
  {
    icon: <Boxes className="h-5 w-5" />,
    title: "Modo lote: agregar varios productos",
    description:
      "Usa el botón 'Agregar otro producto' para crear múltiples productos sin salir del formulario. Aparecerá un carrito flotante con todos los productos pendientes.",
    tips: [
      "Cada producto se valida antes de agregarse al lote.",
      "Haz clic en un producto del carrito para editarlo en el formulario.",
      "Al finalizar, asigna tienda y proveedor a todos los productos con 'Asignar stock por tienda'.",
      "Puedes crear productos con o sin stock inicial desde el diálogo de asignación.",
    ],
  },
  {
    icon: <Barcode className="h-5 w-5" />,
    title: "Números de serie (opcional)",
    description:
      "Si tus productos tienen números de serie únicos (equipos electrónicos, herramientas, etc.), puedes asignarlos desde el carrito del lote.",
    tips: [
      "Solo disponible cuando el producto tiene cantidad/stock mayor a 0.",
      "El icono de código de barras aparece junto a cada producto en el carrito.",
      "Las series se validan contra el sistema para evitar duplicados en tu organización.",
      "La cantidad de series no puede superar el stock del producto.",
    ],
  },
  {
    icon: <Settings className="h-5 w-5" />,
    title: "Acciones finales",
    description:
      "Cuando termines, usa los botones al final del formulario para crear, limpiar o volver a la lista de productos.",
    tips: [
      "'Crear Producto' guarda un solo producto inmediatamente.",
      "'Crear Productos (N)' abre el diálogo de asignación cuando hay varios en el lote.",
      "'Limpiar' reinicia el formulario sin eliminar el lote.",
      "'Volver' regresa a la lista de productos.",
    ],
  },
]

/** Trigger button — place next to form title */
export function ProductGuideButton() {
  return (
    <PageGuideButton
      steps={GUIDE_STEPS}
      tooltipLabel="Guía del formulario"
    />
  )
}
