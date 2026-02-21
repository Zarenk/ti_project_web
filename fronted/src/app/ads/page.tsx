"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ManualPagination } from "@/components/data-table-pagination"
import { Campaign, fetchCampaigns, createCampaign } from "./ads.api"
import { useRBAC } from "../hooks/use-rbac"
import { trackEvent } from "@/lib/analytics"

const statusLabels: Record<string, string> = {
  active: "Activa",
  paused: "Pausada",
}

export default function AdsDashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canCreate = useRBAC(["admin", "marketing"])
  const organizationId = 1

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchCampaigns(organizationId, page, pageSize)
      .then(({ items, total }) => {
        setCampaigns(items)
        setTotal(total)
      })
      .catch(() => setError("Error al cargar campañas"))
      .finally(() => setLoading(false))
  }, [page, pageSize])

  const handleCreate = async () => {
    trackEvent("ads.create_campaign.clicked")
    const name = prompt("Campaign name?")
    if (!name) return
    try {
      const created = await createCampaign(organizationId, {
        name,
        status: "draft",
      })
      setCampaigns((prev) => [...prev, created])
      setTotal((t) => t + 1)
    } catch {
      setError("Failed to create campaign")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Panel de Publicidad</h1>
          <p className="text-sm text-muted-foreground">
            Gestiona tus campañas y creatividades de forma sencilla.
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleCreate}>Crear campaña</Button>
        )}
      </div>

      {loading && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-9 w-28 rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {error && (
        <Card>
          <CardContent className="text-red-500">{error}</CardContent>
        </Card>
      )}
      {!loading && !error && campaigns.length === 0 && (
        <Card>
          <CardContent>No se encontraron campañas.</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {campaigns.map((c) => (
          <Card key={c.id} className="hover:shadow">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{c.name}</CardTitle>
              <Badge variant={c.status === "active" ? "default" : "secondary"}>
                {statusLabels[c.status] ?? c.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <Link href={`/ads/campaign/${c.id}`}>
                <Button variant="outline">Ver detalles</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <ManualPagination
        currentPage={page}
        totalPages={Math.ceil(total / pageSize) || 1}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 20, 30]}
      />
    </div>
  )
}