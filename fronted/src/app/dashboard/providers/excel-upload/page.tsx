'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/progress'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Loader2 } from 'lucide-react'
import { importProvidersExcelFile, commitProvidersExcelData } from '../providers.api'

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
    } catch {
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

function normalizarDocumento(valor: unknown): string {
  if (typeof valor !== 'string') return ''
  const normalizado = valor.trim().toUpperCase()
  if (normalizado === 'DNI') return 'DNI'
  if (normalizado === 'RUC') return 'RUC'
  if (normalizado === 'OTRO DOCUMENTO' || normalizado === 'OTRO') return 'Otro Documento'
  return ''
}

function validarFilas(previewData: any[]): Record<number, FilaError[]> {
  const errores: Record<number, FilaError[]> = {}
  const vistos = new Set<string>()

  previewData.forEach((fila, index) => {
    const filaErrores: FilaError[] = []
    const documentType = normalizarDocumento(fila.document)
    const rawDocNumber =
      typeof fila.documentNumber === 'number'
        ? String(fila.documentNumber)
        : typeof fila.documentNumber === 'string'
          ? fila.documentNumber.trim()
          : ''
    const docNumber = rawDocNumber.replace(/\s+/g, '')

    if (!fila.name || typeof fila.name !== 'string' || fila.name.trim() === '') {
      filaErrores.push({
        campo: 'name',
        mensaje: 'El campo name es obligatorio.',
        valor: fila.name,
      })
    } else {
      registrarErrorPorEspacios(filaErrores, 'name', fila.name)
    }

    if (!documentType) {
      filaErrores.push({
        campo: 'document',
        mensaje: 'El campo document debe ser DNI, RUC u Otro Documento.',
        valor: fila.document,
      })
    } else {
      registrarErrorPorEspacios(filaErrores, 'document', fila.document)
    }

    if (!docNumber) {
      filaErrores.push({
        campo: 'documentNumber',
        mensaje: 'El campo documentNumber es obligatorio.',
        valor: fila.documentNumber,
      })
    } else if (documentType === 'DNI' && !/^\d{8}$/.test(docNumber)) {
      filaErrores.push({
        campo: 'documentNumber',
        mensaje: 'El documentNumber debe tener 8 digitos para DNI.',
        valor: fila.documentNumber,
      })
    } else if (documentType === 'RUC' && !/^\d{11}$/.test(docNumber)) {
      filaErrores.push({
        campo: 'documentNumber',
        mensaje: 'El documentNumber debe tener 11 digitos para RUC.',
        valor: fila.documentNumber,
      })
    } else if (vistos.has(docNumber)) {
      filaErrores.push({
        campo: 'documentNumber',
        mensaje: 'documentNumber duplicado en el archivo.',
        valor: fila.documentNumber,
      })
    } else if (docNumber) {
      vistos.add(docNumber)
    }

    registrarErrorPorEspacios(filaErrores, 'description', fila.description)
    registrarErrorPorEspacios(filaErrores, 'phone', fila.phone)
    registrarErrorPorEspacios(filaErrores, 'adress', fila.adress)
    registrarErrorPorEspacios(filaErrores, 'email', fila.email)
    registrarErrorPorEspacios(filaErrores, 'website', fila.website)
    registrarErrorPorEspacios(filaErrores, 'status', fila.status)
    registrarErrorPorEspacios(filaErrores, 'image', fila.image)

    if (filaErrores.length > 0) {
      errores[index] = filaErrores
    }
  })

  return errores
}

export default function ProvidersExcelUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any[] | null>(null)
  const [erroresValidacion, setErroresValidacion] = useState<string[]>([])
  const [filasConError, setFilasConError] = useState<number[]>([])
  const [errorFieldFilter, setErrorFieldFilter] = useState<string>('ALL')
  const [errorSearchTerm, setErrorSearchTerm] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [savingProgress, setSavingProgress] = useState(0)

  const router = useRouter()

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

  const isProcessing = isUploading || isSaving
  const currentOverlayProgress = isUploading ? uploadProgress : savingProgress
  const overlayMessage = isUploading ? 'Procesando archivo...' : 'Insertando proveedores...'

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    setUploadProgress(0)
    const interval = setInterval(() => {
      setUploadProgress((p) => (p < 90 ? p + 10 : p))
    }, 200)
    try {
      const response = await importProvidersExcelFile(file)
      const preview = response.preview

      if (!Array.isArray(preview) || preview.length === 0) {
        setPreviewData(null)
        toast.error('No se pudo procesar el archivo. Corrige los datos e intentalo nuevamente.')
        return
      }

      const erroresPorFila = validarFilas(preview)
      const indicesConError = Object.keys(erroresPorFila).map((idx) => parseInt(idx, 10))
      const hasRowErrors = Object.keys(erroresPorFila).length > 0

      setErroresValidacion([])
      setFilasConError(indicesConError)
      setErrorFieldFilter('ALL')
      setErrorSearchTerm('')

      if (hasRowErrors) {
        setPreviewData(preview)
        toast.error('No se pudo procesar el archivo. Corrige los datos e intentalo nuevamente.')
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
    if (!previewData) return

    const erroresPorFila = validarFilas(previewData)
    const indicesConError = Object.keys(erroresPorFila).map((idx) => parseInt(idx, 10))
    const hasRowErrors = Object.keys(erroresPorFila).length > 0

    setErroresValidacion([])
    setFilasConError(indicesConError)
    setErrorFieldFilter('ALL')
    setErrorSearchTerm('')

    if (hasRowErrors) {
      return
    }

    setIsSaving(true)
    setSavingProgress(0)
    const interval = setInterval(() => {
      setSavingProgress((p) => (p < 90 ? p + 10 : p))
    }, 200)
    try {
      await commitProvidersExcelData(previewData)
      toast.success('Proveedores importados correctamente.')
      router.push('/dashboard/providers')
    } catch (error: any) {
      console.error('Error al guardar datos:', error)
      toast.error(error?.message || 'Error al guardar datos')
    } finally {
      clearInterval(interval)
      setSavingProgress(100)
      setTimeout(() => {
        setIsSaving(false)
        setSavingProgress(0)
      }, 500)
    }
  }

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

      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-bold">Subir Proveedores por Excel</h1>
        </div>

        <div className="mb-6 space-y-2">
          <h2 className="font-semibold">Formato de la hoja Excel</h2>
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-2 py-1">name</th>
                  <th className="px-2 py-1">document</th>
                  <th className="px-2 py-1">documentNumber</th>
                  <th className="px-2 py-1">description</th>
                  <th className="px-2 py-1">phone</th>
                  <th className="px-2 py-1">adress</th>
                  <th className="px-2 py-1">email</th>
                  <th className="px-2 py-1">website</th>
                  <th className="px-2 py-1">status</th>
                  <th className="px-2 py-1">image</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-1">Proveedor ABC</td>
                  <td className="px-2 py-1">RUC</td>
                  <td className="px-2 py-1">20123456789</td>
                  <td className="px-2 py-1">Proveedor mayorista</td>
                  <td className="px-2 py-1">987654321</td>
                  <td className="px-2 py-1">Av. Central 123</td>
                  <td className="px-2 py-1">ventas@abc.com</td>
                  <td className="px-2 py-1">https://abc.com</td>
                  <td className="px-2 py-1">Activo</td>
                  <td className="px-2 py-1">/uploads/clients/archivo.png</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            La primera fila debe contener exactamente estos encabezados. Los campos
            <code> name</code>, <code> document</code> y <code> documentNumber</code> son obligatorios.
            <code> document</code> acepta DNI, RUC u Otro Documento.
          </p>
        </div>

        <div className="space-y-3">
          <Input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button onClick={handleUpload} disabled={isUploading || isSaving} className="w-full sm:w-auto">
              {isUploading ? 'Procesando...' : 'Procesar Archivo'}
            </Button>
            <Button variant="outline" onClick={() => router.back()} className="w-full sm:w-auto">
              Volver
            </Button>
          </div>
        </div>

        {previewData && (
          <div className="mt-6 space-y-4">
            <div>
              <h2 className="font-semibold mb-1">Previsualizacion:</h2>
              <div className="border rounded p-4 max-h-[400px] overflow-auto space-y-2 text-sm">
                {previewData.map((item, idx) => {
                  const filaErrores = erroresMapeados[idx] ?? []
                  const camposConError = new Set(filaErrores.map((error) => error.campo))
                  const documentType = normalizarDocumento(item.document) || 'Otro Documento'
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
                        <strong className={camposConError.has('name') ? 'text-red-700 font-semibold' : ''}>
                          {item.name || 'Sin nombre'}
                        </strong>{' '}
                        <span
                          className={`italic ${camposConError.has('document') ? 'text-red-700 font-semibold' : ''}`}
                        >
                          {documentType}
                        </span>
                      </p>
                      <p className="space-x-1">
                        <span className={`font-medium ${camposConError.has('documentNumber') ? 'text-red-700' : ''}`}>
                          Documento:
                        </span>
                        <span className={camposConError.has('documentNumber') ? 'text-red-700 font-semibold' : ''}>
                          {obtenerValorLegible(item.documentNumber)}
                        </span>
                        <span className="font-medium">Estado:</span>
                        <span>{item.status ?? 'Activo'}</span>
                      </p>
                      {item.email && (
                        <p>
                          <span className="font-medium">Email:</span> {item.email}
                        </p>
                      )}
                      {item.phone && (
                        <p>
                          <span className="font-medium">Telefono:</span> {item.phone}
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
                      <select
                        value={errorFieldFilter}
                        onChange={(event) => setErrorFieldFilter(event.target.value)}
                        className="h-9 rounded-md border border-red-200 bg-white px-2 text-sm text-red-900"
                      >
                        <option value="ALL">Todos los campos</option>
                        {availableErrorFields.map((field) => (
                          <option key={field} value={field}>
                            {field}
                          </option>
                        ))}
                      </select>
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
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : 'Confirmar e Insertar Proveedores'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
