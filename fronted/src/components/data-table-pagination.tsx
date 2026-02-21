"use client"

import { useMemo } from "react"
import { Table } from "@tanstack/react-table"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ── Page pill calculation ────────────────────────────────
function getPageRange(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const pages: (number | "ellipsis")[] = [1]

  if (current <= 3) {
    // Near start: 1 2 3 4 5 ... last
    pages.push(2, 3, 4, 5, "ellipsis", total)
  } else if (current >= total - 2) {
    // Near end: 1 ... n-4 n-3 n-2 n-1 last
    pages.push("ellipsis", total - 4, total - 3, total - 2, total - 1, total)
  } else {
    // Middle: 1 ... prev curr next ... last
    pages.push("ellipsis", current - 1, current, current + 1, "ellipsis", total)
  }

  return pages
}

// ── Shared pagination UI ─────────────────────────────────
function PaginationCore({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  canPrevious,
  canNext,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 30, 50],
}: {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems?: number
  canPrevious: boolean
  canNext: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: number[]
}) {
  const pages = useMemo(
    () => getPageRange(currentPage, totalPages),
    [currentPage, totalPages],
  )

  if (totalPages <= 0) return null

  return (
    <div className="flex flex-col gap-3 px-2 sm:px-4">
      {/* ── Row 1: selector + navigation ─────────────── */}
      <div className="flex items-center justify-between gap-2">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onPageSizeChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-[68px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top" align="start">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            por página
          </span>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          {/* First */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 sm:inline-flex"
            onClick={() => onPageChange(1)}
            disabled={!canPrevious}
            aria-label="Primera página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Previous */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canPrevious}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* ── Page pills (desktop) ────────────────── */}
          <div className="hidden items-center gap-0.5 sm:flex">
            {pages.map((page, idx) =>
              page === "ellipsis" ? (
                <span
                  key={`e-${idx}`}
                  className="flex h-8 w-6 items-center justify-center text-xs text-muted-foreground select-none"
                >
                  ···
                </span>
              ) : (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "ghost"}
                  size="icon"
                  className={cn(
                    "h-8 w-8 text-xs font-medium transition-colors duration-150",
                    page === currentPage &&
                      "pointer-events-none shadow-sm",
                  )}
                  onClick={() => onPageChange(page)}
                  aria-label={`Página ${page}`}
                  aria-current={page === currentPage ? "page" : undefined}
                >
                  {page}
                </Button>
              ),
            )}
          </div>

          {/* ── Compact indicator (mobile) ──────────── */}
          <span className="flex h-8 min-w-[52px] items-center justify-center rounded-md border border-border/50 px-2 text-xs font-medium tabular-nums sm:hidden">
            {currentPage}/{totalPages}
          </span>

          {/* Next */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canNext}
            aria-label="Siguiente página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Last */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 sm:inline-flex"
            onClick={() => onPageChange(totalPages)}
            disabled={!canNext}
            aria-label="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Row 2: info text ─────────────────────────── */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
        <span>
          Página {currentPage} de {totalPages}
        </span>
        {totalItems != null && (
          <span>{totalItems.toLocaleString("es-PE")} elementos</span>
        )}
      </div>
    </div>
  )
}

// ── TanStack Table mode ──────────────────────────────────
interface DataTablePaginationProps<TData> {
  table: Table<TData>
  totalItems?: number
  pageSizeOptions?: number[]
}

export function DataTablePagination<TData>({
  table,
  totalItems,
  pageSizeOptions,
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = table.getPageCount()
  const resolvedTotal =
    totalItems ?? table.getFilteredRowModel().rows.length

  return (
    <PaginationCore
      currentPage={pageIndex + 1}
      totalPages={pageCount}
      pageSize={pageSize}
      totalItems={resolvedTotal}
      canPrevious={table.getCanPreviousPage()}
      canNext={table.getCanNextPage()}
      onPageChange={(page) => table.setPageIndex(page - 1)}
      onPageSizeChange={(size) => table.setPageSize(size)}
      pageSizeOptions={pageSizeOptions}
    />
  )
}

// ── Manual / server-side mode ────────────────────────────
interface ManualPaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems?: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  pageSizeOptions?: number[]
}

export function ManualPagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
}: ManualPaginationProps) {
  return (
    <PaginationCore
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={pageSize}
      totalItems={totalItems}
      canPrevious={currentPage > 1}
      canNext={currentPage < totalPages}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      pageSizeOptions={pageSizeOptions}
    />
  )
}
