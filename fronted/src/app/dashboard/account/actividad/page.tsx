import RequireAdmin from "@/components/require-admin"
import Actividad from "../Actividad"

export default function AccountActividadPage() {
  return (
    <RequireAdmin>
      <div className="mx-auto max-w-6xl p-4">
        <Actividad />
      </div>
    </RequireAdmin>
  )
}