import Navbar from "@/components/navbar"
import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingCart() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Skeleton className="h-2 w-24 rounded" />
            <Skeleton className="h-2 w-24 rounded" />
            <Skeleton className="h-2 w-24 rounded" />
          </div>
          <Skeleton className="h-8 w-80 mx-auto" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl shadow-sm p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Skeleton className="w-24 h-24 rounded-xl" />
                  <div className="flex-grow space-y-3">
                    <div className="flex justify-between items-start">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-6 w-12" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </div>
                      <div className="text-right">
                        <Skeleton className="h-4 w-20 ml-auto" />
                        <Skeleton className="h-6 w-24 ml-auto" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-card rounded-2xl shadow-sm p-6">
              <Skeleton className="h-5 w-56 mb-4" />
              <div className="flex flex-col sm:flex-row gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>

            <div className="bg-card rounded-2xl shadow-sm p-6">
              <Skeleton className="h-5 w-56 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-32 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-card rounded-2xl shadow-sm p-6 sticky top-8">
              <Skeleton className="h-6 w-48 mb-6" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="mt-6 text-center">
                <Skeleton className="h-4 w-64 mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

