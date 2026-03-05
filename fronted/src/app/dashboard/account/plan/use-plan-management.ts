import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import type { SubscriptionSummary } from "@/types/subscription"
import {
  cancelSubscription,
  requestPlanChange,
  grantComplimentarySubscription,
  updatePlanTrialDays,
  type SubscriptionPlan,
} from "../billing.api"
import { formatPrice } from "./plan-utils"

// ── Input ──────────────────────────────────────────────────────

interface UsePlanManagementInput {
  targetOrgId: number | null
  targetSummary: SubscriptionSummary | null
  plans: SubscriptionPlan[]
  plansLoading: boolean
  isGlobalSuperAdmin: boolean
  refreshGlobalUsage: () => Promise<void>
  loadSummary: () => void
}

// ── Hook ───────────────────────────────────────────────────────

export function usePlanManagement({
  targetOrgId,
  targetSummary,
  plans,
  plansLoading,
  isGlobalSuperAdmin,
  refreshGlobalUsage,
  loadSummary,
}: UsePlanManagementInput) {
  // ── Plan change ──────────────────────────────────────────────
  const [planCode, setPlanCode] = useState("")
  const [planLockedToSummary, setPlanLockedToSummary] = useState(true)
  const [effectiveImmediately, setEffectiveImmediately] = useState(false)
  const [planSubmitting, setPlanSubmitting] = useState(false)

  // ── Cancel ───────────────────────────────────────────────────
  const [cancelReason, setCancelReason] = useState("")
  const [cancelNotes, setCancelNotes] = useState("")
  const [cancelImmediately, setCancelImmediately] = useState(false)
  const [cancelSubmitting, setCancelSubmitting] = useState(false)

  // ── Complimentary ────────────────────────────────────────────
  const [complimentaryDuration, setComplimentaryDuration] = useState("1")
  const [complimentaryReason, setComplimentaryReason] = useState("")
  const [complimentaryPlanCode, setComplimentaryPlanCode] = useState("")
  const [complimentarySubmitting, setComplimentarySubmitting] = useState(false)

  // ── Trial config ─────────────────────────────────────────────
  const [trialPlanCode, setTrialPlanCode] = useState("")
  const [trialDays, setTrialDays] = useState("")
  const [trialDaysSubmitting, setTrialDaysSubmitting] = useState(false)

  // ── Sync plan code on org change ─────────────────────────────
  useEffect(() => {
    setPlanLockedToSummary(true)
    setPlanCode("")
    setComplimentaryPlanCode((current) => current || targetSummary?.plan?.code || "")
  }, [targetOrgId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!planLockedToSummary) return
    if (targetSummary?.plan?.code) {
      setPlanCode(targetSummary.plan.code)
    } else if (!targetSummary && plans.length > 0 && !planCode) {
      setPlanCode(plans[0].code)
    }
  }, [planLockedToSummary, targetSummary, plans, planCode])

  useEffect(() => {
    if (complimentaryPlanCode) return
    if (targetSummary?.plan?.code) {
      setComplimentaryPlanCode(targetSummary.plan.code)
      return
    }
    if (plans.length > 0) {
      setComplimentaryPlanCode(plans[0].code)
    }
  }, [complimentaryPlanCode, targetSummary?.plan?.code, plans])

  // ── Derived ──────────────────────────────────────────────────
  const selectedPlan = useMemo(() => plans.find((p) => p.code === planCode), [planCode, plans])
  const isSamePlan = targetSummary?.plan?.code ? targetSummary.plan.code === planCode : true

  const complimentaryPlan = useMemo(
    () => plans.find((p) => p.code === complimentaryPlanCode) ?? null,
    [plans, complimentaryPlanCode],
  )
  const complimentaryPreview = useMemo(() => {
    const months = Number(complimentaryDuration)
    if (!Number.isFinite(months) || months <= 0) return null
    const start = new Date()
    const end = new Date(start)
    end.setMonth(end.getMonth() + months)
    return { start, end, months }
  }, [complimentaryDuration])

  // ── Helpers (refresh after mutations) ────────────────────────
  const afterMutation = useCallback(async () => {
    if (isGlobalSuperAdmin) {
      await refreshGlobalUsage()
    } else {
      loadSummary()
    }
  }, [isGlobalSuperAdmin, refreshGlobalUsage, loadSummary])

  // ── Handlers ─────────────────────────────────────────────────
  const handlePlanSelect = useCallback((value: string) => {
    setPlanLockedToSummary(false)
    setPlanCode(value)
  }, [])

  const handlePlanChange = useCallback(async () => {
    if (!targetOrgId) {
      toast.error("Selecciona una organizacion activa para gestionar el plan.")
      return
    }
    if (!planCode || isSamePlan) {
      toast.info("Selecciona un plan diferente para continuar.")
      return
    }
    setPlanSubmitting(true)
    try {
      const response = await requestPlanChange({
        organizationId: targetOrgId,
        planCode,
        effectiveImmediately,
      })
      if (response.checkoutUrl) {
        toast.success("Necesitamos confirmar el pago del nuevo plan. Te redirigiremos al portal seguro.")
        window.location.href = response.checkoutUrl
        return
      }
      if (response.effectiveImmediately) {
        toast.success("El cambio de plan se aplico de inmediato.")
      } else {
        toast.success("Registramos el cambio. Se aplicara al finalizar el periodo vigente.")
      }
      setPlanLockedToSummary(true)
      await afterMutation()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No pudimos ejecutar el cambio de plan.")
    } finally {
      setPlanSubmitting(false)
    }
  }, [targetOrgId, planCode, isSamePlan, effectiveImmediately, afterMutation])

  const handleComplimentaryGrant = useCallback(async () => {
    if (!targetOrgId) {
      toast.error("Selecciona una organizacion activa para continuar.")
      return
    }
    if (!complimentaryPlanCode) {
      toast.error("Selecciona un plan para activar la membresia.")
      return
    }
    const months = Number(complimentaryDuration)
    if (!Number.isFinite(months) || months <= 0) {
      toast.error("Selecciona una duracion valida.")
      return
    }
    setComplimentarySubmitting(true)
    try {
      await grantComplimentarySubscription({
        organizationId: targetOrgId,
        planCode: complimentaryPlanCode,
        durationMonths: months,
        reason: complimentaryReason.trim() || undefined,
      })
      toast.success("Membresia sin pago activada correctamente.")
      setComplimentaryReason("")
      await afterMutation()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No se pudo activar la membresia sin pago.")
    } finally {
      setComplimentarySubmitting(false)
    }
  }, [targetOrgId, complimentaryPlanCode, complimentaryDuration, complimentaryReason, afterMutation])

  const handleCancelSubscription = useCallback(async () => {
    if (!targetOrgId) {
      toast.error("Selecciona una organizacion activa para continuar.")
      return
    }
    if (!cancelReason) {
      toast.error("Selecciona un motivo de cancelacion.")
      return
    }
    if (cancelReason === "other" && !cancelNotes.trim()) {
      toast.error("Detalla el motivo para ayudarnos a mejorar.")
      return
    }
    setCancelSubmitting(true)
    try {
      await cancelSubscription({
        organizationId: targetOrgId,
        cancelImmediately,
        reasonCategory: cancelReason === "other" ? undefined : cancelReason,
        customReason: cancelReason === "other" ? cancelNotes.trim() : cancelNotes.trim() || undefined,
      })
      toast.success("Programamos la cancelacion. Te notificaremos por correo.")
      setCancelNotes("")
      setCancelReason("")
      setCancelImmediately(false)
      await afterMutation()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No pudimos cancelar la suscripcion.")
    } finally {
      setCancelSubmitting(false)
    }
  }, [targetOrgId, cancelReason, cancelNotes, cancelImmediately, afterMutation])

  const handleTrialDaysUpdate = useCallback(async () => {
    if (!trialPlanCode) {
      toast.error("Selecciona un plan para configurar los dias de prueba.")
      return
    }
    const days = Number(trialDays)
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      toast.error("Los dias de prueba deben ser un numero entero entre 1 y 90.")
      return
    }
    setTrialDaysSubmitting(true)
    try {
      await updatePlanTrialDays(trialPlanCode, days)
      toast.success(`Dias de prueba actualizados a ${days} para el plan ${trialPlanCode}.`)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar los dias de prueba.")
    } finally {
      setTrialDaysSubmitting(false)
    }
  }, [trialPlanCode, trialDays])

  const handleTrialPlanSelect = useCallback(
    (value: string) => {
      setTrialPlanCode(value)
      const match = plans.find((p) => p.code === value)
      if (match?.trialDays) {
        setTrialDays(String(match.trialDays))
      }
    },
    [plans],
  )

  return {
    // Plan change
    planCode,
    effectiveImmediately,
    setEffectiveImmediately,
    planSubmitting,
    selectedPlan,
    isSamePlan,
    handlePlanSelect,
    handlePlanChange,

    // Cancel
    cancelReason,
    setCancelReason,
    cancelNotes,
    setCancelNotes,
    cancelImmediately,
    setCancelImmediately,
    cancelSubmitting,
    handleCancelSubscription,

    // Complimentary
    complimentaryDuration,
    setComplimentaryDuration,
    complimentaryReason,
    setComplimentaryReason,
    complimentaryPlanCode,
    setComplimentaryPlanCode,
    complimentarySubmitting,
    complimentaryPlan,
    complimentaryPreview,
    handleComplimentaryGrant,

    // Trial config
    trialPlanCode,
    trialDays,
    setTrialDays,
    trialDaysSubmitting,
    handleTrialPlanSelect,
    handleTrialDaysUpdate,
  }
}
