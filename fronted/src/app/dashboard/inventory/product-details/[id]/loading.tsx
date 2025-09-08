import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingProductDetails() {
  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-40" />
      </div>

      <div className="space-y-4">
        <div className="mb-4 space-y-2">
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-1 w-[375px] sm:w-[580px]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-56" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-md p-4 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-64" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-md p-4 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

