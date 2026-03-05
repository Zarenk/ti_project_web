"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function PlanSkeleton() {
  return (
    <div className="min-h-[100svh] w-full bg-gradient-to-b from-sky-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <header className="w-full border-b bg-gradient-to-r from-white via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:border-slate-700">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6 md:py-8">
          <Skeleton className="h-6 sm:h-8 w-48 sm:w-72" />
          <Skeleton className="mt-2 h-4 w-64 sm:w-96" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-4 sm:space-y-6 px-4 py-4 sm:py-8">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <Skeleton className="h-40 sm:h-48 w-full rounded-xl" />
          <Skeleton className="h-40 sm:h-48 w-full rounded-xl" />
        </div>
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <Skeleton className="h-56 sm:h-72 w-full rounded-xl" />
          <Skeleton className="h-56 sm:h-72 w-full rounded-xl" />
        </div>
      </main>
    </div>
  )
}
