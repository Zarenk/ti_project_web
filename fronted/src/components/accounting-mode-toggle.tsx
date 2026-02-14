"use client"

import { useAccountingMode } from "@/context/accounting-mode-context"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Info } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AccountingModeToggleProps {
  className?: string
  variant?: "default" | "compact"
}

export function AccountingModeToggle({ className, variant = "default" }: AccountingModeToggleProps) {
  const { mode, setMode, isLoading } = useAccountingMode()

  const handleToggle = async (checked: boolean) => {
    const newMode = checked ? "contador" : "simple"
    await setMode(newMode)
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Label
          htmlFor="accounting-mode"
          className={cn(
            "text-sm font-medium cursor-pointer transition-colors",
            mode === "simple" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          Simple
        </Label>
        <Switch
          id="accounting-mode"
          checked={mode === "contador"}
          onCheckedChange={handleToggle}
          disabled={isLoading}
          aria-label="Cambiar modo de contabilidad"
        />
        <Label
          htmlFor="accounting-mode"
          className={cn(
            "text-sm font-medium cursor-pointer transition-colors",
            mode === "contador" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          Contador
        </Label>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-between gap-4 p-4 border rounded-lg bg-card", className)}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Modo de Visualización</h3>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  <strong>Modo Simple:</strong> Visualización enfocada en decisiones de negocio con lenguaje sencillo.
                  <br /><br />
                  <strong>Modo Contador:</strong> Visualización técnica con terminología contable estándar para profesionales.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "simple"
            ? "Información enfocada en decisiones de negocio"
            : "Visualización técnica para contadores"}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Label
          htmlFor="accounting-mode-default"
          className={cn(
            "text-sm font-medium cursor-pointer transition-colors select-none",
            mode === "simple" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          Simple
        </Label>
        <Switch
          id="accounting-mode-default"
          checked={mode === "contador"}
          onCheckedChange={handleToggle}
          disabled={isLoading}
          aria-label="Cambiar modo de contabilidad"
        />
        <Label
          htmlFor="accounting-mode-default"
          className={cn(
            "text-sm font-medium cursor-pointer transition-colors select-none",
            mode === "contador" ? "text-foreground" : "text-muted-foreground"
          )}
        >
          Contador
        </Label>
      </div>
    </div>
  )
}
