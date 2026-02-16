"use client"

import { ArrowRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { VerticalCompatibilityResult } from "../tenancy.api"

type Props = {
  currentLabel: string
  targetLabel: string
  result: VerticalCompatibilityResult
}

export function VerticalStepReview({ currentLabel, targetLabel, result }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{currentLabel}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-slate-900 dark:text-slate-100">{targetLabel}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="text-xs">
          Tiempo estimado: {result.estimatedDowntime} min
        </Badge>
        {result.requiresMigration && (
          <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            Requiere migracion
          </Badge>
        )}
      </div>

      {result.dataImpact.tables.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Impacto en datos
          </p>
          <ScrollArea className="max-h-40 rounded-md border p-2">
            <div className="space-y-2 text-xs">
              {result.dataImpact.tables.map((table) => (
                <div
                  key={table.name}
                  className="flex flex-col gap-1 rounded-md bg-slate-50/80 p-2 dark:bg-slate-900/80"
                >
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="uppercase">{table.name}</span>
                    <span>{table.recordCount} registros</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {table.willBeHidden && (
                      <Badge variant="secondary" className="text-[10px]">Solo lectura</Badge>
                    )}
                    {table.willBeMigrated && (
                      <Badge variant="secondary" className="text-[10px]">Requiere migracion</Badge>
                    )}
                    {table.backupRecommended && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                        Backup recomendado
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {result.dataImpact.customFields.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Campos personalizados
          </p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
            {result.dataImpact.customFields.map((field, i) => (
              <li key={`cf-${i}`}>
                {field.entity}: {field.field}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.dataImpact.integrations.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Integraciones activas
          </p>
          <p className="text-xs text-muted-foreground">
            {result.dataImpact.integrations.join(", ")}
          </p>
        </div>
      )}

      {result.warnings.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">
            Advertencias a considerar
          </p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-amber-700 dark:text-amber-300">
            {result.warnings.map((w, i) => (
              <li key={`rw-${i}`}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
