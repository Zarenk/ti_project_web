"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Pencil,
  Eye,
  Trash2,
  Loader2,
  Tags,
  Calendar,
  ImageIcon,
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
import { deleteCategory } from "./categories.api"
import type { Categories } from "./columns"

type CategoriesGalleryProps = {
  data: Categories[]
}

export function CategoriesGallery({ data }: CategoriesGalleryProps) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Categories | null>(null)
  const [viewTarget, setViewTarget] = useState<Categories | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    setLoadingId(deleteTarget.id)
    try {
      await deleteCategory(deleteTarget.id)
      toast.success("Categoría eliminada correctamente.")
      router.refresh()
      location.reload()
    } catch (error: any) {
      toast.error(error?.message || "No se pudo eliminar la categoría.")
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

  const getImageUrl = (image: string) => {
    if (!image) return null
    if (image.startsWith("http")) return image
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000"
    return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`
  }

  return (
    <>
      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Tags className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No hay categorías para mostrar.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((category) => {
            const active = isActive(category.status)
            const createdDate = category.createdAt
              ? new Date(category.createdAt).toLocaleDateString("es-PE", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : null
            const imageUrl = getImageUrl(category.image)

            return (
              <div
                key={category.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/20"
              >
                {/* Image or fallback */}
                {imageUrl ? (
                  <div className="relative h-32 w-full overflow-hidden bg-muted">
                    <img
                      src={imageUrl}
                      alt={category.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="flex h-24 w-full items-center justify-center bg-muted/50">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}

                {/* Header: avatar + name + status */}
                <div className="flex items-start gap-3 p-4 pb-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                    {getInitials(category.name || "?")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold leading-tight">
                      {category.name}
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
                        {category.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {category.description && (
                  <p className="line-clamp-2 px-4 py-1 text-xs text-muted-foreground/80">
                    {category.description}
                  </p>
                )}

                {/* Date */}
                <div className="mt-auto space-y-0.5 border-t px-4 py-2.5">
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
                    <Link href={`/dashboard/categories/${category.id}/edit`}>
                      <Pencil className="h-3 w-3" />
                      Editar
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 text-[11px]"
                    onClick={() => setViewTarget(category)}
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
                      onClick={() => setDeleteTarget(category)}
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
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
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
            <AlertDialogTitle>Detalles de la Categoría</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription />
          {viewTarget && (
            <div className="space-y-2 text-sm">
              <div><strong>Nombre:</strong> {viewTarget.name}</div>
              <div><strong>Descripción:</strong> {viewTarget.description}</div>
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
