import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function SalesNewLoading() {
  return (
    <div className="flex justify-center items-start min-h-screen p-3">
      <Card className="w-full max-w-lg sm:max-w-xl md:max-w-lg lg:max-w-4xl xl:max-w-6xl">
        <CardHeader className="pb-2 sm:pb-2">
          <div className="flex justify-center pt-5">
            <Skeleton className="h-6 w-56" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-9 w-full" />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-36 rounded-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

