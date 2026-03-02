"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { InvestmentRecommendation } from "../../sales.api"
import { Sparkles, TrendingUp, RotateCw, Package } from "lucide-react"

interface InvestmentRecommendationsProps {
  recommendations: InvestmentRecommendation[]
}

export function InvestmentRecommendations({ recommendations }: InvestmentRecommendationsProps) {
  const getPriorityColor = (priority: 'ALTA' | 'MEDIA' | 'BAJA') => {
    switch (priority) {
      case 'ALTA': return 'bg-green-500 text-white'
      case 'MEDIA': return 'bg-amber-500 text-white'
      case 'BAJA': return 'bg-gray-500 text-white'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600'
    if (score >= 40) return 'text-amber-600'
    return 'text-gray-600'
  }

  return (
    <Card className="border shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Recomendaciones de Inversión
            </CardTitle>
            <CardDescription>Productos con mejor margen y rotación</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay suficientes datos para generar recomendaciones
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec.productId}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{rec.name}</p>
                      {rec.sku && (
                        <Badge variant="outline" className="text-xs">
                          {rec.sku}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{rec.reason}</p>
                  </div>
                  <Badge className={getPriorityColor(rec.priority)}>
                    {rec.priority}
                  </Badge>
                </div>

                {/* Score */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Score de Inversión</span>
                    <span className={`font-bold ${getScoreColor(rec.score)}`}>
                      {rec.score.toFixed(0)}/100
                    </span>
                  </div>
                  <Progress value={rec.score} className="h-2" />
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-muted-foreground text-xs">Margen</p>
                      <p className="font-semibold">{rec.profitMargin.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RotateCw className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-muted-foreground text-xs">Rotación</p>
                      <p className="font-semibold">{rec.rotationSpeed.toFixed(1)}/día</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600" />
                    <div>
                      <p className="text-muted-foreground text-xs">Stock</p>
                      <p className="font-semibold">{rec.stockLevel}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
