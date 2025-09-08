import Navbar from "@/components/navbar"
import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingUsers() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Skeleton className="h-8 w-64 mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-6">
              <Skeleton className="h-6 w-40 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>

            <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-6">
              <Skeleton className="h-6 w-56 mb-4" />
              <div className="w-full overflow-x-auto">
                <div className="grid grid-cols-5 gap-3 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                  ))}
                </div>
                {Array.from({ length: 5 }).map((_, r) => (
                  <div key={r} className="grid grid-cols-5 gap-3 py-2">
                    {Array.from({ length: 5 }).map((_, c) => (
                      <Skeleton key={c} className="h-5 w-full" />
                    ))}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Skeleton className="h-8 w-40" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-6">
              <Skeleton className="h-6 w-52 mb-6" />
              <div className="flex flex-col items-center space-y-4">
                <Skeleton className="h-32 w-32 rounded-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>

            <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-6 space-y-4">
              <Skeleton className="h-6 w-40" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>

            <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              {Array.from({ length: 3 }).map((_, r) => (
                <div key={r} className="grid grid-cols-3 gap-3 py-2">
                  {Array.from({ length: 3 }).map((_, c) => (
                    <Skeleton key={c} className="h-5 w-full" />
                  ))}
                </div>
              ))}
              <div className="pt-4">
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

