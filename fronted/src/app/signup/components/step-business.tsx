"use client"

import { useState } from "react"
import {
  Building2,
  Laptop,
  ShoppingBag,
  UtensilsCrossed,
  Briefcase,
  Factory,
  Scale,
  Dumbbell,
  Info,
} from "lucide-react"
import { cn } from "@/lib/utils"

export type VerticalKey =
  | "GENERAL"
  | "RETAIL"
  | "SERVICES"
  | "MANUFACTURING"
  | "COMPUTERS"
  | "RESTAURANTS"
  | "LAW_FIRM"
  | "GYM"

type BusinessData = {
  organizationName: string
  companyName: string
  vertical: VerticalKey
}

type Errors = Partial<Record<"organizationName" | "companyName", string>>

const VERTICALS: {
  value: VerticalKey
  label: string
  description: string
  icon: React.ElementType
}[] = [
  {
    value: "RETAIL",
    label: "Comercio / Tienda",
    description: "Bodega, minimarket, tienda",
    icon: ShoppingBag,
  },
  {
    value: "SERVICES",
    label: "Servicios",
    description: "Consultoria, profesionales",
    icon: Briefcase,
  },
  {
    value: "MANUFACTURING",
    label: "Manufactura",
    description: "Produccion, fabrica",
    icon: Factory,
  },
  {
    value: "COMPUTERS",
    label: "Computacion",
    description: "Tecnologia, laptops",
    icon: Laptop,
  },
  {
    value: "RESTAURANTS",
    label: "Restaurantes",
    description: "Cafeterias, menu",
    icon: UtensilsCrossed,
  },
  {
    value: "LAW_FIRM",
    label: "Estudio Legal",
    description: "Abogados, expedientes",
    icon: Scale,
  },
  {
    value: "GYM",
    label: "Gimnasio",
    description: "Fitness, membresias",
    icon: Dumbbell,
  },
  {
    value: "GENERAL",
    label: "Otro / General",
    description: "Negocio general",
    icon: Building2,
  },
]

type Props = {
  data: BusinessData
  onChange: (data: BusinessData) => void
  onNext: () => void
  onBack: () => void
}

export function StepBusiness({ data, onChange, onNext, onBack }: Props) {
  const [errors, setErrors] = useState<Errors>({})

  const update = (field: keyof BusinessData, value: string) => {
    onChange({ ...data, [field]: value })
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const validate = (): boolean => {
    const next: Errors = {}
    if (data.organizationName.trim().length < 3) {
      next.organizationName = "Min. 3 caracteres."
    }
    if (data.companyName.trim().length < 3) {
      next.companyName = "Min. 3 caracteres."
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleNext = () => {
    if (validate()) onNext()
  }

  const inputClasses = (hasError?: boolean) =>
    `w-full rounded-lg border px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 transition-colors ${
      hasError
        ? "border-destructive focus:ring-destructive/30"
        : "border-border focus:ring-primary/30"
    }`

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Nombre de la organizacion
        </label>
        <input
          name="organizationName"
          value={data.organizationName}
          onChange={(e) => update("organizationName", e.target.value)}
          className={inputClasses(Boolean(errors.organizationName))}
          placeholder="Ej. Grupo Empresarial SAC"
          autoFocus
        />
        {errors.organizationName && (
          <p className="mt-1 text-xs text-destructive">
            {errors.organizationName}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <label className="block text-sm font-medium text-foreground">
            Nombre comercial
          </label>
          <span
            title="La organizacion agrupa tus empresas. El nombre comercial es el que veran tus clientes."
            className="cursor-help"
          >
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </div>
        <input
          name="companyName"
          value={data.companyName}
          onChange={(e) => update("companyName", e.target.value)}
          className={inputClasses(Boolean(errors.companyName))}
          placeholder="Ej. Mi Tienda Central"
        />
        {errors.companyName && (
          <p className="mt-1 text-xs text-destructive">{errors.companyName}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Tipo de negocio
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VERTICALS.map((v) => {
            const Icon = v.icon
            const isSelected = data.vertical === v.value
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => onChange({ ...data, vertical: v.value })}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all cursor-pointer active:scale-[0.97]",
                  isSelected
                    ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                    : "border-border bg-muted/30 hover:border-primary/30 hover:bg-muted/50",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isSelected ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <span className="text-xs font-medium leading-tight text-foreground">
                  {v.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  {v.description}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-border py-3 font-medium text-foreground hover:bg-muted transition cursor-pointer active:scale-[0.98]"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 rounded-xl bg-primary py-3 text-primary-foreground font-semibold hover:bg-primary/90 transition cursor-pointer active:scale-[0.98]"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
