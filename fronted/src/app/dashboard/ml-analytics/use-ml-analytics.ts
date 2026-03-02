"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import {
  fetchMLStatus,
  reloadMLModels,
  fetchDemandForecast,
  fetchBasketSuggestions,
  checkPriceAnomaly,
  fetchClientSegments,
  fetchCategoryMap,
  type MLStatusMap,
  type DemandForecastResult,
  type BasketRule,
  type PriceCheckResult,
  type ClientSegment,
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

  // Demand forecast
  demandResult: DemandForecastResult | null
  demandLoading: boolean
  searchDemand: (productId: number) => Promise<void>

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
      try {
        const [statusData, segmentsData, categories] = await Promise.all([
          fetchMLStatus(),
          fetchClientSegments(),
          fetchCategoryMap(),
        ])
        if (cancelled) return
        setStatus(statusData)
        setSegments(segmentsData)
        setCategoryMap(categories)
      } catch (err) {
        if (!cancelled) {
          console.error("Error loading ML data:", err)
          toast.error("No se pudieron cargar los datos de modelos ML")
        }
      } finally {
        if (!cancelled) {
          setStatusLoading(false)
          setSegmentsLoading(false)
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

  const searchDemand = useCallback(async (productId: number) => {
    setDemandLoading(true)
    setDemandResult(null)
    try {
      const result = await fetchDemandForecast(productId)
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

  return {
    authorized: isSuperAdmin,
    loading,
    status,
    statusLoading,
    reloading,
    handleReload,
    demandResult,
    demandLoading,
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
  }
}
