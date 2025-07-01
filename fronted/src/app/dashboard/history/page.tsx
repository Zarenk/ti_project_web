"use client"

import { useEffect, useState } from "react"
import { jwtDecode } from "jwt-decode"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

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

function getUserIdFromToken(): number | null {
  const token = localStorage.getItem("token")
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
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<number | null>(null)

  useEffect(() => {
    async function fetchHistory() {
      const id = getUserIdFromToken()
      if (!id) {
        toast.error("No se pudo obtener el ID del usuario. Inicia sesión nuevamente.")
        return
      }
  
      setUserId(id) // Si necesitas conservarlo en el estado global/local
  
      setLoading(true)
      try {
        const res = await fetch(`http://localhost:4000/api/inventory/history/users/${id}`)
        if (!res.ok) throw new Error("Error al obtener el historial del usuario")
        const data = await res.json()
        setHistory(data)
      } catch (error) {
        console.error("Error:", error)
      } finally {
        setLoading(false)
      }
    }
  
    fetchHistory()
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Tienda(s)</TableHead>
                    <TableHead>Stock Anterior</TableHead>
                    <TableHead>Cambio</TableHead>
                    <TableHead>Stock Actual</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.user.username}</TableCell>
                      <TableCell>{entry.action}</TableCell>
                      <TableCell>{entry.inventory.product.name}</TableCell>
                      <TableCell>
                        {entry.inventory.storeOnInventory.map((s) => s.store.name).join(", ")}
                      </TableCell>
                      <TableCell>{entry.previousStock ?? 0}</TableCell>
                      <TableCell className={entry.stockChange > 0 ? "text-green-600" : "text-red-600"}>
                        {entry.stockChange > 0 ? `+${entry.stockChange}` : entry.stockChange}
                      </TableCell>
                      <TableCell>
                        {entry.inventory.storeOnInventory.map((s) => s.stock).join(", ")}
                      </TableCell>
                      <TableCell>
                        {new Date(entry.createdAt).toLocaleString("es-PE")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}