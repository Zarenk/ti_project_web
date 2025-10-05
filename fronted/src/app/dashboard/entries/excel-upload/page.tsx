'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { Loader2 } from 'lucide-react'

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

  const isProcessing = isUploading || isSaving
  const currentOverlayProgress = isUploading ? uploadProgress : savingProgress
  const overlayMessage = isUploading ? 'Procesando archivo...' : 'Insertando inventario...'


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
        duplicatedMsgs.push(`⚠️ Series ya registradas en el sistema: ${response.duplicatedSeriesGlobal.join(', ')}`)      
      }

      if (response.duplicatedSeriesLocal?.length > 0) {
        duplicatedMsgs.push(`⚠️ Series duplicadas en el archivo Excel: ${response.duplicatedSeriesLocal.join(', ')}`)
      }

      if (duplicatedMsgs.length > 0) {
        setErroresValidacion(duplicatedMsgs)
        setFilasConError([])
        return
      }

      toast.success('✅ Inventario registrado con éxito.')
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

  return (
    <div className="relative">
      {isProcessing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-lg border bg-background p-6 shadow-lg">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="font-medium">{overlayMessage}</p>
                <p className="text-sm text-muted-foreground">{currentOverlayProgress}% completado</p>
              </div>
            </div>
            <Progress value={currentOverlayProgress} />
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6 gap-2">
        <h1 className="text-2xl font-bold">Subir Inventario por Excel</h1>
      </div>

      <div className="mb-6 space-y-2">
        <h2 className="font-semibold">Formato de la hoja Excel</h2>
        <div className="overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-2 py-1">nombre</th>
                <th className="px-2 py-1">categoria</th>
                <th className="px-2 py-1">descripcion</th>
                <th className="px-2 py-1">precioCompra</th>
                <th className="px-2 py-1">precioVenta</th>
                <th className="px-2 py-1">stock</th>
                <th className="px-2 py-1">serie</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2 py-1">Laptop XYZ</td>
                <td className="px-2 py-1">Laptops</td>
                <td className="px-2 py-1">Descripción opcional</td>
                <td className="px-2 py-1">1500</td>
                <td className="px-2 py-1">1700</td>
                <td className="px-2 py-1">5</td>
                <td className="px-2 py-1">ABC123, DEF456</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">
          La primera fila debe contener exactamente estos encabezados. La columna
          <code> serie</code> es opcional y acepta varios números separados por
          comas.
        </p>
      </div>

      <Input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <Button className="mt-4" onClick={handleUpload} disabled={isUploading || isSaving}>
        {isUploading ? 'Procesando...' : 'Procesar Archivo'}
      </Button>
      {isUploading && (
        <div className="w-full bg-muted rounded h-2 mt-2">
          <div className="bg-blue-600 h-2 rounded" style={{width: `${uploadProgress}%`}}></div>
        </div>
      )}
      <Button variant="outline" onClick={() => router.back()}>Volver</Button>

      {previewData && (
        <div className="mt-6 space-y-4">
          <div>
            <h2 className="font-semibold mb-1">Selecciona una tienda destino:</h2>
            <Select onValueChange={(value:any) => setSelectedStoreId(Number(value))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tienda destino" />
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

          <div>
            <h2 className="font-semibold mb-1">Selecciona un proveedor:</h2>
            <Select onValueChange={(value:any) => setSelectedProviderId(Number(value))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Proveedor" />
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

          <div>
            <h2 className="font-semibold mb-1">Previsualizacion:</h2>
            <div className="border rounded p-4 max-h-[400px] overflow-auto space-y-2 text-sm">
              {previewData.map((item, idx) => {
                const filaErrores = erroresMapeados[idx] ?? []
                const camposConError = new Set(filaErrores.map((error) => error.campo))
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded border ${
                      filasConError.includes(idx) ? 'bg-red-400 border-red-600' : 'bg-muted'
                    }`}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Fila {idx + 2}
                    </p>
                    {filaErrores.length > 0 && (
                      <div className="text-sm text-red-700 space-y-1 mb-2">
                        {filaErrores.map((error) => (
                          <p key={`${idx}-${error.campo}`}>
                            <span className="font-semibold capitalize">{error.campo}</span>: {error.mensaje}{' '}
                            <span className="text-xs text-muted-foreground">
                              Valor recibido: {obtenerValorOriginal(error.valor)}
                            </span>
                          </p>
                        ))}
                      </div>
                    )}
                    <p>
                      <strong className={camposConError.has('nombre') ? 'text-red-700 font-semibold' : ''}>
                        {item['nombre '] || item.nombre || 'Sin nombre'}
                      </strong>{' '}
                      <span
                        className={`italic ${camposConError.has('categoria') ? 'text-red-700 font-semibold' : ''}`}
                      >
                        {item.categoria ?? 'Sin categoria'}
                      </span>
                    </p>
                    <p className="space-x-1">
                      <span className={`font-medium ${camposConError.has('stock') ? 'text-red-700' : ''}`}>
                        Stock:
                      </span>
                      <span className={camposConError.has('stock') ? 'text-red-700 font-semibold' : ''}>
                        {obtenerValorLegible(item.stock)}
                      </span>
                      <span className={`font-medium ${camposConError.has('precioCompra') ? 'text-red-700' : ''}`}>
                        Precio Compra:
                      </span>
                      <span className={camposConError.has('precioCompra') ? 'text-red-700 font-semibold' : ''}>
                        {obtenerValorLegible(item.precioCompra)}
                      </span>
                      <span className={`font-medium ${camposConError.has('precioVenta') ? 'text-red-700' : ''}`}>
                        Precio Venta:
                      </span>
                      <span className={camposConError.has('precioVenta') ? 'text-red-700 font-semibold' : ''}>
                        {obtenerValorLegible(item.precioVenta)}
                      </span>
                    </p>
                    {item.serie && (
                      <p>
                        <span className="font-medium">Series:</span>{' '}
                        {typeof item.serie === 'string'
                          ? item.serie
                          : Array.isArray(item.serie)
                          ? item.serie.join(', ')
                          : 'Sin series'}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {(filteredErrorEntries.length > 0 || generalErrorMessages.length > 0) && (
            <div className="p-4 bg-red-100/80 border border-red-300 text-red-900 rounded space-y-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">Se encontraron errores en el archivo</p>
                  {filaErroresEntries.length > 0 && (
                    <p className="text-xs text-muted-foreground">Usa los filtros para localizar rapidamente los problemas en tu Excel.</p>
                  )}
                </div>
                {(errorFieldFilter !== 'ALL' || errorSearchTerm) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setErrorFieldFilter('ALL')
                      setErrorSearchTerm('')
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>

              {filaErroresEntries.length > 0 && (
                <div className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)]">
                    <Select value={errorFieldFilter} onValueChange={setErrorFieldFilter}>
                      <SelectTrigger className="h-9 bg-white text-red-900 border-red-200">
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
                      className="h-9 bg-white text-red-900 border-red-200"
                    />
                  </div>

                  <div className="rounded-md border border-red-200 bg-white">
                    {filteredErrorEntries.length > 0 ? (
                      <Accordion type="multiple" className="divide-y divide-red-100">
                        {filteredErrorEntries.map(({ rowIndex, rowNumber, errores }) => (
                          <AccordionItem key={rowIndex} value={`error-row-${rowIndex}`}>
                            <AccordionTrigger className="px-4 py-3 hover:no-underline">
                              <div className="flex w-full items-center justify-between gap-3 text-left">
                                <span className="font-medium text-red-900">Fila {rowNumber}</span>
                                <Badge variant="secondary" className="bg-red-100 text-red-800">
                                  {errores.length} {errores.length === 1 ? 'error' : 'errores'}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                              <ul className="space-y-2 text-sm">
                                {errores.map((error, idx) => (
                                  <li
                                    key={`${rowIndex}-${error.campo}-${idx}`}
                                    className="rounded-md border border-red-100 bg-red-50 p-3 text-red-900"
                                  >
                                    <p className="font-semibold capitalize">{error.campo}</p>
                                    <p>{error.mensaje}</p>
                                    <p className="text-xs text-muted-foreground">
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
                </div>
              )}

              {generalErrorMessages.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-red-900">Validaciones adicionales</p>
                  <ul className="list-disc list-inside text-sm text-red-900">
                    {generalErrorMessages.map((error, idx) => (
                      <li key={`general-${idx}`}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <Button
            className="w-full bg-green-700 hover:bg-green-800 text-white"
            onClick={handleCommit}
            disabled={!selectedStoreId || !selectedProviderId || isSaving}
          >
            {isSaving ? 'Guardando...' : 'Confirmar e Insertar Inventario'}
          </Button>
        </div>
      )}
    </div>
  </div>
  )
}
