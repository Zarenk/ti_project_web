"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Pencil,
  Eye,
  Trash2,
  Loader2,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  FileText,
  Calendar,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DeleteActionsGuard } from "@/components/delete-actions-guard"
import { deleteProvider } from "./providers.api"
import type { Providers } from "./columns"

type ProvidersGalleryProps = {
  data: Providers[]
}

export function ProvidersGallery({ data }: ProvidersGalleryProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Providers | null>(null)
  const [viewTarget, setViewTarget] = useState<Providers | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setLoadingId(deleteTarget.id)
    try {
      await deleteProvider(deleteTarget.id)
      toast.success("Proveedor eliminado correctamente.")
      router.refresh()
    } catch (error: any) {
      toast.error(error?.message || "No se pudo eliminar el proveedor.")
    } finally {
      setLoadingId(null)
      setDeleteTarget(null)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
  }

  const isActive = (status: string) =>
    status?.toLowerCase() === "activo" || status?.toLowerCase() === "active"

  return (
    <>
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Building2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No hay proveedores para mostrar.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((provider) => {
            const active = isActive(provider.status)
            const createdDate = provider.createdAt
              ? new Date(provider.createdAt).toLocaleDateString("es-PE", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : null

            return (
              <div
                key={provider.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20"
              >
                {/* Header: avatar + name + status */}
                <div className="flex items-start gap-3 p-4 pb-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {getInitials(provider.name || "?")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold leading-tight">
                      {provider.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-1.5">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] ${
                          active
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                        }`}
                      >
                        {provider.status}
                      </Badge>
                      {provider.document && (
                        <span className="truncate text-[10px] text-muted-foreground">
                          {provider.document}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Document number */}
                {provider.documentNumber && (
                  <div className="flex items-center gap-2 px-4 py-1">
                    <FileText className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                    <span className="truncate text-xs text-muted-foreground">
                      {provider.documentNumber}
                    </span>
                  </div>
                )}

                {/* Description */}
                {provider.description && (
                  <p className="line-clamp-2 px-4 py-1 text-xs text-muted-foreground/80">
                    {provider.description}
                  </p>
                )}

                {/* Contact details */}
                <div className="mt-auto space-y-0.5 border-t px-4 py-2.5">
                  {provider.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                      <span className="truncate text-xs">{provider.phone}</span>
                    </div>
                  )}
                  {provider.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                      <span className="truncate text-xs">{provider.email}</span>
                    </div>
                  )}
                  {provider.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                      <span className="truncate text-xs">{provider.website}</span>
                    </div>
                  )}
                  {provider.adress && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                      <span className="truncate text-xs">{provider.adress}</span>
                    </div>
                  )}
                  {createdDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                      <span className="text-[10px] text-muted-foreground">{createdDate}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 border-t px-4 py-2">
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-[11px]"
                  >
                    <Link href={`/dashboard/providers/${provider.id}/edit`}>
                      <Pencil className="h-3 w-3" />
                      Editar
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => setViewTarget(provider)}
                  >
                    <Eye className="h-3 w-3" />
                    Ver
                  </Button>
                  <div className="flex-1" />
                  <DeleteActionsGuard>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                      onClick={() => setDeleteTarget(provider)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </DeleteActionsGuard>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará <span className="font-semibold">{deleteTarget?.name}</span>.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <DeleteActionsGuard>
              <AlertDialogAction
                className="bg-red-500 text-white hover:bg-red-600"
                onClick={handleDelete}
              >
                {loadingId === deleteTarget?.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Eliminar"
                )}
              </AlertDialogAction>
            </DeleteActionsGuard>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View detail dialog */}
      <AlertDialog open={!!viewTarget} onOpenChange={(open) => !open && setViewTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Detalles del Proveedor</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription />
          {viewTarget && (
            <div className="space-y-2 text-sm">
              <div><strong>Nombre:</strong> {viewTarget.name}</div>
              <div><strong>Tipo de Documento:</strong> {viewTarget.document}</div>
              <div><strong>N° de Documento:</strong> {viewTarget.documentNumber}</div>
              <div><strong>Descripción:</strong> {viewTarget.description}</div>
              <div><strong>Teléfono:</strong> {viewTarget.phone}</div>
              <div><strong>Dirección:</strong> {viewTarget.adress}</div>
              <div><strong>Email:</strong> {viewTarget.email}</div>
              <div><strong>Página Web:</strong> {viewTarget.website}</div>
              <div><strong>Estado:</strong> {viewTarget.status}</div>
              <div><strong>Fecha de Creación:</strong> {new Date(viewTarget.createdAt).toLocaleDateString()}</div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
