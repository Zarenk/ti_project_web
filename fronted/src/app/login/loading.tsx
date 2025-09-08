import { Skeleton } from "@/components/ui/skeleton"

export default function LoadingLogin() {
  return (
    <div className="flex items-center justify-center min-h-screen p-3">
      <div className="w-full max-w-md rounded-xl border bg-card">
        <div className="p-6 border-b">
          <div className="space-y-2 text-center">
            <Skeleton className="h-7 w-40 mx-auto" />
            <Skeleton className="h-4 w-56 mx-auto" />
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="relative my-4">
            <Skeleton className="h-4 w-40 mx-auto" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="p-6 border-t space-y-2 text-center">
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    </div>
  )
}

