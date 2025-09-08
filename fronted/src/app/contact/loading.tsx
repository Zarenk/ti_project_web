import Navbar from "@/components/navbar"
import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingContact() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950">
      <Navbar />
      <div className="relative overflow-hidden py-16 px-4" data-navcolor="#3b82f6">
        <div className="relative max-w-7xl mx-auto text-center">
          <Skeleton className="h-12 w-64 mx-auto mb-4" />
          <Skeleton className="h-5 w-96 mx-auto" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="rounded-xl border bg-card p-8 space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-80" />
              <div className="grid md:grid-cols-2 gap-6 mt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-32 w-full" />
              </div>
              <div className="flex gap-4">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-6 space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

