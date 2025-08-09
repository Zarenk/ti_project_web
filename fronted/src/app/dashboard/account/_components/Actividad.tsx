"use client"

import { useEffect, useMemo, useState } from "react"
import { DateRange } from "react-day-picker"
import { getAuthToken, getUserDataFromToken } from "@/lib/auth"
import ActivityFilters from "./ActivityFilter"
import SummaryCards from "./SummaryCard"
import ActivityTable, { ActivityItem } from "./ActivityTable"
import RequireAdmin from "@/components/require-admin"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"

export default function Actividad() {
  const [data, setData] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [movement, setMovement] = useState("TODOS")
  const [date, setDate] = useState<DateRange | undefined>(undefined)

  useEffect(() => {
    async function load() {
      try {
        const token = getAuthToken()
        const res = await fetch(`${BACKEND_URL}/api/clients/activity`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: "include",
        })
        if (!res.ok) throw new Error("Error")
        const json = await res.json()
        setData(json as ActivityItem[])
      } catch (err) {
        console.error(err)
        setError("Error al cargar la actividad")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    let result = data
    if (movement !== "TODOS") {
      result = result.filter((i) => i.tipo === movement)
    }
    if (date?.from && date?.to) {
      const from = new Date(date.from)
      const to = new Date(date.to)
      result = result.filter((i) => {
        const d = new Date(i.fecha)
        return d >= from && d <= to
      })
    }
    if (search) {
      const s = search.toLowerCase()
      result = result.filter((i) => i.descripcion.toLowerCase().includes(s))
    }
    return result
  }, [data, movement, date, search])

  const resumen = useMemo(() => {
    const ingresos = filtered
      .filter((i) => i.tipo === "INGRESO")
      .reduce((acc, cur) => acc + cur.monto, 0)
    const egresos = filtered
      .filter((i) => i.tipo === "EGRESO")
      .reduce((acc, cur) => acc + cur.monto, 0)
    return { ingresos, egresos, total: ingresos - egresos }
  }, [filtered])

  const handleExport = async () => {
    const user = await getUserDataFromToken()
    const clientId = user?.userId || 0
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const headers = ["Fecha", "Tipo", "Descripción", "Monto"]
    const rows = filtered.map((r) => [r.fecha, r.tipo, r.descripcion, r.monto.toString()])
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", `actividad_${clientId}_${dateStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleReset = () => {
    setSearch("")
    setMovement("TODOS")
    setDate(undefined)
  }

  return (
    <RequireAdmin>
      <section className="space-y-6">
        <ActivityFilters
          search={search}
          onSearchChange={setSearch}
          movement={movement}
          onMovementChange={setMovement}
          date={date}
          onDateChange={setDate}
          onExport={handleExport}
          onReset={handleReset}
        />
        {error ? (
          <div className="text-center text-sm text-red-600">{error}</div>
        ) : (
          <>
            <SummaryCards
              ingresos={resumen.ingresos}
              egresos={resumen.egresos}
              total={resumen.total}
              loading={loading}
            />
            <ActivityTable data={filtered} loading={loading} />
          </>
        )}
      </section>
    </RequireAdmin>
  )
}