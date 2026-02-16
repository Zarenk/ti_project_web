'use client'

import { useCallback, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CatalogStepper, type StepDef } from "@/app/dashboard/catalog/catalog-stepper"
import { VERTICAL_CONFIG_INVALIDATE_EVENT } from "@/hooks/use-vertical-config"
import type {
  OrganizationVerticalInfo,
  VerticalCompatibilityResult,
  VerticalName,
} from "./tenancy.api"
import { updateCompanyVertical } from "./tenancy.api"
import {
  VerticalStepSelect,
  VerticalStepValidate,
  VerticalStepReview,
  VerticalStepConfirm,
  type VerticalOption,
} from "./wizard"

const STEPS: StepDef[] = [
  { label: "Seleccionar", description: "Elige el vertical objetivo" },
  { label: "Validar", description: "Verificar compatibilidad" },
  { label: "Revisar", description: "Impacto en datos" },
  { label: "Confirmar", description: "Motivo y confirmacion" },
]

const VERTICAL_OPTIONS: VerticalOption[] = [
  {
    value: "GENERAL",
    label: "General",
    description: "Configuracion estandar para todo tipo de negocio.",
    enabled: true,
  },
  {
    value: "COMPUTERS",
    label: "Venta de Computadoras/Laptops",
    description: "Productos con ficha tecnica y especificaciones visibles.",
    enabled: true,
  },
  {
    value: "RETAIL",
    label: "Retail",
    description: "Tiendas fisicas y comercio minorista con variantes.",
    enabled: true,
  },
  {
    value: "RESTAURANTS",
    label: "Restaurantes",
    description: "Optimizado para menu, mesas y pedidos de cocina.",
    enabled: true,
  },
  {
    value: "SERVICES",
    label: "Servicios",
    description: "Consultorias y gestion de proyectos (muy pronto).",
    enabled: false,
  },
  {
    value: "MANUFACTURING",
    label: "Manufactura",
    description: "Produccion y control de planta (muy pronto).",
    enabled: false,
  },
]

const VERTICAL_EFFECT_MESSAGES: Partial<Record<VerticalName, string>> = {
  GENERAL:
    "Los formularios vuelven al esquema general. Los campos extra del vertical anterior se ocultaran.",
  COMPUTERS:
    "Los formularios van a mostrar la seccion de especificaciones para computadoras y laptops.",
  RETAIL:
    "Los formularios de productos e inventario ahora solicitaran talla y color por cada variante.",
  RESTAURANTS:
    "Se habilitaran modulos de mesas y cocina. Configura estaciones y tiempos de preparacion.",
  SERVICES:
    "El inventario pasa a solo lectura y se prioriza la gestion de citas y proyectos.",
  MANUFACTURING:
    "Se activan ordenes de trabajo, BOM y paneles de produccion.",
}

const REFRESH_EVENTS = [
  VERTICAL_CONFIG_INVALIDATE_EVENT,
  "tenant-context:refresh",
  "site-settings:refresh",
] as const

type Props = {
  organizationId: number
  companyId: number
  info: OrganizationVerticalInfo
  disabled?: boolean
}

export function VerticalManagementPanel({ organizationId, companyId, info }: Props) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedVertical, setSelectedVertical] = useState<VerticalName | null>(null)
  const [compatibilityResult, setCompatibilityResult] =
    useState<VerticalCompatibilityResult | null>(null)
  const [isSubmitting, startTransition] = useTransition()

  const currentOption = VERTICAL_OPTIONS.find((o) => o.value === info.businessVertical)
  const targetOption = VERTICAL_OPTIONS.find((o) => o.value === selectedVertical)

  const canReachStep = useCallback(
    (index: number) => {
      if (index === 0) return true
      if (index === 1)
        return Boolean(selectedVertical && selectedVertical !== info.businessVertical)
      if (index === 2 || index === 3)
        return Boolean(compatibilityResult && compatibilityResult.errors.length === 0)
      return false
    },
    [selectedVertical, info.businessVertical, compatibilityResult],
  )

  const handleVerticalSelect = (vertical: VerticalName) => {
    setSelectedVertical(vertical)
    if (compatibilityResult) {
      setCompatibilityResult(null)
    }
  }

  const handleCompatibilityResult = useCallback(
    (result: VerticalCompatibilityResult) => {
      setCompatibilityResult(result)
    },
    [],
  )

  const handleStepClick = (index: number) => {
    if (canReachStep(index)) {
      setCurrentStep(index)
    }
  }

  const handleNextStep = () => {
    const next = currentStep + 1
    if (next < STEPS.length && canReachStep(next)) {
      setCurrentStep(next)
    }
  }

  const handleConfirm = async (reason: string) => {
    if (!selectedVertical || !compatibilityResult) return

    startTransition(async () => {
      try {
        const hasWarnings = compatibilityResult.warnings.length > 0
        await updateCompanyVertical(companyId, {
          vertical: selectedVertical,
          reason: reason.trim(),
          force: hasWarnings ? true : undefined,
        })

        const effectMessage =
          VERTICAL_EFFECT_MESSAGES[selectedVertical] ??
          "La plataforma aplico la configuracion del nuevo vertical."

        toast.success("Vertical actualizado correctamente.", {
          description: effectMessage,
        })

        REFRESH_EVENTS.forEach((eventName) =>
          window.dispatchEvent(new Event(eventName)),
        )

        setCurrentStep(0)
        setSelectedVertical(null)
        setCompatibilityResult(null)
        router.refresh()
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No se pudo cambiar el vertical."
        toast.error(message)
      }
    })
  }

  return (
    <div className="space-y-4 rounded-lg bg-white/70 p-4 text-xs dark:bg-slate-900/60">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Vertical actual
          </p>
          <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {info.config?.displayName ?? currentOption?.label ?? info.businessVertical}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {info.config?.description ??
              currentOption?.description ??
              "Configuracion personalizada"}
          </p>
        </div>
        <Badge variant="outline" className="self-start text-[11px] uppercase">
          {info.businessVertical}
        </Badge>
      </div>

      <Separator className="bg-slate-200 dark:bg-slate-800" />

      <CatalogStepper
        steps={STEPS}
        currentStep={currentStep}
        onStepClick={handleStepClick}
        canReachStep={canReachStep}
      />

      <div className="min-h-[200px]">
        {currentStep === 0 && (
          <VerticalStepSelect
            options={VERTICAL_OPTIONS}
            currentVertical={info.businessVertical}
            selectedVertical={selectedVertical}
            onSelect={handleVerticalSelect}
          />
        )}

        {currentStep === 1 && selectedVertical && (
          <VerticalStepValidate
            companyId={companyId}
            targetVertical={selectedVertical}
            onResult={handleCompatibilityResult}
            cachedResult={compatibilityResult}
          />
        )}

        {currentStep === 2 && selectedVertical && compatibilityResult && (
          <VerticalStepReview
            currentLabel={currentOption?.label ?? info.businessVertical}
            targetLabel={targetOption?.label ?? selectedVertical}
            result={compatibilityResult}
          />
        )}

        {currentStep === 3 && selectedVertical && compatibilityResult && (
          <VerticalStepConfirm
            targetLabel={targetOption?.label ?? selectedVertical}
            result={compatibilityResult}
            onConfirm={handleConfirm}
            isSubmitting={isSubmitting}
          />
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
        >
          Atras
        </Button>
        {currentStep < 3 && (
          <Button
            size="sm"
            disabled={!canReachStep(currentStep + 1)}
            onClick={handleNextStep}
          >
            Siguiente
          </Button>
        )}
      </div>
    </div>
  )
}
