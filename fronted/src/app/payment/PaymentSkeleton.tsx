"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function PaymentSkeleton() {
  return (
    <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-blue-200 dark:border-blue-700 shadow-sm p-0">
          <CardHeader className="rounded-t-lg p-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-80" />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="grid md:grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-blue-200 dark:border-blue-700 shadow-sm p-0">
          <CardHeader className="rounded-t-lg p-4">
            <Skeleton className="h-6 w-64" />
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-1">
        <Card className="border-blue-200 dark:border-blue-700 shadow-lg sticky top-8 p-0">
          <CardHeader className="rounded-t-lg p-4">
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
            <div className="pt-4">
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
