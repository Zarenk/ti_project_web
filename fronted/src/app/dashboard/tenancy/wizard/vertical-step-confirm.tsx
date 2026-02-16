"use client"

import { useState } from "react"
import { Loader2, ShieldAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { VerticalCompatibilityResult } from "../tenancy.api"

type Props = {
  targetLabel: string
  result: VerticalCompatibilityResult
  onConfirm: (reason: string) => Promise<void>
  isSubmitting: boolean
}

export function VerticalStepConfirm({
  targetLabel,
  result,
  onConfirm,
  isSubmitting,
}: Props) {
  const [reason, setReason] = useState("")
  const [acceptRisk, setAcceptRisk] = useState(false)

  const hasWarnings = result.warnings.length > 0
  const reasonIsValid = reason.trim().length >= 8
  const confirmDisabled = isSubmitting || !reasonIsValid || (hasWarnings && !acceptRisk)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="change-reason" className="text-sm">
          Motivo del cambio a <span className="font-semibold">{targetLabel}</span>
        </Label>
        <Textarea
          id="change-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe por que necesitas cambiar el vertical..."
          className="min-h-[80px]"
        />
        {!reasonIsValid && reason.length > 0 && (
          <p className="text-[11px] text-amber-600">
            Describe el motivo con al menos 8 caracteres.
          </p>
        )}
      </div>

      {hasWarnings && (
        <>
          <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Advertencias pendientes</AlertTitle>
            <AlertDescription className="text-xs">
              Debes reconocer los riesgos antes de continuar.
            </AlertDescription>
          </Alert>
          <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-600 dark:text-slate-200">
            <Checkbox
              checked={acceptRisk}
              onCheckedChange={(value) => setAcceptRisk(Boolean(value))}
            />
            <span>
              Confirmo que revise las advertencias y acepto continuar bajo mi responsabilidad.
            </span>
          </label>
        </>
      )}

      {isSubmitting && (
        <Alert className="border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Procesando cambio...</AlertTitle>
          <AlertDescription className="text-xs">
            Estamos actualizando la configuracion. Esto puede tardar algunos segundos.
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={() => onConfirm(reason)}
        disabled={confirmDisabled}
        className="w-full sm:w-auto"
      >
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Confirmar cambio de vertical
      </Button>
    </div>
  )
}
