"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import SimplePagination from "@/components/simple-pagination"
import { Campaign, fetchCampaigns } from "./ads.api"
import { useRBAC } from "../hooks/use-rbac"
import { trackEvent } from "@/lib/analytics"


export default function AdsDashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canCreate = useRBAC(["admin", "marketing"])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchCampaigns(page, pageSize)
      .then(({ items, total }) => {
        setCampaigns(items)
        setTotal(total)
      })
      .catch(() => setError("Failed to load campaigns"))
      .finally(() => setLoading(false))
  }, [page, pageSize])

  const handleCreate = () => {
    trackEvent("ads.create_campaign.clicked")
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Ads Dashboard</h1>
        {canCreate && <Button onClick={handleCreate}>Create Campaign</Button>}
      </div>

      {loading && (
        <Card>
          <CardContent>Loading...</CardContent>
        </Card>
      )}
      {error && (
        <Card>
          <CardContent className="text-red-500">{error}</CardContent>
        </Card>
      )}
      {!loading && !error && campaigns.length === 0 && (
        <Card>
          <CardContent>No campaigns found.</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {campaigns.map((c) => (
          <Card key={c.id} className="hover:shadow">
            <CardHeader>
              <CardTitle>{c.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/ads/campaign/${c.id}`}>
                <Button variant="outline">View</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <SimplePagination
        page={page}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}