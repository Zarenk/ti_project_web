"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchHealthScore, type HealthScoreData } from "../accounting-analytics.api"

export function useHealthScore() {
  const [data, setData] = useState<HealthScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchHealthScore()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch health score"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { data, loading, error, refetch }
}
