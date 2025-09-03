import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function NewEntryLoading() {
  return (
    <div className="flex justify-center items-start min-h-screen p-3">
      <Card className="w-full max-w-lg sm:max-w-xl md:max-w-lg lg:max-w-4xl xl:max-w-6xl">
        <CardHeader className="pb-2 sm:pb-2">
          <CardTitle className="text-center text-xl font-bold pt-5">
            <Skeleton className="h-6 w-64 mx-auto" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload + currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          {/* Provider + Store selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          {/* Product selection */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          {/* Selected products table */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-40 w-full" />
          </div>
          {/* Action buttons */}
          <div className="flex gap-3 justify-end">
            <Skeleton className="h-10 w-28 rounded" />
            <Skeleton className="h-10 w-40 rounded" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

