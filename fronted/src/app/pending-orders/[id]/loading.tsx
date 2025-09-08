import Navbar from "@/components/navbar"
import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingPendingOrder() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-900 dark:to-slate-950">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Skeleton className="h-9 w-40 mb-3" />
          <div className="flex items-end gap-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-4 w-full max-w-xl mt-3" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Information */}
            <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-6">
              <Skeleton className="h-6 w-56 mb-4" />
              <div className="grid md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
            </div>

            {/* Customer Details */}
            <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2 mb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-48" />
                </div>
              ))}
            </div>

            {/* Billing Details */}
            <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-6">
              <Skeleton className="h-6 w-52 mb-4" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2 mb-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-56" />
                </div>
              ))}
            </div>

            {/* Shipping Details */}
            <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-5 w-48" />
                  </div>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <Skeleton className="h-16 w-16 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-52" />
                    <div className="flex items-center gap-6">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-4 flex justify-end">
                <Skeleton className="h-9 w-40" />
              </div>
            </div>

            {/* Proof Upload */}
            <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-24 w-full" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border bg-card/80 backdrop-blur-sm p-6 sticky top-8">
              <Skeleton className="h-6 w-48 mb-4" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
              <div className="py-4">
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

