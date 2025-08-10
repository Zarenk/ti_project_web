import { Loader2 } from "lucide-react"

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center py-8 text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      <span>Cargando tu panel…</span>
    </div>
  )
}