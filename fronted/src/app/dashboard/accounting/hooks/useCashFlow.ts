"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchCashFlow, type CashFlowData } from "../accounting-analytics.api"

export function useCashFlow() {
  const [data, setData] = useState<CashFlowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchCashFlow()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch cash flow"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
