"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import {
  fetchMLStatus,
  reloadMLModels,
  fetchDemandForecast,
  fetchDemandProductIds,
  fetchBasketSuggestions,
  checkPriceAnomaly,
  fetchClientSegments,
  fetchCategoryMap,
  fetchTrainingStatus,
  startTraining,
  cancelTraining,
  toggleTrainingCron,
  fetchMLProducts,
  type MLStatusMap,
  type DemandForecastResult,
  type BasketRule,
  type PriceCheckResult,
  type ClientSegment,
  type TrainingStatus,
  type TrainingResult,
  type MLProduct,
} from "./ml-analytics.api"

export type MLAnalyticsData = {
  // Auth
  authorized: boolean
  loading: boolean

  // Model status
  status: MLStatusMap
  statusLoading: boolean
  reloading: boolean
  handleReload: () => Promise<void>

  // Training
  trainingStatus: TrainingStatus | null
  trainingLoading: boolean
  isTraining: boolean
  handleStartTraining: (steps?: string[]) => Promise<void>
  handleCancelTraining: () => Promise<void>
  handleToggleCron: (enabled: boolean) => Promise<void>

  // Demand forecast
  demandResult: DemandForecastResult | null
  demandLoading: boolean
  demandProductIds: Set<number>
  searchDemand: (productId: number, days?: number) => Promise<void>

  // Basket analysis
  basketRules: BasketRule[]
  basketLoading: boolean
  searchBasket: (productId: number) => Promise<void>

  // Price check
  priceResult: PriceCheckResult | null
  priceLoading: boolean
  searchPrice: (productId: number, price: number) => Promise<void>

  // Client segments
  segments: Record<string, ClientSegment>
  segmentsLoading: boolean

  // Category map
  categoryMap: Record<string, string>

  // Products for search
  products: MLProduct[]
  productsLoading: boolean
}

export function useMLAnalytics(): MLAnalyticsData {
  const router = useRouter()
  const { role, authPending } = useAuth()
  const normalizedRole = role?.trim().toUpperCase() ?? ""
  const isSuperAdmin = normalizedRole === "SUPER_ADMIN_GLOBAL"

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(true)
  const [reloading, setReloading] = useState(false)

  const [status, setStatus] = useState<MLStatusMap>({})
  const [segments, setSegments] = useState<Record<string, ClientSegment>>({})
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({})
  const [segmentsLoading, setSegmentsLoading] = useState(false)

  const [demandResult, setDemandResult] = useState<DemandForecastResult | null>(null)
  const [demandLoading, setDemandLoading] = useState(false)

  const [basketRules, setBasketRules] = useState<BasketRule[]>([])
  const [basketLoading, setBasketLoading] = useState(false)

  const [priceResult, setPriceResult] = useState<PriceCheckResult | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)

  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus | null>(null)
  const [trainingLoading, setTrainingLoading] = useState(false)
  const [isTraining, setIsTraining] = useState(false)

  const [products, setProducts] = useState<MLProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [demandProductIds, setDemandProductIds] = useState<Set<number>>(new Set())

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authPending) return
    if (!isSuperAdmin) {
      router.replace("/dashboard")
    } else {
      setLoading(false)
    }
  }, [authPending, isSuperAdmin, router])

  // ── Load initial data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (authPending || !isSuperAdmin) return
    let cancelled = false

    async function loadInitial() {
      setStatusLoading(true)
      setSegmentsLoading(true)
      setProductsLoading(true)
      try {
        const [statusData, segmentsData, categories, trainStatus, productsList, demandIds] = await Promise.all([
          fetchMLStatus(),
          fetchClientSegments(),
          fetchCategoryMap(),
          fetchTrainingStatus(),
          fetchMLProducts(),
          fetchDemandProductIds(),
        ])
        if (cancelled) return
        setStatus(statusData)
        setSegments(segmentsData)
        setCategoryMap(categories)
        setTrainingStatus(trainStatus)
        setProducts(productsList)
        setDemandProductIds(new Set(demandIds))
        if (trainStatus.isRunning) setIsTraining(true)
      } catch (err) {
        if (!cancelled) {
          console.error("Error loading ML data:", err)
          toast.error("No se pudieron cargar los datos de modelos ML")
        }
      } finally {
        if (!cancelled) {
          setStatusLoading(false)
          setSegmentsLoading(false)
          setProductsLoading(false)
        }
      }
    }

    loadInitial()
    return () => { cancelled = true }
  }, [authPending, isSuperAdmin])

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleReload = useCallback(async () => {
    setReloading(true)
    try {
      const result = await reloadMLModels()
      const refreshed = await fetchMLStatus()
      setStatus(refreshed)
      toast.success(`Modelos recargados: ${result.loaded.length > 0 ? result.loaded.join(", ") : "ninguno disponible"}`)
    } catch (err) {
      console.error("Reload failed:", err)
      toast.error("Error al recargar modelos")
    } finally {
      setReloading(false)
    }
  }, [])

  const searchDemand = useCallback(async (productId: number, days = 7) => {
    setDemandLoading(true)
    setDemandResult(null)
    try {
      const result = await fetchDemandForecast(productId, days)
      setDemandResult(result)
      if (!result.available) {
        toast.info("No hay prediccion disponible para este producto")
      }
    } catch (err) {
      console.error("Demand forecast error:", err)
      toast.error("Error al obtener prediccion de demanda")
    } finally {
      setDemandLoading(false)
    }
  }, [])

  const searchBasket = useCallback(async (productId: number) => {
    setBasketLoading(true)
    setBasketRules([])
    try {
      const rules = await fetchBasketSuggestions(productId)
      setBasketRules(rules)
      if (rules.length === 0) {
        toast.info("No se encontraron reglas de asociacion para este producto")
      }
    } catch (err) {
      console.error("Basket analysis error:", err)
      toast.error("Error al buscar productos relacionados")
    } finally {
      setBasketLoading(false)
    }
  }, [])

  const searchPrice = useCallback(async (productId: number, price: number) => {
    setPriceLoading(true)
    setPriceResult(null)
    try {
      const result = await checkPriceAnomaly(productId, price)
      setPriceResult(result)
      if (!result.available) {
        toast.info("No hay datos de precio para este producto")
      }
    } catch (err) {
      console.error("Price check error:", err)
      toast.error("Error al verificar el precio")
    } finally {
      setPriceLoading(false)
    }
  }, [])

  const handleStartTraining = useCallback(async (steps?: string[]) => {
    setIsTraining(true)
    try {
      const result = await startTraining(steps)
      // Refresh status + models after training
      const [newStatus, trainSt] = await Promise.all([
        fetchMLStatus(),
        fetchTrainingStatus(),
      ])
      setStatus(newStatus)
      setTrainingStatus(trainSt)

      if (result.success) {
        toast.success(
          `Entrenamiento completado: ${result.summary.successful}/${result.summary.total} modelos entrenados en ${result.elapsedSeconds.toFixed(0)}s`
        )
      } else {
        toast.warning(
          `Entrenamiento parcial: ${result.summary.successful} exitosos, ${result.summary.failed} con errores`
        )
      }
    } catch (err) {
      console.error("Training error:", err)
      toast.error(err instanceof Error ? err.message : "Error al iniciar entrenamiento")
      // Refresh status anyway
      fetchTrainingStatus().then(setTrainingStatus).catch(() => {})
    } finally {
      setIsTraining(false)
    }
  }, [])

  const handleCancelTraining = useCallback(async () => {
    try {
      const result = await cancelTraining()
      if (result.cancelled) {
        toast.info("Entrenamiento cancelado")
        setIsTraining(false)
        const trainSt = await fetchTrainingStatus()
        setTrainingStatus(trainSt)
      } else {
        toast.warning("No hay entrenamiento en curso para cancelar")
      }
    } catch (err) {
      console.error("Cancel training error:", err)
      toast.error("Error al cancelar el entrenamiento")
    }
  }, [])

  const handleToggleCron = useCallback(async (enabled: boolean) => {
    try {
      await toggleTrainingCron(enabled)
      const trainSt = await fetchTrainingStatus()
      setTrainingStatus(trainSt)
      toast.success(enabled ? "Entrenamiento automatico activado" : "Entrenamiento automatico desactivado")
    } catch (err) {
      console.error("Toggle cron error:", err)
      toast.error("Error al cambiar configuracion de entrenamiento automatico")
    }
  }, [])

  // ── Poll training status while training is running ────────────────────────
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isTraining) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    pollingRef.current = setInterval(async () => {
      try {
        const trainSt = await fetchTrainingStatus()
        setTrainingStatus(trainSt)
        // Auto-detect completion from another tab or cron
        if (!trainSt.isRunning && isTraining) {
          setIsTraining(false)
          const newStatus = await fetchMLStatus()
          setStatus(newStatus)
        }
      } catch {
        // Ignore polling errors
      }
    }, 2000)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [isTraining])

  return {
    authorized: isSuperAdmin,
    loading,
    status,
    statusLoading,
    reloading,
    handleReload,
    trainingStatus,
    trainingLoading,
    isTraining,
    handleStartTraining,
    handleCancelTraining,
    handleToggleCron,
    demandResult,
    demandLoading,
    demandProductIds,
    searchDemand,
    basketRules,
    basketLoading,
    searchBasket,
    priceResult,
    priceLoading,
    searchPrice,
    segments,
    segmentsLoading,
    categoryMap,
    products,
    productsLoading,
  }
}
