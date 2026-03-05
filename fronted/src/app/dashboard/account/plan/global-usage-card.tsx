"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ManualPagination } from "@/components/data-table-pagination"
import { cn } from "@/lib/utils"
import {
  STATUS_LABEL,
  getStatusBadgeClass,
  formatUsageMetric,
  formatStorageUsage,
  type GlobalPlanUsage,
} from "./plan-utils"

// ── Types ──────────────────────────────────────────────────────

interface GlobalUsageCardProps {
  loading: boolean
  error: string | null
  rows: GlobalPlanUsage[]
  totalRows: number
  page: number
  totalPages: number
  pageSize: number
  search: string
  onSearchChange: (value: string) => void
  onRefresh: () => void
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  selectedOrgId: number | null
  onSelect: (row: GlobalPlanUsage) => void
}

// ── Component ──────────────────────────────────────────────────

export function GlobalOrganizationsUsageCard({
  loading,
  error,
  rows,
  totalRows,
  page,
  totalPages,
  pageSize,
  search,
  onSearchChange,
  onRefresh,
  onPageChange,
  onPageSizeChange,
  selectedOrgId,
  onSelect,
}: GlobalUsageCardProps) {
  return (
    <Card className="border-violet-100 shadow-sm w-full min-w-0 overflow-hidden dark:border-slate-700 dark:bg-slate-900">
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-2 sm:pb-4">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between w-full min-w-0">
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base text-slate-800 dark:text-slate-100">
              Supervision del consumo
            </CardTitle>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Revisa el plan y uso de cada organizacion para anticipar upgrades o incidencias.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Input
              placeholder="Buscar por organizacion o plan"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="h-8 sm:h-9 text-xs sm:text-sm sm:min-w-[240px]"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="cursor-pointer h-8 sm:h-9 text-xs sm:text-sm"
            >
              Actualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={`global-plan-skeleton-${index}`} className="h-14 sm:h-16 w-full rounded-md" />
            ))}
          </div>
        ) : error ? (
          <p className="text-xs sm:text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            No encontramos organizaciones con los criterios actuales.
          </p>
        ) : (
          <>
            {/* ── Mobile: Card layout ── */}
            <div className="sm:hidden space-y-2">
              {rows.map((row) => {
                const isSelected = selectedOrgId === row.orgId
                return (
                  <div
                    key={row.orgId}
                    className={cn(
                      "flex flex-col gap-1.5 p-3 rounded-lg border w-full min-w-0 overflow-hidden cursor-pointer transition-colors",
                      isSelected
                        ? "bg-sky-50 border-sky-300 shadow-sm dark:bg-slate-800 dark:border-sky-700"
                        : "border-slate-200 hover:bg-sky-50/60 dark:border-slate-700 dark:hover:bg-slate-800/60",
                    )}
                    onClick={() => onSelect(row)}
                  >
                    {/* Row 1: Name + Status */}
                    <div className="flex items-start justify-between gap-2 w-full min-w-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100 break-words">
                          {row.orgName}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">ID #{row.orgId}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`flex-shrink-0 text-[10px] ${getStatusBadgeClass(row.status)}`}
                      >
                        {STATUS_LABEL[row.status]}
                      </Badge>
                    </div>

                    {/* Row 2: Plan + Usage summary */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-medium">{row.planName}</span>
                      <span>{formatUsageMetric(row.users, "usr")}</span>
                      <span>{formatStorageUsage(row.storageMB)}</span>
                    </div>

                    {/* Row 3: Alert */}
                    {row.hasIssue ? (
                      <p className="text-[10px] sm:text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {row.alert}
                      </p>
                    ) : (
                      <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400">{row.alert}</p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ── Desktop: Table layout ── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-4">Organizacion</th>
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4">Usuarios</th>
                    <th className="py-2 pr-4">Facturas</th>
                    <th className="py-2 pr-4">Almacenamiento</th>
                    <th className="py-2 pr-4">Estado</th>
                    <th className="py-2 text-left">Alertas</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const isSelected = selectedOrgId === row.orgId
                    return (
                      <tr
                        key={row.orgId}
                        className={cn(
                          "cursor-pointer border-t border-slate-100 text-slate-700 transition-colors hover:bg-sky-50/60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/60",
                          isSelected &&
                            "bg-sky-100/70 ring-1 ring-sky-300/70 shadow-sm dark:bg-slate-800/80 dark:ring-sky-700/60",
                        )}
                        onClick={() => onSelect(row)}
                      >
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">{row.orgName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">ID #{row.orgId}</div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium text-slate-800 dark:text-slate-100">{row.planName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Codigo {row.planCode}</div>
                        </td>
                        <td className="py-3 pr-4 font-medium">{formatUsageMetric(row.users, "usuarios")}</td>
                        <td className="py-3 pr-4 font-medium">{formatUsageMetric(row.invoices, "facturas")}</td>
                        <td className="py-3 pr-4 font-medium">{formatStorageUsage(row.storageMB)}</td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline" className={getStatusBadgeClass(row.status)}>
                            {STATUS_LABEL[row.status]}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <span
                            className={`text-xs font-semibold ${
                              row.hasIssue
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {row.alert}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <ManualPagination
                currentPage={page}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={totalRows}
                onPageChange={onPageChange}
                onPageSizeChange={onPageSizeChange}
                pageSizeOptions={[10, 20, 50]}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
