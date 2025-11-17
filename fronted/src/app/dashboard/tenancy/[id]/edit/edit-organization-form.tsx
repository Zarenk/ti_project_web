"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Building2, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TENANT_ORGANIZATIONS_EVENT } from "@/utils/tenant-preferences"

import type { OrganizationResponse } from "../../tenancy.api"
import { updateOrganization } from "../../tenancy.api"

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Activa" },
  { value: "INACTIVE", label: "Inactiva" },
]

function normalizeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

interface EditOrganizationFormProps {
  organization: OrganizationResponse
  canEdit: boolean
}

export function EditOrganizationForm({ organization, canEdit }: EditOrganizationFormProps) {
  const router = useRouter()
  const [name, setName] = useState(organization.name ?? "")
  const [code, setCode] = useState(organization.code ?? "")
  const [slug, setSlug] = useState(organization.slug ?? "")
  const [status, setStatus] = useState(organization.status ?? STATUS_OPTIONS[0]?.value ?? "ACTIVE")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const disabled = !canEdit || saving
  const friendlySlug = useMemo(() => normalizeSlug(slug || name), [slug, name])

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (disabled) return

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("El nombre es obligatorio")
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: trimmedName,
        code: code.trim() || null,
        slug: friendlySlug || null,
        status,
      }

      const updated = await updateOrganization(organization.id, payload)

      toast.success("Organizacion actualizada")

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(TENANT_ORGANIZATIONS_EVENT))
      }

      router.push(`/dashboard/tenancy/${updated.id}`)
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar la organizacion"
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
      <form onSubmit={handleSubmit} className="space-y-6">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge className="rounded-full bg-sky-100 text-sky-700 dark:bg-slate-800 dark:text-slate-200">
              Edicion
            </Badge>
            <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              ID #{organization.id}
            </span>
          </div>
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl text-slate-900 dark:text-slate-50">
              <Building2 className="size-5 text-sky-600 dark:text-slate-100" />
              {organization.name}
            </CardTitle>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Ajusta el nombre comercial, codigo interno o estado de la organizacion. Los cambios se
              aplican de inmediato y se propagan al selector de organizaciones.
            </p>
          </div>
        </CardHeader>

        <CardContent className="grid gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={disabled}
              placeholder="Ej. ECOTERRA"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Codigo</Label>
              <Input
                id="code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                disabled={disabled}
                placeholder="Se genera si lo dejas vacio"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cuando se deja vacio, el backend genera uno en base al nombre.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                disabled={disabled}
                placeholder="Identificador legible para URL"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mostrara como <code>{friendlySlug || "slug"}</code> en rutas publicas.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={status}
              onValueChange={setStatus}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 border-t border-slate-100 pt-6 dark:border-slate-800 md:flex-row md:items-center md:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-300"
            asChild
          >
            <Link href={`/dashboard/tenancy/${organization.id}`}>
              <ArrowLeft className="size-4" />
              Volver al detalle
            </Link>
          </Button>

          <div className="flex flex-1 justify-end gap-3">
            <Button
              type="submit"
              disabled={disabled}
              className="min-w-[180px] gap-2 bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Guardando
                </>
              ) : (
                "Guardar cambios"
              )}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}

