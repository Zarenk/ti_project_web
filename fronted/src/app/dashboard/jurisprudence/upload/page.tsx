"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, FileText, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { uploadJurisprudenceDocument } from "../jurisprudence.api"

export default function JurisprudenceUploadPage() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    court: "",
    chamber: "",
    expediente: "",
    year: new Date().getFullYear().toString(),
    publishDate: "",
  })

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        toast.error("Solo se permiten archivos PDF")
        return
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast.error("El archivo no puede superar 50 MB")
        return
      }
      setFile(selectedFile)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      toast.error("Debe seleccionar un archivo PDF")
      return
    }

    if (!formData.title || !formData.court || !formData.expediente || !formData.year) {
      toast.error("Complete todos los campos obligatorios")
      return
    }

    try {
      setUploading(true)

      const data = new FormData()
      data.append("file", file)
      data.append("title", formData.title)
      data.append("court", formData.court)
      if (formData.chamber) data.append("chamber", formData.chamber)
      data.append("expediente", formData.expediente)
      data.append("year", formData.year)
      if (formData.publishDate) data.append("publishDate", formData.publishDate)
      data.append("sourceType", "MANUAL")

      await uploadJurisprudenceDocument(data)

      toast.success("Documento subido correctamente. Se procesará en segundo plano.")
      router.push("/dashboard/jurisprudence")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al subir documento"
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-3xl p-4">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Subir Documento de Jurisprudencia</h1>
          <p className="text-sm text-muted-foreground">
            Sube un PDF de sentencia, casación u otro documento judicial
          </p>
        </div>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          El documento será procesado automáticamente para extraer texto y generar embeddings.
          Este proceso puede tomar varios minutos dependiendo del tamaño del archivo.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información del Documento</CardTitle>
            <CardDescription>
              Complete los datos del documento judicial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file">
                Archivo PDF <span className="text-red-500">*</span>
              </Label>
              <Input
                id="file"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={uploading}
                className="cursor-pointer"
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                  <span>({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Título <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Ej: Casación N° 1234-2023-Lima"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                disabled={uploading}
              />
            </div>

            {/* Court */}
            <div className="space-y-2">
              <Label htmlFor="court">
                Juzgado / Corte <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.court}
                onValueChange={(value) => handleInputChange("court", value)}
                disabled={uploading}
              >
                <SelectTrigger id="court" className="cursor-pointer">
                  <SelectValue placeholder="Seleccione el juzgado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Corte Suprema">Corte Suprema</SelectItem>
                  <SelectItem value="Corte Superior de Lima">
                    Corte Superior de Lima
                  </SelectItem>
                  <SelectItem value="Tribunal Constitucional">
                    Tribunal Constitucional
                  </SelectItem>
                  <SelectItem value="Corte Superior de Arequipa">
                    Corte Superior de Arequipa
                  </SelectItem>
                  <SelectItem value="Corte Superior de Cusco">
                    Corte Superior de Cusco
                  </SelectItem>
                  <SelectItem value="Corte Superior de La Libertad">
                    Corte Superior de La Libertad
                  </SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chamber */}
            <div className="space-y-2">
              <Label htmlFor="chamber">Sala (Opcional)</Label>
              <Input
                id="chamber"
                placeholder="Ej: Primera Sala Civil Transitoria"
                value={formData.chamber}
                onChange={(e) => handleInputChange("chamber", e.target.value)}
                disabled={uploading}
              />
            </div>

            {/* Expediente */}
            <div className="space-y-2">
              <Label htmlFor="expediente">
                Número de Expediente <span className="text-red-500">*</span>
              </Label>
              <Input
                id="expediente"
                placeholder="Ej: 1234-2023"
                value={formData.expediente}
                onChange={(e) => handleInputChange("expediente", e.target.value)}
                disabled={uploading}
              />
            </div>

            {/* Year */}
            <div className="space-y-2">
              <Label htmlFor="year">
                Año <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.year}
                onValueChange={(value) => handleInputChange("year", value)}
                disabled={uploading}
              >
                <SelectTrigger id="year" className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Publish Date */}
            <div className="space-y-2">
              <Label htmlFor="publishDate">Fecha de Publicación (Opcional)</Label>
              <Input
                id="publishDate"
                type="date"
                value={formData.publishDate}
                onChange={(e) => handleInputChange("publishDate", e.target.value)}
                disabled={uploading}
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={uploading}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={uploading} className="cursor-pointer">
            {uploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Subir Documento
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
