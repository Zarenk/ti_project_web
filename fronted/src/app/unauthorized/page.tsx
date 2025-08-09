import UnauthorizedKnight from "./UnauthorizedKnight.client"

export default function UnauthorizedPage() {
  return (
    <div className="relative min-h-[60vh] flex flex-col items-center justify-start pt-8">
      {/* Caballero arriba */}
      <div className="absolute top-0 left-0 w-full flex justify-center z-1 pointer-events-none">
        <UnauthorizedKnight />
      </div>

      {/* Texto más abajo */}
      <div className="text-center space-y-2 z-0 mt-40 select-none">
        <h1 className="text-3xl font-bold">Acceso no autorizado</h1>
        <p className="opacity-80">No tienes permisos para ver esta sección.</p>
      </div>
    </div>
  )
}