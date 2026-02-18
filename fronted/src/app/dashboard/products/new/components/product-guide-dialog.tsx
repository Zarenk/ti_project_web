"use client"

import { useState } from "react"
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Package,
  DollarSign,
  ImageIcon,
  Layers,
  Boxes,
  Barcode,
  Settings,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type GuideStep = {
  icon: React.ReactNode
  title: string
  description: string
  tips: string[]
}

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

type ProductGuideDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductGuideDialog({
  open,
  onOpenChange,
}: ProductGuideDialogProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const step = GUIDE_STEPS[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === GUIDE_STEPS.length - 1

  const handleOpenChange = (value: boolean) => {
    if (!value) setCurrentStep(0)
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px] gap-0 p-0 overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{
              width: `${((currentStep + 1) / GUIDE_STEPS.length) * 100}%`,
            }}
          />
        </div>

        <DialogHeader className="px-5 pt-5 pb-0 sm:px-6 sm:pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {step.icon}
              </div>
              <div>
                <DialogTitle className="text-base">
                  {step.title}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Paso {currentStep + 1} de {GUIDE_STEPS.length}
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="tabular-nums text-[10px] shrink-0"
            >
              {currentStep + 1}/{GUIDE_STEPS.length}
            </Badge>
          </div>
        </DialogHeader>

        {/* Step content */}
        <div className="px-5 py-4 sm:px-6">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>

          {/* Tips */}
          <div className="mt-4 space-y-2">
            {step.tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-md border border-border/50 bg-muted/30 px-3 py-2"
              >
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary tabular-nums">
                  {i + 1}
                </span>
                <p className="text-xs text-foreground/80 leading-relaxed">
                  {tip}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Step navigation dots */}
        <div className="flex items-center justify-center gap-1.5 pb-2">
          {GUIDE_STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                i === currentStep
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40",
              )}
              onClick={() => setCurrentStep(i)}
              aria-label={`Ir al paso ${i + 1}`}
            />
          ))}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between border-t border-border/40 px-5 py-3 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={isFirst}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </Button>

          {isLast ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => handleOpenChange(false)}
            >
              Entendido
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setCurrentStep((s) => s + 1)}
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Trigger button — place in page header */
export function ProductGuideButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 cursor-pointer border-primary/30 text-primary hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
              onClick={() => setOpen(true)}
            >
              <BookOpen className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Guía del formulario
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ProductGuideDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
