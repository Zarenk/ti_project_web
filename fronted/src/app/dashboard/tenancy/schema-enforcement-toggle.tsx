"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { setCompanyProductSchemaEnforced } from "./tenancy.api"

type Props = {
  companyId: number
  initialEnforced: boolean
  canToggle?: boolean
}

export function SchemaEnforcementToggle({
  companyId,
  initialEnforced,
  canToggle = true,
}: Props) {
  const [enforced, setEnforced] = useState(initialEnforced)
  const [isPending, startTransition] = useTransition()

  const handleToggle = (nextValue: boolean) => {
    if (!canToggle) return
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
    <div className="flex flex-col gap-2 rounded-md bg-white p-3 text-slate-600 dark:bg-slate-950">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-600 dark:text-slate-200">
            Validacion estricta del esquema
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
          className="w-full cursor-pointer text-xs"
          disabled={isPending}
          onClick={() => handleToggle(true)}
        >
          Activar validacion estricta
        </Button>
      )}
    </div>
  )
}
