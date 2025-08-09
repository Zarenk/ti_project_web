"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface SummaryCardsProps {
  ingresos: number
  egresos: number
  total: number
  loading?: boolean
}

export default function SummaryCards({ ingresos, egresos, total, loading }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Saldo total</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold">
          {loading ? <Skeleton className="h-7 w-24" /> : total.toFixed(2)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ingresos</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold text-emerald-600">
          {loading ? <Skeleton className="h-7 w-24" /> : ingresos.toFixed(2)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Egresos</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold text-rose-600">
          {loading ? <Skeleton className="h-7 w-24" /> : egresos.toFixed(2)}
        </CardContent>
      </Card>
    </div>
  )
}