"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function ProductLoadingSkeleton() {
  return (
    <>
      <div className="mb-6">
        <Skeleton className="h-5 w-40 mb-2" />
        <Skeleton className="h-4 w-60" />
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        <div className="space-y-4">
          <div className="relative">
            <Skeleton className="aspect-square w-full rounded-2xl" />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-20 rounded-lg flex-shrink-0" />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-8 w-3/4 mb-3" />
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-5 w-40" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card p-6 rounded-xl shadow-sm border space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-7 w-48" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>

          <div className="bg-card p-6 rounded-xl shadow-sm border space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-10" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-9 w-10" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16">
        <Skeleton className="h-7 w-64 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card">
              <Skeleton className="h-48 w-full rounded-t-xl" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-6 w-28" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
