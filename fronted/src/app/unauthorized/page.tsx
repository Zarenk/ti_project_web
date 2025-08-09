import UnauthorizedKnight from "./UnauthorizedKnight.client"

export default function UnauthorizedPage() {
  return (
    <div className="relative min-h-[60vh] flex flex-col items-center justify-start pt-8">
      <div className="relative w-full h-64 md:h-72 lg:h-80 z-20 overflow-visible">
        <UnauthorizedKnight />
      </div>
      <div className="text-center space-y-2 z-0 mt-6 select-none">
        <h1 className="text-3xl font-bold">Acceso no autorizado</h1>
        <p className="opacity-80">No tienes permisos para ver esta sección.</p>
      </div>
    </div>
  )
}