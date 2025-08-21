"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { uploadReferenceImage } from "../ads.api"
import { useRBAC } from "@/app/hooks/use-rbac"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
]

export default function ReferenceImageUpload() {
  const canUpload = useRBAC(["admin", "marketing"])
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [url, setUrl] = useState<string | null>(null)

  if (!canUpload) return null

  const handleFile = (f?: File) => {
    if (!f) return
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Tipo de archivo no soportado")
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("Archivo demasiado grande")
      return
    }
    setError(null)
    setFile(f)
    upload(f)
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files?.[0])
  }

  const upload = async (f: File) => {
    setUploading(true)
    setError(null)
    try {
      const res = await uploadReferenceImage(f)
      setUrl(res.url)
    } catch {
      setError("La carga falló")
    } finally {
      setUploading(false)
    }
  }

  const retry = () => {
    if (file) upload(file)
  }

  return (
    <Card className="p-4">
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex flex-col items-center justify-center border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:border-primary transition-colors bg-muted/20 dark:bg-muted/40"
      >
        <input
          id="ref-upload"
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={(e) => handleFile(e.target.files?.[0])}
          className="hidden"
        />
        <label htmlFor="ref-upload" className="cursor-pointer">
          Arrastra y suelta una imagen o haz clic para subir
        </label>
        <p className="text-xs text-muted-foreground mt-2">
          Formatos permitidos: PNG, JPEG, GIF y WEBP. Tamaño máximo: 5 MB.
        </p>
      </div>
      <CardContent className="mt-4 space-y-2">
        {uploading && <p>Subiendo...</p>}
        {url && !uploading && (
          <div className="space-y-2">
            <img src={url} alt="Imagen subida" className="max-h-48 mx-auto" />
            <p className="text-sm text-muted-foreground">Carga exitosa</p>
          </div>
        )}
        {error && (
          <div className="space-y-2">
            <p className="text-red-500">{error}</p>
            <Button variant="outline" size="sm" onClick={retry}>
              Reintentar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}