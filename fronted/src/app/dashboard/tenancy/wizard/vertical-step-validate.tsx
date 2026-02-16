"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, Loader2, TriangleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { VerticalCompatibilityResult, VerticalName } from "../tenancy.api"
import { checkCompanyVerticalCompatibility } from "../tenancy.api"

type Props = {
  companyId: number
  targetVertical: VerticalName
  onResult: (result: VerticalCompatibilityResult) => void
  cachedResult: VerticalCompatibilityResult | null
}

export function VerticalStepValidate({
  companyId,
  targetVertical,
  onResult,
  cachedResult,
}: Props) {
  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<VerticalCompatibilityResult | null>(cachedResult)
  const [error, setError] = useState<string | null>(null)
  const ranRef = useRef(false)

  useEffect(() => {
    if (cachedResult) {
      setResult(cachedResult)
      return
    }

    if (ranRef.current) return
    ranRef.current = true

    const run = async () => {
      setIsChecking(true)
      setError(null)
      try {
        const res = await checkCompanyVerticalCompatibility(companyId, targetVertical)
        setResult(res)
        onResult(res)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "No se pudo validar la compatibilidad."
        setError(message)
      } finally {
        setIsChecking(false)
      }
    }

    void run()
  }, [companyId, targetVertical, cachedResult, onResult])

  const handleRetry = async () => {
    setIsChecking(true)
    setError(null)
    try {
      const res = await checkCompanyVerticalCompatibility(companyId, targetVertical)
      setResult(res)
      onResult(res)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo validar la compatibilidad."
      setError(message)
    } finally {
      setIsChecking(false)
    }
  }

  if (isChecking) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Validando compatibilidad...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-3">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error de validacion</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={handleRetry}>
          Reintentar
        </Button>
      </div>
    )
  }

  if (!result) return null

  const hasErrors = result.errors.length > 0
  const hasWarnings = result.warnings.length > 0
  const allClear = !hasErrors && !hasWarnings

  return (
    <div className="space-y-3">
      {hasErrors && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errores detectados — no se puede continuar</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
              {result.errors.map((err, i) => (
                <li key={`err-${i}`}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {hasWarnings && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <TriangleAlert className="h-4 w-4" />
          <AlertTitle>Advertencias</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
              {result.warnings.map((w, i) => (
                <li key={`warn-${i}`}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {allClear && (
        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Compatibilidad validada</AlertTitle>
          <AlertDescription className="text-xs">
            No se detectaron errores ni advertencias. Puedes continuar con el cambio.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-xs">
          Tiempo estimado: {result.estimatedDowntime} min
        </Badge>
        {result.affectedModules.map((mod) => (
          <Badge key={mod} variant="secondary" className="text-[10px]">
            {mod}
          </Badge>
        ))}
      </div>
    </div>
  )
}
