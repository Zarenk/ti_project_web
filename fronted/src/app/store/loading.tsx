import Navbar from "@/components/navbar"
import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingStore() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-gray-950 dark:to-black">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1 space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <Skeleton className="h-5 w-32 mb-4" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </aside>
          <main className="lg:col-span-3">
            <div className="bg-card rounded-lg border p-4 mb-6">
              <Skeleton className="h-5 w-48" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-lg border bg-card overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-6 w-28" />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

