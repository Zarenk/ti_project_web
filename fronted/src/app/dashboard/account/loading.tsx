import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function AccountLoading() {
  return (
    <div className="min-h-[100svh] w-full bg-gradient-to-b from-sky-50 via-cyan-50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <header className="w-full border-b bg-gradient-to-r from-white via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 supports-[backdrop-filter]:backdrop-blur-sm dark:border-slate-700">
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Skeleton className="size-14 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-12 md:gap-8 md:py-10">
        <section className="md:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-56" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-64" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-40 rounded-full" />
                <Skeleton className="h-9 w-28 rounded-full" />
              </div>
            </CardContent>
          </Card>
        </section>
        <section className="md:col-span-4 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}

