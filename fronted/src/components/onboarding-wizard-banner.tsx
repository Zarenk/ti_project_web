"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ClipboardList, Rocket } from "lucide-react"

import type { OnboardingProgress } from "@/types/onboarding"
import { dismissOnboardingBanner, fetchOnboardingProgress } from "@/lib/onboarding-progress"
import { Button } from "@/components/ui/button"

export function OnboardingWizardBanner() {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null)
  const [hidden, setHidden] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetchOnboardingProgress()
      .then((data) => {
        if (!mounted) return
        setProgress(data)
        setHidden(data.isCompleted || Boolean(data.wizardDismissedAt))
      })
      .catch(() => {
        if (mounted) setHidden(true)
      })
      .finally(() => setLoading(false))
    return () => {
      mounted = false
    }
  }, [])

  if (loading || hidden || !progress) {
    return null
  }

  const pendingSteps = ["companyProfile", "storeSetup", "sunatSetup", "dataImport"].filter(
    (key) => !(progress as any)[key]?.completed,
  )

  const nextLabel =
    pendingSteps.length > 0
      ? `Paso pendiente: ${mapStepKeyToLabel(pendingSteps[0] as keyof OnboardingProgress)}`
      : "Completa el asistente inicial para desbloquear todo"

  async function handleDismiss() {
    try {
      await dismissOnboardingBanner()
      setHidden(true)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="mx-4 mb-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-indigo-900 shadow-sm dark:border-indigo-800/70 dark:bg-indigo-950/40 dark:text-indigo-100">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-white/90 p-2 text-indigo-600 shadow dark:bg-indigo-900/60 dark:text-indigo-200">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Completa la configuración inicial</p>
            <p className="text-sm opacity-80">{nextLabel}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="gap-2 bg-indigo-600 text-white hover:bg-indigo-700">
            <Link href="/dashboard/onboarding">
              <ClipboardList className="h-4 w-4" />
              Abrir asistente
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Ocultar
          </Button>
        </div>
      </div>
    </div>
  )
}

function mapStepKeyToLabel(key: keyof OnboardingProgress | string): string {
  switch (key) {
    case "companyProfile":
      return "Datos de la empresa"
    case "storeSetup":
      return "Tiendas y almacenes"
    case "sunatSetup":
      return "Conectar SUNAT"
    case "dataImport":
      return "Importación / demo"
    default:
      return "Paso pendiente"
  }
}
