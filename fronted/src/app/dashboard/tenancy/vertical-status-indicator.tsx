'use client'

import type { CompanyVerticalMigrationStats } from "./tenancy.api"

type Props = {
  info: {
    migration: CompanyVerticalMigrationStats | null
  }
}

export function VerticalStatusIndicator({ info }: Props) {
  const migration = info.migration ?? {
    total: 0,
    migrated: 0,
    legacy: 0,
    percentage: 0,
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
    </div>
  )
}
