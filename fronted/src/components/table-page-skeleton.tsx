import { Skeleton } from "@/components/ui/skeleton"

interface TablePageSkeletonProps {
  title?: boolean
  filters?: number
  columns?: number
  rows?: number
  actions?: boolean
}

const COL_WIDTHS = ["w-24", "w-32", "w-40", "w-28", "w-20", "w-36", "w-24"]

export function TablePageSkeleton({
  title = true,
  filters = 0,
  columns = 5,
  rows = 6,
  actions = true,
}: TablePageSkeletonProps) {
  return (
    <div className="space-y-4 p-4 md:p-6">
      {(title || actions) && (
        <div className="flex items-center justify-between">
          {title && <Skeleton className="h-7 w-48" />}
          {actions && <Skeleton className="h-9 w-28 rounded-md" />}
        </div>
      )}

      {filters > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {Array.from({ length: filters }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-40 rounded-md" />
          ))}
        </div>
      )}

      <div className="rounded-md border">
        <div className="flex items-center gap-4 border-b px-4 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-4 ${COL_WIDTHS[i % COL_WIDTHS.length]}`}
            />
          ))}
        </div>

        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
          >
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                className={`h-4 ${COL_WIDTHS[(colIdx + rowIdx) % COL_WIDTHS.length]}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
