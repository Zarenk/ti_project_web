"use client"

import {
  Building2,
  Laptop,
  ShoppingBag,
  UtensilsCrossed,
  Briefcase,
  Factory,
  Scale,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { VerticalName } from "../tenancy.api"

export type VerticalOption = {
  value: VerticalName
  label: string
  description: string
  enabled: boolean
}

const ICON_MAP: Record<VerticalName, React.ElementType> = {
  GENERAL: Building2,
  COMPUTERS: Laptop,
  RETAIL: ShoppingBag,
  RESTAURANTS: UtensilsCrossed,
  SERVICES: Briefcase,
  MANUFACTURING: Factory,
  LAW_FIRM: Scale,
}

type Props = {
  options: VerticalOption[]
  currentVertical: VerticalName
  selectedVertical: VerticalName | null
  onSelect: (vertical: VerticalName) => void
}

export function VerticalStepSelect({
  options,
  currentVertical,
  selectedVertical,
  onSelect,
}: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Selecciona el vertical al que deseas migrar tu empresa.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {options.map((option) => {
          const Icon = ICON_MAP[option.value] ?? Building2
          const isCurrent = option.value === currentVertical
          const isSelected = option.value === selectedVertical
          const isDisabled = !option.enabled

          return (
            <button
              key={option.value}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelect(option.value)}
              className={cn(
                "relative flex flex-col gap-2 rounded-lg border p-4 text-left transition-all",
                isDisabled
                  ? "cursor-not-allowed opacity-40"
                  : "cursor-pointer hover:shadow-md",
                isSelected && !isDisabled
                  ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                  : "border-slate-200 dark:border-slate-700",
                !isSelected && !isDisabled && "hover:border-slate-300 dark:hover:border-slate-600",
              )}
            >
              {isCurrent && (
                <Badge
                  variant="secondary"
                  className="absolute right-2 top-2 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"
                >
                  Actual
                </Badge>
              )}
              <Icon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {option.label}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {option.description}
                </p>
              </div>
              {isDisabled && (
                <span className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  Proximamente
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
