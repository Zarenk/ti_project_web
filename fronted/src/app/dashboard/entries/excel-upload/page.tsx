'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { commitImportedExcelData, getAllStores, importExcelFile } from '@/app/dashboard/inventory/inventory.api'
import { getProviders } from '@/app/dashboard/providers/providers.api'
import { getUserDataFromToken } from '@/lib/auth'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/progress'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Package,
  Store,
  Truck,
  Upload,
  X,
} from 'lucide-react'

type FilaError = {
  campo: string
  mensaje: string
  valor: unknown
}


function obtenerValorLegible(valor: unknown): string {
  if (valor === undefined || valor === null) {
    return 'vacio'
  }

  if (typeof valor === 'string') {
    const trimmed = valor.trim()
    return trimmed === '' ? 'vacio' : trimmed
  }

  return String(valor)
}

function obtenerValorOriginal(valor: unknown): string {
  if (valor === undefined) {
    return 'undefined'
  }

  if (valor === null) {
    return 'null'
  }

  if (typeof valor === 'string') {
    if (valor === '') {
      return '"" (cadena vacia)'
    }

    return JSON.stringify(valor)
  }

  if (Array.isArray(valor)) {
    return JSON.stringify(valor)
  }

  if (typeof valor === 'number' && Number.isNaN(valor)) {
    return 'NaN'
  }

  if (typeof valor === 'object') {
    try {
      return JSON.stringify(valor)
    } catch (error) {
      return String(valor)
    }
  }

  return String(valor)
}


function tieneEspaciosExtremos(valor: unknown): boolean {
  if (typeof valor !== 'string') {
    return false
  }

  return valor.trim() !== valor
}

function registrarErrorPorEspacios(
  filaErrores: FilaError[],
  campo: string,
  valor: unknown,
) {
  if (typeof valor === 'string' && tieneEspaciosExtremos(valor)) {
    filaErrores.push({
      campo,
      mensaje: `El campo ${campo} contiene espacios al inicio o al final.`,
      valor,
    })
  }
}

function validarFilas(previewData: any[]): Record<number, FilaError[]> {
  const errores: Record<number, FilaError[]> = {}

  previewData.forEach((fila, index) => {
    const filaErrores: FilaError[] = []

    if (!fila.nombre || typeof fila.nombre !== 'string' || fila.nombre.trim() === '') {
      filaErrores.push({
        campo: 'nombre',
        mensaje: 'El campo nombre es obligatorio.',
        valor: fila.nombre,
      })
    } else {
      registrarErrorPorEspacios(filaErrores, 'nombre', fila.nombre)
    }

    if (!fila.categoria || typeof fila.categoria !== 'string' || fila.categoria.trim() === '') {
      filaErrores.push({
        campo: 'categoria',
        mensaje: 'El campo categoria es obligatorio.',
        valor: fila.categoria,
      })
    } else {
      registrarErrorPorEspacios(filaErrores, 'categoria', fila.categoria)
    }

    registrarErrorPorEspacios(filaErrores, 'descripcion', fila.descripcion)

    if (
      fila.precioCompra === undefined ||
      (typeof fila.precioCompra === 'string' && fila.precioCompra.trim() === '') ||
      isNaN(Number(fila.precioCompra))
    ) {
      filaErrores.push({
        campo: 'precioCompra',
        mensaje: 'El valor debe ser numerico.',
        valor: fila.precioCompra,
      })
    } else {
      registrarErrorPorEspacios(filaErrores, 'precioCompra', fila.precioCompra)
    }

    if (
      fila.stock === undefined ||
      (typeof fila.stock === 'string' && fila.stock.trim() === '') ||
      isNaN(Number(fila.stock))
    ) {
      filaErrores.push({
        campo: 'stock',
        mensaje: 'El valor debe ser numerico.',
        valor: fila.stock,
      })
    } else {
      registrarErrorPorEspacios(filaErrores, 'stock', fila.stock)
    }

    if (
      fila.precioVenta !== undefined &&
      fila.precioVenta !== null &&
      fila.precioVenta !== '' &&
      isNaN(Number(fila.precioVenta))
    ) {
      filaErrores.push({
        campo: 'precioVenta',
        mensaje: 'El valor debe ser numerico.',
        valor: fila.precioVenta,
      })
    } else if (
      fila.precioVenta !== undefined &&
      fila.precioVenta !== null &&
      fila.precioVenta !== ''
    ) {
      registrarErrorPorEspacios(filaErrores, 'precioVenta', fila.precioVenta)
    }

    registrarErrorPorEspacios(filaErrores, 'serie', fila.serie)
    registrarErrorPorEspacios(filaErrores, 'codigo', fila.codigo)
    registrarErrorPorEspacios(filaErrores, 'codigos', fila.codigos)
    registrarErrorPorEspacios(filaErrores, 'marca', fila.marca)
    registrarErrorPorEspacios(filaErrores, 'unidad', fila.unidad)

    if (filaErrores.length > 0) {
      errores[index] = filaErrores
    }
  })

  return errores
}
function encontrarSeriesDuplicadas(data: any[]): string[] {
  const vistas = new Set<string>()
  const duplicadas = new Set<string>()

  data.forEach((fila) => {
    if (!fila.serie) return
    const series = Array.isArray(fila.serie)
      ? fila.serie
      : (fila.serie as string)
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)

    series.forEach((serial: string) => {
      if (vistas.has(serial)) {
        duplicadas.add(serial)
      } else {
        vistas.add(serial)
      }
    })
  })

  return Array.from(duplicadas)
}

const EXAMPLE_COLUMNS = [
  { header: 'nombre', example: 'Laptop XYZ', required: true },
  { header: 'categoria', example: 'Laptops', required: true },
  { header: 'descripcion', example: 'Descripcion opcional', required: false },
  { header: 'precioCompra', example: '1500', required: true },
  { header: 'precioVenta', example: '1700', required: false },
  { header: 'stock', example: '5', required: true },
  { header: 'serie', example: 'ABC123, DEF456', required: false },
]

export default function ExcelUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[] | null>(null)
  const [stores, setStores] = useState<{ id: number; name: string }[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [providers, setProviders] = useState<{ id: number; name: string }[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null)
  const [erroresValidacion, setErroresValidacion] = useState<string[]>([])
  const [filasConError, setFilasConError] = useState<number[]>([])
  const [errorFieldFilter, setErrorFieldFilter] = useState<string>('ALL')
  const [errorSearchTerm, setErrorSearchTerm] = useState('')
  const erroresMapeados: Record<number, FilaError[]> = previewData ? validarFilas(previewData) : {}
  const filaErroresEntries = useMemo(
    () =>
      Object.entries(erroresMapeados).map(([rowIndex, errores]) => ({
        rowIndex: Number(rowIndex),
        rowNumber: Number(rowIndex) + 2,
        errores,
      })),
    [erroresMapeados],
  )
  const availableErrorFields = useMemo(() => {
    const fieldSet = new Set<string>()
    filaErroresEntries.forEach(({ errores }) => {
      errores.forEach((error) => fieldSet.add(error.campo))
    })
    return Array.from(fieldSet).sort((a, b) => a.localeCompare(b))
  }, [filaErroresEntries])
  const filteredErrorEntries = useMemo(() => {
    const query = errorSearchTerm.trim().toLowerCase()
    return filaErroresEntries.filter(({ rowNumber, errores }) => {
      const matchesField =
        errorFieldFilter === 'ALL' || errores.some((error) => error.campo === errorFieldFilter)
      if (!matchesField) {
        return false
      }
      if (!query) {
        return true
      }
      const rowLabel = `fila ${rowNumber}`.toLowerCase()
      if (rowLabel.includes(query)) {
        return true
      }
      return errores.some((error) => {
        const valor = obtenerValorLegible(error.valor).toLowerCase()
        return (
          error.campo.toLowerCase().includes(query) ||
          error.mensaje.toLowerCase().includes(query) ||
          valor.includes(query)
        )
      })
    })
  }, [filaErroresEntries, errorFieldFilter, errorSearchTerm])
  const generalErrorMessages = useMemo(
    () => erroresValidacion.filter((mensaje) => !mensaje.toLowerCase().startsWith('fila ')),
    [erroresValidacion],
  )
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [savingProgress, setSavingProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isProcessing = isUploading || isSaving
  const currentOverlayProgress = isUploading ? uploadProgress : savingProgress
  const overlayMessage = isUploading ? 'Procesando archivo...' : 'Insertando inventario...'

  const hasErrors = Object.keys(erroresMapeados).length > 0 || generalErrorMessages.length > 0
  const validRowCount = previewData ? previewData.length - Object.keys(erroresMapeados).length : 0
  const errorRowCount = Object.keys(erroresMapeados).length

  const router = useRouter()

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    setUploadProgress(0)
    const interval = setInterval(() => {
      setUploadProgress((p) => (p < 90 ? p + 10 : p))
    }, 200)
    try {
      const response = await importExcelFile(file)
      const preview = response.preview

      if (!Array.isArray(preview) || preview.length === 0) {
        setPreviewData(null)
        toast.error('No se pudo procesar el archivo. Corrige los datos del Excel e intentalo nuevamente.')
        return
      }

      const erroresPorFila = validarFilas(preview)
      const indicesConError = Object.keys(erroresPorFila).map((idx) => parseInt(idx, 10))
      const hasRowErrors = Object.keys(erroresPorFila).length > 0

      const seriesDuplicadas = encontrarSeriesDuplicadas(preview)
      const generalMessages: string[] = []

      if (seriesDuplicadas.length > 0) {
        generalMessages.push(`Series duplicadas en el archivo: ${seriesDuplicadas.join(', ')}`)
      }

      setErroresValidacion(generalMessages)
      setFilasConError(indicesConError)
      setErrorFieldFilter('ALL')
      setErrorSearchTerm('')

      if (hasRowErrors || generalMessages.length > 0) {
        setPreviewData(preview)
        toast.error('No se pudo procesar el archivo. Corrige los datos del Excel e intentalo nuevamente.')
        return
      }



      setPreviewData(preview)
      toast.success('Archivo procesado correctamente')
    } catch (error) {
      console.error('Error al subir el archivo:', error)
      toast.error('Error al subir el archivo')
    } finally {
      clearInterval(interval)
      setUploadProgress(100)
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
      }, 500)
    }
  }

  const handleCommit = async () => {

    const userData = await getUserDataFromToken();
    const responsibleId = Number(userData?.id)

    if (!Number.isInteger(responsibleId)) {
      toast.error('No se pudo obtener el usuario. Inicia sesión nuevamente.')
      return
    }

    if (!previewData || !selectedStoreId) return
    if (!selectedProviderId) {
      toast.error('Debe seleccionar un proveedor.')
      return
    }

    const erroresPorFila = validarFilas(previewData)
    const indicesConError = Object.keys(erroresPorFila).map((idx) => parseInt(idx, 10))
    const hasRowErrors = Object.keys(erroresPorFila).length > 0

    const seriesDuplicadas = encontrarSeriesDuplicadas(previewData)
    const generalMessages: string[] = []

    if (seriesDuplicadas.length > 0) {
      generalMessages.push(`Series duplicadas en el archivo: ${seriesDuplicadas.join(', ')}`)
    }

    setErroresValidacion(generalMessages)
    setFilasConError(indicesConError)
    setErrorFieldFilter('ALL')
    setErrorSearchTerm('')

    if (hasRowErrors || generalMessages.length > 0) {
      return
    }
    setIsSaving(true)
    setSavingProgress(0)
    const interval = setInterval(() => {
      setSavingProgress((p) => (p < 90 ? p + 10 : p))
    }, 200)
    try {
      const response = await commitImportedExcelData(previewData, selectedStoreId, responsibleId,
        selectedProviderId)

      // Mostrar advertencias si hay series duplicadas
      const duplicatedMsgs: string[] = []
      if (response.duplicatedSeriesGlobal?.length > 0) {
        duplicatedMsgs.push(`Series ya registradas en el sistema: ${response.duplicatedSeriesGlobal.join(', ')}`)
      }

      if (response.duplicatedSeriesLocal?.length > 0) {
        duplicatedMsgs.push(`Series duplicadas en el archivo Excel: ${response.duplicatedSeriesLocal.join(', ')}`)
      }

      if (duplicatedMsgs.length > 0) {
        setErroresValidacion(duplicatedMsgs)
        setFilasConError([])
        return
      }

      toast.success('Inventario registrado con exito.')
      router.push('/dashboard/inventory')
    } catch (error) {
      console.error('Error al guardar datos:', error)
      toast.error('Error al guardar datos')
    } finally {
      clearInterval(interval)
      setSavingProgress(100)
      setTimeout(() => {
        setIsSaving(false)
        setSavingProgress(0)
      }, 500)
    }
  }

  useEffect(() => {
    async function loadData() {
      const storeList = await getAllStores()
      setStores(storeList)
      const providerList = await getProviders()
      setProviders(providerList)
    }
    loadData()
  }, [])

  const handleFileSelect = useCallback((selectedFile: File | null) => {
    if (selectedFile && !selectedFile.name.endsWith('.xlsx')) {
      toast.error('Solo se aceptan archivos .xlsx')
      return
    }
    setFile(selectedFile)
    setPreviewData(null)
    setErroresValidacion([])
    setFilasConError([])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0] ?? null
    handleFileSelect(droppedFile)
  }, [handleFileSelect])

  const handleClearFile = () => {
    setFile(null)
    setPreviewData(null)
    setErroresValidacion([])
    setFilasConError([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      {/* Processing overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="w-full max-w-sm mx-4 shadow-2xl">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">{overlayMessage}</p>
                  <p className="text-sm text-muted-foreground">{currentOverlayProgress}% completado</p>
                </div>
              </div>
              <Progress value={currentOverlayProgress} />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">Importar productos desde Excel</h1>
              <p className="text-sm text-muted-foreground">Carga masiva de productos al inventario</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* Step 1: Format reference */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  1
                </div>
                <div>
                  <CardTitle className="text-base">Formato requerido</CardTitle>
                  <CardDescription>Tu archivo Excel debe tener estas columnas en la primera fila</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Mobile: vertical list */}
              <div className="space-y-2 sm:hidden">
                {EXAMPLE_COLUMNS.map((col) => (
                  <div key={col.header} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">{col.header}</code>
                      {col.required && (
                        <Badge variant="secondary" className="h-5 text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          obligatorio
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{col.example}</span>
                  </div>
                ))}
              </div>
              {/* Desktop: table */}
              <div className="hidden sm:block overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {EXAMPLE_COLUMNS.map((col) => (
                        <th key={col.header} className="whitespace-nowrap px-3 py-2 text-left font-medium">
                          <code className="text-xs">{col.header}</code>
                          {col.required && <span className="ml-1 text-amber-600">*</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-muted-foreground">
                      {EXAMPLE_COLUMNS.map((col) => (
                        <td key={col.header} className="whitespace-nowrap px-3 py-2 text-xs">
                          {col.example}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="text-amber-600">*</span> Campos obligatorios. La columna <code className="rounded bg-muted px-1 text-[11px]">serie</code> acepta varios numeros separados por comas.
              </p>
            </CardContent>
          </Card>

          {/* Step 2: Upload */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  2
                </div>
                <div>
                  <CardTitle className="text-base">Subir archivo</CardTitle>
                  <CardDescription>Selecciona o arrastra tu archivo .xlsx</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!file ? (
                <div
                  className={`group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-10 text-center transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10">
                    <Upload className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {isDragging ? 'Suelta el archivo aqui' : 'Haz clic o arrastra tu archivo'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Solo archivos .xlsx</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleClearFile() }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={isProcessing}
                    className="gap-2 bg-primary"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Procesar archivo
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Results (only after file processed) */}
          {previewData && (
            <>
              {/* Store and Provider selection */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      3
                    </div>
                    <div>
                      <CardTitle className="text-base">Destino del inventario</CardTitle>
                      <CardDescription>Selecciona donde se registraran los productos</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Store className="h-3.5 w-3.5 text-muted-foreground" />
                        Tienda destino
                      </label>
                      <Select onValueChange={(value: any) => setSelectedStoreId(Number(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar tienda" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id.toString()}>
                              {store.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                        Proveedor
                      </label>
                      <Select onValueChange={(value: any) => setSelectedProviderId(Number(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar proveedor" />
                        </SelectTrigger>
                        <SelectContent>
                          {providers.map((prov) => (
                            <SelectItem key={prov.id} value={prov.id.toString()}>
                              {prov.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview summary */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      4
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">Vista previa</CardTitle>
                      <CardDescription>
                        {previewData.length} producto{previewData.length === 1 ? '' : 's'} encontrado{previewData.length === 1 ? '' : 's'}
                      </CardDescription>
                    </div>
                    {/* Summary badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {validRowCount > 0 && (
                        <Badge variant="secondary" className="gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          {validRowCount}
                        </Badge>
                      )}
                      {errorRowCount > 0 && (
                        <Badge variant="secondary" className="gap-1 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                          <AlertTriangle className="h-3 w-3" />
                          {errorRowCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[400px] space-y-2 overflow-auto rounded-lg border p-3">
                    {previewData.map((item, idx) => {
                      const filaErrores = erroresMapeados[idx] ?? []
                      const camposConError = new Set(filaErrores.map((error) => error.campo))
                      const hasError = filasConError.includes(idx)
                      return (
                        <div
                          key={idx}
                          className={`rounded-lg border p-3 text-sm transition-colors ${
                            hasError
                              ? 'border-rose-200 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20'
                              : 'border-transparent bg-muted/40'
                          }`}
                        >
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-muted px-1 text-[10px] font-semibold tabular-nums text-muted-foreground">
                              {idx + 2}
                            </span>
                            <span className={`font-medium ${camposConError.has('nombre') ? 'text-rose-700 dark:text-rose-400' : ''}`}>
                              {item['nombre '] || item.nombre || 'Sin nombre'}
                            </span>
                            <span className={`text-xs italic text-muted-foreground ${camposConError.has('categoria') ? 'text-rose-700 dark:text-rose-400' : ''}`}>
                              {item.categoria ?? 'Sin categoria'}
                            </span>
                          </div>

                          {filaErrores.length > 0 && (
                            <div className="mb-2 space-y-1">
                              {filaErrores.map((error) => (
                                <p key={`${idx}-${error.campo}`} className="text-xs text-rose-700 dark:text-rose-400">
                                  <span className="font-semibold capitalize">{error.campo}</span>: {error.mensaje}
                                </p>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className={camposConError.has('stock') ? 'text-rose-700 dark:text-rose-400' : ''}>
                              <span className="font-medium">Stock:</span> {obtenerValorLegible(item.stock)}
                            </span>
                            <span className={camposConError.has('precioCompra') ? 'text-rose-700 dark:text-rose-400' : ''}>
                              <span className="font-medium">P.Compra:</span> {obtenerValorLegible(item.precioCompra)}
                            </span>
                            <span className={camposConError.has('precioVenta') ? 'text-rose-700 dark:text-rose-400' : ''}>
                              <span className="font-medium">P.Venta:</span> {obtenerValorLegible(item.precioVenta)}
                            </span>
                            {item.serie && (
                              <span>
                                <span className="font-medium">Series:</span>{' '}
                                {typeof item.serie === 'string'
                                  ? item.serie
                                  : Array.isArray(item.serie)
                                  ? item.serie.join(', ')
                                  : 'Sin series'}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Error panel */}
              {(filteredErrorEntries.length > 0 || generalErrorMessages.length > 0) && (
                <Card className="border-rose-200 dark:border-rose-900/50">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                          <CardTitle className="text-base text-rose-900 dark:text-rose-200">Errores encontrados</CardTitle>
                          <CardDescription className="text-rose-700/70 dark:text-rose-400/70">
                            Corrige estos problemas en tu Excel y vuelve a subirlo
                          </CardDescription>
                        </div>
                      </div>
                      {(errorFieldFilter !== 'ALL' || errorSearchTerm) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-700 hover:text-rose-900 hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-950/40"
                          onClick={() => {
                            setErrorFieldFilter('ALL')
                            setErrorSearchTerm('')
                          }}
                        >
                          Limpiar filtros
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {filaErroresEntries.length > 0 && (
                      <>
                        <div className="grid gap-2 sm:grid-cols-[200px_minmax(0,1fr)]">
                          <Select value={errorFieldFilter} onValueChange={setErrorFieldFilter}>
                            <SelectTrigger className="h-9 border-rose-200 dark:border-rose-900/50">
                              <SelectValue placeholder="Todos los campos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">Todos los campos</SelectItem>
                              {availableErrorFields.map((field) => (
                                <SelectItem key={field} value={field} className="capitalize">
                                  {field}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={errorSearchTerm}
                            onChange={(event) => setErrorSearchTerm(event.target.value)}
                            placeholder="Buscar por fila, campo o valor"
                            className="h-9 border-rose-200 dark:border-rose-900/50"
                          />
                        </div>

                        <div className="rounded-lg border border-rose-200 dark:border-rose-900/50">
                          {filteredErrorEntries.length > 0 ? (
                            <Accordion type="multiple" className="divide-y divide-rose-100 dark:divide-rose-900/30">
                              {filteredErrorEntries.map(({ rowIndex, rowNumber, errores }) => (
                                <AccordionItem key={rowIndex} value={`error-row-${rowIndex}`}>
                                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                    <div className="flex w-full items-center justify-between gap-3 text-left">
                                      <span className="font-medium text-rose-900 dark:text-rose-200">Fila {rowNumber}</span>
                                      <Badge variant="secondary" className="bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                                        {errores.length} {errores.length === 1 ? 'error' : 'errores'}
                                      </Badge>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent className="px-4 pb-4">
                                    <ul className="space-y-2 text-sm">
                                      {errores.map((error, eIdx) => (
                                        <li
                                          key={`${rowIndex}-${error.campo}-${eIdx}`}
                                          className="rounded-lg border border-rose-100 bg-rose-50/50 p-3 text-rose-900 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-200"
                                        >
                                          <p className="font-semibold capitalize">{error.campo}</p>
                                          <p className="text-sm">{error.mensaje}</p>
                                          <p className="mt-1 text-xs text-muted-foreground">
                                            Valor recibido: {obtenerValorOriginal(error.valor)}
                                          </p>
                                        </li>
                                      ))}
                                    </ul>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          ) : (
                            <div className="p-4 text-sm text-muted-foreground">
                              No se encontraron errores con los filtros aplicados.
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {generalErrorMessages.length > 0 && (
                      <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/30 dark:bg-rose-950/20">
                        <p className="mb-2 text-sm font-semibold text-rose-900 dark:text-rose-200">Validaciones adicionales</p>
                        <ul className="list-inside list-disc space-y-1 text-sm text-rose-800 dark:text-rose-300">
                          {generalErrorMessages.map((error, idx) => (
                            <li key={`general-${idx}`}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Confirm */}
              <Card className={hasErrors ? 'opacity-60' : 'border-emerald-200 dark:border-emerald-900/50'}>
                <CardContent className="py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        hasErrors ? 'bg-muted' : 'bg-emerald-500/10'
                      }`}>
                        <Package className={`h-4 w-4 ${hasErrors ? 'text-muted-foreground' : 'text-emerald-600'}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {hasErrors
                            ? 'Corrige los errores para continuar'
                            : `${previewData.length} producto${previewData.length === 1 ? '' : 's'} listo${previewData.length === 1 ? '' : 's'} para importar`
                          }
                        </p>
                        {!hasErrors && selectedStoreId && selectedProviderId && (
                          <p className="text-xs text-muted-foreground">
                            Se registraran en la tienda y proveedor seleccionados
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                      onClick={handleCommit}
                      disabled={!selectedStoreId || !selectedProviderId || isSaving || hasErrors}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Confirmar importacion
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
