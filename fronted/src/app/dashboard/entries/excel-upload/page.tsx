'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { commitImportedExcelData, getAllStores, importExcelFile } from '@/app/dashboard/inventory/inventory.api'
import { getUserDataFromToken } from '@/lib/auth'

function validarFilas(previewData: any[]): Record<number, string[]> {
    const errores: Record<number, string[]> = {}
  
    previewData.forEach((fila, index) => {
      const filaErrores: string[] = []
  
      if (!fila.nombre || typeof fila.nombre !== 'string' || fila.nombre.trim() === '') {
        filaErrores.push(`Falta el campo "nombre"`)
      }
  
      if (!fila.categoria || typeof fila.categoria !== 'string' || fila.categoria.trim() === '') {
        filaErrores.push(`Falta el campo "categoría"`)
      }
  
      // Validación corregida para precioCompra
      if (
        fila.precioCompra === undefined ||
        (typeof fila.precioCompra === 'string' && fila.precioCompra.trim() === '') ||
        isNaN(Number(fila.precioCompra))
      ) {
        filaErrores.push(`"precioCompra" inválido`)
      }
  
      // Validación corregida para stock
      if (
        fila.stock === undefined ||
        (typeof fila.stock === 'string' && fila.stock.trim() === '') ||
        isNaN(Number(fila.stock))
      ) {
        filaErrores.push(`"stock" inválido`)
      }

      // ✅ Validación opcional de precioVenta (si se proporciona)
      if (
        fila.precioVenta !== undefined &&
        fila.precioVenta !== null &&
        fila.precioVenta !== '' &&
        isNaN(Number(fila.precioVenta))
      ) {
        filaErrores.push(`"precioVenta" inválido`)
      }
  
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
  const [erroresValidacion, setErroresValidacion] = useState<string[]>([])
  const [filasConError, setFilasConError] = useState<number[]>([])
  const erroresMapeados: Record<number, string[]> = validarFilas(previewData || [])

  const router = useRouter()

const handleUpload = async () => {
    if (!file) return
    try {
      const response = await importExcelFile(file)
      const preview = response.preview

      const erroresPorFila = validarFilas(preview)
      const errores = Object.values(erroresPorFila).flat()
      const indicesConError = Object.keys(erroresPorFila).map((idx) => parseInt(idx))

      const seriesDuplicadas = encontrarSeriesDuplicadas(preview)
      if (seriesDuplicadas.length > 0) {
        errores.push(`Series duplicadas en el archivo: ${seriesDuplicadas.join(', ')}`)
      }

      setErroresValidacion(errores)
      setFilasConError(indicesConError)

      if (errores.length > 0) {
        setPreviewData(null)
        return
      }

      setPreviewData(preview)
    } catch (error) {
      console.error('Error al subir el archivo:', error)
    }
  }

  const handleCommit = async () => {

    const userData = await getUserDataFromToken()
    if (!userData) {
        alert('No se pudo obtener el usuario. Inicia sesión nuevamente.')
        return
    }

    if (!previewData || !selectedStoreId) return

    const erroresPorFila = validarFilas(previewData)
    const errores = Object.values(erroresPorFila).flat()
    const indicesConError = Object.keys(erroresPorFila).map((idx) => parseInt(idx))

    const seriesDuplicadas = encontrarSeriesDuplicadas(previewData)
    if (seriesDuplicadas.length > 0) {
      errores.push(`Series duplicadas en el archivo: ${seriesDuplicadas.join(', ')}`)
    }

    setErroresValidacion(errores)
    setFilasConError(indicesConError)

    if (errores.length > 0) {
    return
    }

    try {
      const providerId = null // <--- aquí lo dejamos explícitamente como null
      const response = await commitImportedExcelData(previewData, selectedStoreId, userData.userId, 
        providerId)

      // Mostrar advertencias si hay series duplicadas
      if (response.duplicatedSeriesGlobal?.length > 0 || response.duplicatedSeriesLocal?.length > 0) {
        const msg: string[] = []
  
        if (response.duplicatedSeriesGlobal?.length > 0) {
          msg.push(`⚠️ Series ya registradas en el sistema:\n${response.duplicatedSeriesGlobal.join(', ')}`)
        }
  
        if (response.duplicatedSeriesLocal?.length > 0) {
          msg.push(`⚠️ Series duplicadas en el archivo Excel:\n${response.duplicatedSeriesLocal.join(', ')}`)
        }
  
        alert(msg.join('\n\n'))
      }

      alert('✅ Inventario registrado con éxito.')
      router.push('/dashboard/inventory')
    } catch (error) {
      console.error('Error al guardar datos:', error)
    }
  }

  useEffect(() => {
    async function loadStores() {
      const storeList = await getAllStores()
      setStores(storeList)
    }
    loadStores()
  }, [])

  return (
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
      <Button className="mt-4" onClick={handleUpload}>Procesar Archivo</Button>
      <Button variant="outline" onClick={() => router.back()}>Volver</Button>

      {previewData && (
        <div className="mt-6 space-y-4">
          <div>
            <h2 className="font-semibold mb-1">Selecciona una tienda destino:</h2>
            <Select onValueChange={(value) => setSelectedStoreId(Number(value))}>
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
                <h2 className="font-semibold mb-1">Previsualización:</h2>
                <div className="border rounded p-4 max-h-[400px] overflow-auto space-y-2 text-sm">
                {previewData.map((item, idx) => (
                <div
                    key={idx}
                    className={`p-3 rounded border ${
                    filasConError.includes(idx) ? 'bg-red-400 border-red-600' : 'bg-muted'
                    }`}
                >
                    {erroresMapeados[idx] && (
                    <div className="text-sm text-red-700 space-y-1 mb-1">
                        {erroresMapeados[idx].map((err, i) => (
                        <p key={i}>⚠️ {err}</p>
                        ))}
                    </div>
                    )}
                    <p>
                    <strong>{item['nombre '] || item.nombre}</strong> —{' '}
                    <span className="italic">{item.categoria}</span>
                    </p>
                    <p>
                    <span className="font-medium">Stock:</span> {item.stock} —{' '}
                    <span className="font-medium">Precio Compra:</span>{' '}
                    {item.precioCompra ?? '—'} —{' '}
                    <span className="font-medium">Precio Venta:</span>{' '}
                    {item.precioVenta ?? '—'}
                    </p>
                    {item.serie && (
                    <p>
                        <span className="font-medium">Series:</span>{' '}
                        {typeof item.serie === 'string'
                        ? item.serie
                        : Array.isArray(item.serie)
                        ? item.serie.join(', ')
                        : '—'}
                    </p>
                    )}
                </div>
                ))}
                </div>
           </div>

           {erroresValidacion.length > 0 && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded space-y-2 relative">
                <button
                onClick={() => setErroresValidacion([])}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm"
                >
                ✕
                </button>
                <p className="font-semibold">❌ Se encontraron errores en el archivo:</p>
                <ul className="list-disc list-inside text-sm">
                {erroresValidacion.map((error, idx) => (
                    <li key={idx}>{error}</li>
                ))}
                </ul>
            </div>
            )}

          <Button
            className="w-full bg-green-700 hover:bg-green-800 text-white"
            onClick={handleCommit}
            disabled={!selectedStoreId}
          >
            Confirmar e Insertar Inventario
          </Button>
        </div>
      )}
    </div>
  )
}
