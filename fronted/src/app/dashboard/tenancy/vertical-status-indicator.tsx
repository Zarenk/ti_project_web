'use client'

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

import { OrganizationVerticalInfo, setCompanyProductSchemaEnforced } from "./tenancy.api"

type Props = {
  organizationId: number
  companyId: number
  info: Pick<
    OrganizationVerticalInfo,
    "businessVertical" | "config" | "migration" | "productSchemaEnforced"
  >
  canToggle?: boolean
}

export function VerticalStatusIndicator({
  organizationId,
  companyId,
  info,
  canToggle = true,
}: Props) {
  const [enforced, setEnforced] = useState(info.productSchemaEnforced)
  const [isPending, startTransition] = useTransition()

  const migration = info.migration ?? {
    total: 0,
    migrated: 0,
    legacy: 0,
    percentage: 0,
  }

  const handleToggle = (nextValue: boolean) => {
    if (!canToggle) {
      return
    }
    startTransition(async () => {
      try {
        await setCompanyProductSchemaEnforced(companyId, nextValue)
        setEnforced(nextValue)
        toast.success(
          nextValue
            ? "Validacion estricta activada para la empresa."
            : "Validacion estricta desactivada.",
        )
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la validacion estricta."
        toast.error(message)
      }
    })
  }

  return (
    <div className="space-y-3 rounded-lg bg-slate-50/60 p-3 text-xs dark:bg-slate-900/40">
      <div className="flex items-center justify-between text-muted-foreground">
        <div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-200">
            Avance de migracion
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {migration.migrated} migrados · {migration.legacy} pendientes
          </p>
        </div>
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {migration.percentage}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-2 rounded-full bg-emerald-500 transition-all"
          style={{ width: `${Math.min(Math.max(migration.percentage, 0), 100)}%` }}
        />
      </div>
      <div className="flex flex-col gap-2 rounded-md bg-white p-2 text-slate-600 dark:bg-slate-950">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-200">
              Validacion estricta
            </p>
            <p className="text-[11px] text-muted-foreground">
              Obliga a que todos los productos usen el esquema del vertical.
            </p>
          </div>
          <Switch
            checked={enforced}
            disabled={isPending || !canToggle}
            onCheckedChange={(checked) => handleToggle(Boolean(checked))}
          />
        </div>
        {!enforced && canToggle && (
          <Button
            size="sm"
            variant="outline"
            className="w-full cursor-pointer text-xs font-semibold text-slate-600 transition-colors hover:-translate-y-[1px] hover:text-slate-900 dark:text-slate-100 dark:hover:text-white"
            disabled={isPending}
            onClick={() => handleToggle(true)}
          >
            Activar validacion estricta
          </Button>
        )}
      </div>
    </div>
  )
}
