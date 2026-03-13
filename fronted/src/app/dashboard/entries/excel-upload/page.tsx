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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Loader2,
  Package,
  Search,
  Store,
  Truck,
  Upload,
  X,
} from 'lucide-react'
import { useTenantFeatures } from '@/context/tenant-features-context'

type FilaError = {
  campo: string
  mensaje: string
  valor: unknown
}

type ErrorCategory = 'campo_vacio' | 'formato_invalido' | 'series_duplicadas' | 'espacios_extra'

const CATEGORY_CONFIG: Record<ErrorCategory, { label: string; color: string; bg: string; dot: string }> = {
  campo_vacio: { label: 'Campos vacíos', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/30', dot: 'bg-rose-500' },
  formato_invalido: { label: 'Formato inválido', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/30', dot: 'bg-amber-500' },
  series_duplicadas: { label: 'Series duplicadas', color: 'text-violet-700 dark:text-violet-300', bg: 'bg-violet-50 dark:bg-violet-950/30', dot: 'bg-violet-500' },
  espacios_extra: { label: 'Espacios extra', color: 'text-sky-700 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-950/30', dot: 'bg-sky-500' },
}

function categorizeError(error: FilaError): ErrorCategory {
  if (error.mensaje.includes('obligatorio')) return 'campo_vacio'
  if (error.mensaje.includes('numerico')) return 'formato_invalido'
  if (error.mensaje.includes('espacios')) return 'espacios_extra'
  return 'formato_invalido'
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

function validarCampoObligatorioTexto(
  filaErrores: FilaError[],
  fila: any,
  campo: string,
  label?: string,
) {
  const val = fila[campo]
  if (!val || typeof val !== 'string' || val.trim() === '') {
    filaErrores.push({ campo, mensaje: `El campo ${label ?? campo} es obligatorio.`, valor: val })
  } else {
    registrarErrorPorEspacios(filaErrores, campo, val)
  }
}

function validarCampoObligatorioNumerico(
  filaErrores: FilaError[],
  fila: any,
  campo: string,
) {
  const val = fila[campo]
  if (val === undefined || (typeof val === 'string' && val.trim() === '') || isNaN(Number(val))) {
    filaErrores.push({ campo, mensaje: 'El valor debe ser numerico.', valor: val })
  } else {
    registrarErrorPorEspacios(filaErrores, campo, val)
  }
}

function validarCampoOpcionalNumerico(
  filaErrores: FilaError[],
  fila: any,
  campo: string,
) {
  const val = fila[campo]
  if (val !== undefined && val !== null && val !== '' && isNaN(Number(val))) {
    filaErrores.push({ campo, mensaje: 'El valor debe ser numerico.', valor: val })
  } else if (val !== undefined && val !== null && val !== '') {
    registrarErrorPorEspacios(filaErrores, campo, val)
  }
}

const VALID_ESTACIONES = ['GRILL', 'FRY', 'COLD', 'BAKERY']

function validarFilasRestaurant(previewData: any[]): Record<number, FilaError[]> {
  const errores: Record<number, FilaError[]> = {}
  previewData.forEach((fila, index) => {
    const filaErrores: FilaError[] = []
    validarCampoObligatorioTexto(filaErrores, fila, 'nombre')
    validarCampoObligatorioTexto(filaErrores, fila, 'categoria')
    registrarErrorPorEspacios(filaErrores, 'descripcion', fila.descripcion)
    validarCampoObligatorioNumerico(filaErrores, fila, 'precioVenta')
    validarCampoOpcionalNumerico(filaErrores, fila, 'tiempoPreparacion')

    // Validate estacionCocina if provided
    if (fila.estacionCocina && typeof fila.estacionCocina === 'string') {
      const val = fila.estacionCocina.trim().toUpperCase()
      if (!VALID_ESTACIONES.includes(val)) {
        filaErrores.push({
          campo: 'estacionCocina',
          mensaje: `Valor no válido. Opciones: ${VALID_ESTACIONES.join(', ')}`,
          valor: fila.estacionCocina,
        })
      }
    }

    registrarErrorPorEspacios(filaErrores, 'alergenos', fila.alergenos)

    if (filaErrores.length > 0) {
      errores[index] = filaErrores
    }
  })
  return errores
}

function validarFilasGeneral(previewData: any[]): Record<number, FilaError[]> {
  const errores: Record<number, FilaError[]> = {}

  previewData.forEach((fila, index) => {
    const filaErrores: FilaError[] = []
    validarCampoObligatorioTexto(filaErrores, fila, 'nombre')
    validarCampoObligatorioTexto(filaErrores, fila, 'categoria')
    registrarErrorPorEspacios(filaErrores, 'descripcion', fila.descripcion)
    validarCampoObligatorioNumerico(filaErrores, fila, 'precioCompra')
    validarCampoObligatorioNumerico(filaErrores, fila, 'stock')
    validarCampoOpcionalNumerico(filaErrores, fila, 'precioVenta')
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

function validarFilas(previewData: any[], isRestaurant = false): Record<number, FilaError[]> {
  return isRestaurant ? validarFilasRestaurant(previewData) : validarFilasGeneral(previewData)
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

const EXAMPLE_COLUMNS_GENERAL = [
  { header: 'nombre', example: 'Laptop XYZ', required: true },
  { header: 'categoria', example: 'Laptops', required: true },
  { header: 'descripcion', example: 'Descripcion opcional', required: false },
  { header: 'precioCompra', example: '1500', required: true },
  { header: 'precioVenta', example: '1700', required: false },
  { header: 'stock', example: '5', required: true },
  { header: 'serie', example: 'ABC123, DEF456', required: false },
]

const EXAMPLE_COLUMNS_RESTAURANT = [
  { header: 'nombre', example: 'Ceviche Mixto', required: true },
  { header: 'categoria', example: 'Platos de Fondo', required: true },
  { header: 'descripcion', example: 'Ceviche con pescado y mariscos', required: false },
  { header: 'precioVenta', example: '28.50', required: true },
  { header: 'tiempoPreparacion', example: '15', required: false },
  { header: 'estacionCocina', example: 'GRILL, FRY, COLD, BAKERY', required: false },
  { header: 'alergenos', example: 'Pescado, Mariscos', required: false },
]

export default function ExcelUploadPage() {
  const { verticalInfo } = useTenantFeatures()
  const isRestaurant = verticalInfo?.businessVertical === 'RESTAURANTS'
  const EXAMPLE_COLUMNS = isRestaurant ? EXAMPLE_COLUMNS_RESTAURANT : EXAMPLE_COLUMNS_GENERAL

  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[] | null>(null)
  const [stores, setStores] = useState<{ id: number; name: string }[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null)
  const [providers, setProviders] = useState<{ id: number; name: string }[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null)
  const [erroresValidacion, setErroresValidacion] = useState<string[]>([])
  const [filasConError, setFilasConError] = useState<number[]>([])
  const [selectedCategory, setSelectedCategory] = useState<ErrorCategory | null>(null)
  const [errorSearchTerm, setErrorSearchTerm] = useState('')
  const erroresMapeados: Record<number, FilaError[]> = previewData ? validarFilas(previewData, isRestaurant) : {}
  const filaErroresEntries = useMemo(
    () =>
      Object.entries(erroresMapeados).map(([rowIndex, errores]) => ({
        rowIndex: Number(rowIndex),
        rowNumber: Number(rowIndex) + 2,
        errores,
      })),
    [erroresMapeados],
  )
  const generalErrorMessages = useMemo(
    () => erroresValidacion.filter((mensaje) => !mensaje.toLowerCase().startsWith('fila ')),
    [erroresValidacion],
  )
  const errorCategorySummary = useMemo(() => {
    const summary: Record<ErrorCategory, { count: number; rowIndices: Set<number> }> = {
      campo_vacio: { count: 0, rowIndices: new Set() },
      formato_invalido: { count: 0, rowIndices: new Set() },
      series_duplicadas: { count: 0, rowIndices: new Set() },
      espacios_extra: { count: 0, rowIndices: new Set() },
    }
    filaErroresEntries.forEach(({ rowIndex, errores }) => {
      errores.forEach((error) => {
        const cat = categorizeError(error)
        summary[cat].count++
        summary[cat].rowIndices.add(rowIndex)
      })
    })
    if (generalErrorMessages.some((m) => m.toLowerCase().includes('duplicada'))) {
      summary.series_duplicadas.count++
    }
    return summary
  }, [filaErroresEntries, generalErrorMessages])

  const activeCategories = useMemo(
    () =>
      (Object.entries(errorCategorySummary) as [ErrorCategory, { count: number; rowIndices: Set<number> }][])
        .filter(([, { count }]) => count > 0),
    [errorCategorySummary],
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

      const erroresPorFila = validarFilas(preview, isRestaurant)
      const indicesConError = Object.keys(erroresPorFila).map((idx) => parseInt(idx, 10))
      const hasRowErrors = Object.keys(erroresPorFila).length > 0

      const generalMessages: string[] = []

      // Series validation only for non-restaurant verticals
      if (!isRestaurant) {
        const seriesDuplicadas = encontrarSeriesDuplicadas(preview)
        if (seriesDuplicadas.length > 0) {
          generalMessages.push(`Series duplicadas en el archivo: ${seriesDuplicadas.join(', ')}`)
        }
      }

      setErroresValidacion(generalMessages)
      setFilasConError(indicesConError)
      setSelectedCategory(null)
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

    const erroresPorFila = validarFilas(previewData, isRestaurant)
    const indicesConError = Object.keys(erroresPorFila).map((idx) => parseInt(idx, 10))
    const hasRowErrors = Object.keys(erroresPorFila).length > 0

    const generalMessages: string[] = []

    if (!isRestaurant) {
      const seriesDuplicadas = encontrarSeriesDuplicadas(previewData)
      if (seriesDuplicadas.length > 0) {
        generalMessages.push(`Series duplicadas en el archivo: ${seriesDuplicadas.join(', ')}`)
      }
    }

    setErroresValidacion(generalMessages)
    setFilasConError(indicesConError)
    setSelectedCategory(null)
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
    setSelectedCategory(null)
    setErrorSearchTerm('')
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
              <h1 className="text-xl font-bold sm:text-2xl">
                {isRestaurant ? 'Importar platos desde Excel' : 'Importar productos desde Excel'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isRestaurant ? 'Carga masiva de platos al menú' : 'Carga masiva de productos al inventario'}
              </p>
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
                <span className="text-amber-600">*</span> Campos obligatorios.
                {isRestaurant
                  ? <> La columna <code className="rounded bg-muted px-1 text-[11px]">estacionCocina</code> acepta: GRILL, FRY, COLD, BAKERY.</>
                  : <> La columna <code className="rounded bg-muted px-1 text-[11px]">serie</code> acepta varios numeros separados por comas.</>
                }
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

              {/* ── Validation Report Card ── */}
              {hasErrors && (
                <Card className="border-rose-200 dark:border-rose-900/50 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/40">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base text-rose-900 dark:text-rose-200">Reporte de validación</CardTitle>
                        <CardDescription className="text-rose-700/70 dark:text-rose-400/70">
                          Corrige los errores en tu Excel y vuelve a subir el archivo
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Progress bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="font-medium">{validRowCount} válidas</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                          <span className="font-medium">{errorRowCount} con errores</span>
                        </span>
                      </div>
                      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                        {validRowCount > 0 && (
                          <div
                            className="h-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${(validRowCount / previewData.length) * 100}%` }}
                          />
                        )}
                        {errorRowCount > 0 && (
                          <div
                            className="h-full bg-rose-500 transition-all duration-500"
                            style={{ width: `${(errorRowCount / previewData.length) * 100}%` }}
                          />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        {previewData.length} filas procesadas &middot; {validRowCount} listas &middot; {errorRowCount} requieren corrección
                      </p>
                    </div>

                    {/* Error category pills */}
                    {activeCategories.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          Tipos de error encontrados
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedCategory !== null && (
                            <button
                              type="button"
                              className="cursor-pointer inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all bg-muted/50 hover:bg-muted text-muted-foreground"
                              onClick={() => setSelectedCategory(null)}
                            >
                              <X className="h-3 w-3" />
                              Mostrar todos
                            </button>
                          )}
                          {activeCategories.map(([category, { count, rowIndices }]) => {
                            const config = CATEGORY_CONFIG[category]
                            const isActive = selectedCategory === category
                            return (
                              <button
                                key={category}
                                type="button"
                                className={`cursor-pointer inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                                  isActive
                                    ? `${config.bg} ${config.color} border-current shadow-sm`
                                    : 'bg-muted/30 text-muted-foreground hover:bg-muted border-transparent'
                                }`}
                                onClick={() => setSelectedCategory(isActive ? null : category)}
                              >
                                <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                                {config.label}
                                <Badge variant="secondary" className="h-5 min-w-[1.25rem] px-1 text-[10px]">
                                  {rowIndices.size}
                                </Badge>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* General error messages (series duplicadas, etc.) */}
                    {generalErrorMessages.length > 0 && (
                      <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900/30 dark:bg-violet-950/20">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 shrink-0 mt-0.5 text-violet-600 dark:text-violet-400" />
                          <div className="space-y-1">
                            {generalErrorMessages.map((msg, idx) => (
                              <p key={idx} className="text-sm text-violet-800 dark:text-violet-300">{msg}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* ── Enhanced Preview ── */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      4
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">Vista previa</CardTitle>
                      <CardDescription>
                        {selectedCategory
                          ? `Mostrando filas con: ${CATEGORY_CONFIG[selectedCategory].label}`
                          : `${previewData.length} producto${previewData.length === 1 ? '' : 's'} encontrado${previewData.length === 1 ? '' : 's'}`
                        }
                      </CardDescription>
                    </div>
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
                  {/* Search bar */}
                  {previewData.length > 5 && (
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={errorSearchTerm}
                        onChange={(e) => setErrorSearchTerm(e.target.value)}
                        placeholder="Buscar por nombre, categoría o fila..."
                        className="h-9 pl-9 text-sm"
                      />
                    </div>
                  )}

                  <div className="max-h-[400px] space-y-2 overflow-y-auto overflow-x-hidden rounded-lg border p-3">
                    {previewData.map((item, idx) => {
                      const filaErrores = erroresMapeados[idx] ?? []
                      const camposConError = new Set(filaErrores.map((e) => e.campo))
                      const hasRowError = filaErrores.length > 0

                      // Category filter
                      if (selectedCategory) {
                        const rowCategories = filaErrores.map(categorizeError)
                        if (!rowCategories.includes(selectedCategory)) return null
                      }

                      // Search filter
                      if (errorSearchTerm.trim()) {
                        const q = errorSearchTerm.trim().toLowerCase()
                        const rowLabel = `fila ${idx + 2}`.toLowerCase()
                        const nombre = (item.nombre || '').toLowerCase()
                        const categoria = (item.categoria || '').toLowerCase()
                        if (!rowLabel.includes(q) && !nombre.includes(q) && !categoria.includes(q)) return null
                      }

                      return (
                        <div
                          key={idx}
                          className={`rounded-lg border-l-4 border p-3 text-sm transition-all ${
                            hasRowError
                              ? 'border-l-rose-500 border-rose-200 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/10'
                              : 'border-l-emerald-500 border-transparent bg-muted/30'
                          }`}
                        >
                          {/* Row header */}
                          <div className="flex items-center gap-2 mb-1.5 w-full min-w-0">
                            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-muted px-1 text-[10px] font-semibold tabular-nums text-muted-foreground shrink-0">
                              {idx + 2}
                            </span>
                            {hasRowError ? (
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            )}
                            <span className={`font-medium truncate min-w-0 ${camposConError.has('nombre') ? 'text-rose-700 dark:text-rose-400' : ''}`}>
                              {item['nombre '] || item.nombre || 'Sin nombre'}
                            </span>
                            <span className={`text-xs italic text-muted-foreground truncate min-w-0 ${camposConError.has('categoria') ? 'text-rose-700 dark:text-rose-400' : ''}`}>
                              {item.categoria ?? 'Sin categoría'}
                            </span>
                          </div>

                          {/* Inline errors — always visible, color-coded by category */}
                          {filaErrores.length > 0 && (
                            <div className="ml-7 mb-2 space-y-1.5">
                              {filaErrores.map((error, eIdx) => {
                                const cat = categorizeError(error)
                                const config = CATEGORY_CONFIG[cat]
                                return (
                                  <div
                                    key={`${idx}-${error.campo}-${eIdx}`}
                                    className={`flex items-start gap-2 rounded-md border ${config.bg} px-2.5 py-1.5`}
                                  >
                                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${config.dot}`} />
                                    <div className="min-w-0 flex-1">
                                      <p className={`text-xs font-semibold capitalize ${config.color}`}>{error.campo}</p>
                                      <p className="text-xs text-muted-foreground">{error.mensaje}</p>
                                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                                        Valor: <code className="rounded bg-muted px-1 py-0.5">{obtenerValorOriginal(error.valor)}</code>
                                      </p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Data summary */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground ml-7">
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
