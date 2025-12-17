import type { SubscriptionSummary } from "@/types/subscription"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SubscriptionUsageCardProps {
  summary: SubscriptionSummary
  className?: string
}

const METRIC_ORDER: Array<keyof SubscriptionSummary["usage"]> = ["users", "invoices", "storageMB"]

function formatValue(value?: number | null) {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(value)
}

function formatStorage(value?: number | null) {
  if (value === null || value === undefined) return "—"
  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} GB`
  }
  return `${value} MB`
}

const LABELS: Record<string, { title: string; helper: string; formatter?: (value?: number | null) => string }> = {
  users: { title: "Usuarios habilitados", helper: "Incluye administradores e invitados." },
  invoices: { title: "Comprobantes emitidos", helper: "Facturas, boletas y notas registradas en el periodo." },
  storageMB: {
    title: "Almacenamiento utilizado",
    helper: "Archivos adjuntos y comprobantes digitales.",
    formatter: formatStorage,
  },
}

export function SubscriptionUsageCard({ summary, className }: SubscriptionUsageCardProps) {
  const usage = summary.usage ?? {}
  const quotas = summary.quotas ?? {}

  return (
    <Card className={cn("border-dashed", className)}>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Consumo del plan</CardTitle>
        <p className="text-sm text-muted-foreground">
          Supervisa tus lÌmites actuales y anticipa upgrades antes de alcanzarlos.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {METRIC_ORDER.map((metric) => {
          const current = usage[metric as keyof typeof usage]
          const limit = quotas[metric as keyof typeof quotas]
          const formatter = LABELS[metric]?.formatter ?? formatValue
          const percent =
            limit && limit > 0
              ? Math.min(100, Math.round(((current ?? 0) / limit) * 100))
              : current
              ? undefined
              : 0

          return (
            <div key={metric} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm font-medium">
                <span>{LABELS[metric]?.title ?? metric}</span>
                <span className="text-slate-900 dark:text-slate-100">
                  {formatter(current)}{" "}
                  {limit ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      de {formatter(limit)}
                    </span>
                  ) : (
                    <span className="text-xs font-normal text-muted-foreground">sin lÌmite</span>
                  )}
                </span>
              </div>
              {typeof percent === "number" ? (
                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      percent > 90
                        ? "bg-rose-500"
                        : percent > 70
                          ? "bg-amber-500"
                          : "bg-sky-500",
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {formatter(current)} consumido - sin lÌmite definido
                </div>
              )}
              <p className="text-xs text-muted-foreground">{LABELS[metric]?.helper}</p>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
