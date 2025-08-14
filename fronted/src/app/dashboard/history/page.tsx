"use client"

import { useEffect, useState } from "react"
import { jwtDecode } from "jwt-decode"
import { getAuthToken } from "@/utils/auth-token"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "./data-table"
import { columns, History } from "./columns"
import { getUserHistory, getUserActivity } from "./history.api"
import { activityColumns, Activity } from "./activity-columns"

interface HistoryEntry {
  id: number
  action: string
  stockChange: number
  previousStock: number | null
  newStock: number | null
  createdAt: string
  user: { username: string }
  inventory: {
    product: { name: string }
    storeOnInventory: {
      store: { name: string }
      stock: number
    }[]
  }
}

async function getUserIdFromToken(): Promise<number | null> {
  const token = await getAuthToken()
  if (!token) {
    return null
  }

  try {
    const decodedToken: { sub: number } = jwtDecode(token)
    return decodedToken.sub
  } catch (error) {
    console.error("Error decoding token:", error)
    return null
  }
}

export default function UserHistory() {
  const [history, setHistory] = useState<History[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)

  useEffect(() => {
    async function fetchData() {
      const id = await getUserIdFromToken()
      if (!id) {
        toast.error("No se pudo obtener el ID del usuario. Inicia sesión nuevamente.")
        return
      }
  
      setUserId(id) // Si necesitas conservarlo en el estado global/local
  
      setLoading(true)
      try {
        const [historyData, activityData] = await Promise.all([
          getUserHistory(id),
          getUserActivity(id),
        ])
        const mapped = historyData.map((entry: HistoryEntry) => ({
          id: entry.id,
          username: entry.user.username,
          action: entry.action,
          product: entry.inventory.product.name,
          stores: entry.inventory.storeOnInventory.map((s) => s.store.name).join(", "),
          previousStock: entry.previousStock ?? 0,
          stockChange: entry.stockChange,
          newStock: entry.inventory.storeOnInventory.map((s) => s.stock).join(", "),
          createdAt: entry.createdAt,
        })) as History[]
        setHistory(mapped)
        const mappedActivity = activityData.map((entry: any) => ({
          id: entry.id,
          username: entry.actorEmail ?? "",
          action: entry.action,
          entityType: entry.entityType,
          summary: entry.summary,
          createdAt: entry.createdAt,
        })) as Activity[]
        setActivity(mappedActivity)
      } catch (error) {
        console.error("Error:", error)
      } finally {
        setLoading(false)
      }
    }
  
    fetchData()
  }, [])

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Historial del Usuario</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <p className="text-muted-foreground">No hay historial disponible para este usuario.</p>
          ) : (
            <div className="overflow-auto">
              <DataTable columns={columns} data={history} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-xl">Actividad del Usuario</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-muted-foreground">No hay actividad disponible para este usuario.</p>
          ) : (
            <div className="overflow-auto">
              <DataTable columns={activityColumns} data={activity} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}