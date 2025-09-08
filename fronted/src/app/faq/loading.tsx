import { Skeleton } from "@/components/ui/skeleton"
import Navbar from "@/components/navbar"

export default function LoadingFAQ() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-celeste-50 to-white dark:from-slate-900 dark:to-slate-950">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-4xl" data-navcolor="#ffffff">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <Skeleton className="h-16 w-16 rounded-full" />
          </div>
          <Skeleton className="h-10 w-64 mx-auto mb-4" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>
        <div className="space-y-4 mb-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-card p-6">
              <Skeleton className="h-6 w-3/4 mb-3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ))}
        </div>
        <div className="text-center">
          <Skeleton className="h-8 w-64 mx-auto mb-2" />
          <div className="flex gap-4 justify-center">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </div>
    </div>
  )
}

