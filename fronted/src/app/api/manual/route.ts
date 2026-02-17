/** @jsxImportSource react */
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import React from 'react'
import { UserManualDocument } from './UserManualDocument'
import type { HelpSection } from '@/data/help/types'
import fs from 'fs'
import path from 'path'

// Configuración de caché
const CACHE_DIR = path.join(process.cwd(), '.next', 'cache')
const CACHE_FILE = path.join(CACHE_DIR, 'user-manual.pdf')
const CACHE_DURATION = 1000 * 60 * 60 * 24 // 24 horas

/**
 * IDs de todas las secciones de ayuda (orden de aparición en el manual).
 * Se importan directamente desde los módulos para evitar el sistema de lazy-loading
 * del browser que no funciona en el contexto server-side de Next.js API routes.
 */
const SECTION_IMPORTS: Record<string, () => Promise<HelpSection>> = {
  general: () => import('@/data/help/sections/general').then(m => m.generalSection),
  overviews: () => import('@/data/help/sections/overviews').then(m => m.overviewsSection),
  inventory: () => import('@/data/help/sections/inventory').then(m => m.inventorySection),
  products: () => import('@/data/help/sections/products').then(m => m.productsSection),
  sales: () => import('@/data/help/sections/sales').then(m => m.salesSection),
  entries: () => import('@/data/help/sections/entries').then(m => m.entriesSection),
  categories: () => import('@/data/help/sections/categories').then(m => m.categoriesSection),
  providers: () => import('@/data/help/sections/providers').then(m => m.providersSection),
  users: () => import('@/data/help/sections/users').then(m => m.usersSection),
  stores: () => import('@/data/help/sections/stores').then(m => m.storesSection),
  tenancy: () => import('@/data/help/sections/tenancy').then(m => m.tenancySection),
  accounting: () => import('@/data/help/sections/accounting').then(m => m.accountingSection),
  cashregister: () => import('@/data/help/sections/cashregister').then(m => m.cashregisterSection),
  quotes: () => import('@/data/help/sections/quotes').then(m => m.quotesSection),
  exchange: () => import('@/data/help/sections/exchange').then(m => m.exchangeSection),
  messages: () => import('@/data/help/sections/messages').then(m => m.messagesSection),
  orders: () => import('@/data/help/sections/orders').then(m => m.ordersSection),
  reports: () => import('@/data/help/sections/reports').then(m => m.reportsSection),
  catalog: () => import('@/data/help/sections/catalog').then(m => m.catalogSection),
  settings: () => import('@/data/help/sections/settings').then(m => m.settingsSection),
  hardware: () => import('@/data/help/sections/hardware').then(m => m.hardwareSection),
  'api-integrations': () => import('@/data/help/sections/api-integrations').then(m => m.apiIntegrationsSection),
  'public-store': () => import('@/data/help/sections/public-store').then(m => m.publicStoreSection),
  brands: () => import('@/data/help/sections/brands').then(m => m.brandsSection),
  history: () => import('@/data/help/sections/history').then(m => m.historySection),
  barcode: () => import('@/data/help/sections/barcode').then(m => m.barcodeSection),
  troubleshooting: () => import('@/data/help/sections/troubleshooting').then(m => m.troubleshootingSection),
}

/**
 * Carga todas las secciones de ayuda directamente (server-side compatible).
 * No depende del sistema de lazy-loading del browser.
 */
async function loadAllSections(): Promise<HelpSection[]> {
  const entries = Object.entries(SECTION_IMPORTS)
  const sections: HelpSection[] = []

  for (const [id, loader] of entries) {
    try {
      const section = await loader()
      if (section && section.entries.length > 0) {
        sections.push(section)
      }
    } catch (err) {
      console.warn(`No se pudo cargar sección "${id}":`, err)
    }
  }

  return sections
}

/**
 * Convierte un archivo de imagen a base64 data URL para @react-pdf/renderer v4
 * (v4 usa fetch() internamente, así que no puede leer rutas del filesystem directamente)
 */
function fileToDataUrl(filePath: string): string | null {
  try {
    const ext = path.extname(filePath).toLowerCase()
    const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png'
    const buffer = fs.readFileSync(filePath)
    return `data:${mime};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

/**
 * Carga recursivamente todos los screenshots del directorio /public/help
 * Retorna un mapa de ruta relativa → base64 data URL
 */
function loadScreenshots(): Record<string, string> {
  const helpDir = path.join(process.cwd(), 'public', 'help')
  const screenshots: Record<string, string> = {}

  function scanDir(dir: string, prefix = '') {
    try {
      const files = fs.readdirSync(dir)

      files.forEach((file) => {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
          scanDir(fullPath, `${prefix}${file}/`)
        } else if (
          file.endsWith('.png') ||
          file.endsWith('.jpg') ||
          file.endsWith('.jpeg')
        ) {
          const key = `/help/${prefix}${file}`
          const dataUrl = fileToDataUrl(fullPath)
          if (dataUrl) {
            screenshots[key] = dataUrl
          }
        }
      })
    } catch (error) {
      console.warn(`No se pudo escanear directorio ${dir}:`, error)
    }
  }

  scanDir(helpDir)
  return screenshots
}

/**
 * Verifica si el caché es válido
 */
function isCacheValid(): boolean {
  try {
    if (!fs.existsSync(CACHE_FILE)) return false

    const stats = fs.statSync(CACHE_FILE)
    const age = Date.now() - stats.mtimeMs

    return age < CACHE_DURATION
  } catch (error) {
    console.error('Error verificando caché:', error)
    return false
  }
}

/**
 * Guarda el PDF en caché
 */
function saveToCache(buffer: Buffer): void {
  try {
    // Crear directorio de caché si no existe
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true })
    }

    fs.writeFileSync(CACHE_FILE, buffer)
    console.log('✅ Manual PDF guardado en caché')
  } catch (error) {
    console.error('❌ Error guardando caché:', error)
  }
}

/**
 * Lee el PDF desde caché
 */
function readFromCache(): Buffer | null {
  try {
    return fs.readFileSync(CACHE_FILE)
  } catch (error) {
    console.error('❌ Error leyendo caché:', error)
    return null
  }
}

/**
 * Genera el manual PDF
 */
async function generateManual(): Promise<Buffer> {
  console.log('Generando manual PDF...')
  const startTime = Date.now()

  // Cargar screenshots (mapa de ruta relativa → filesystem path)
  const screenshots = loadScreenshots()
  console.log(`Screenshots cargados: ${Object.keys(screenshots).length}`)

  // Cargar TODAS las secciones directamente (server-side)
  const allSections = await loadAllSections()

  // Filtrar secciones no deseadas (courtesy es solo para el chatbot)
  const sections = allSections.filter(
    (s) => s.id !== 'courtesy' && s.id !== 'troubleshooting'
  )

  console.log(`Secciones incluidas: ${sections.length}`)
  console.log(
    `Total de entries: ${sections.reduce((acc, s) => acc + s.entries.length, 0)}`
  )

  // Convertir placeholder y logo a base64 data URLs
  const placeholderFilePath = path.join(process.cwd(), 'public', 'help', 'placeholder-screenshot.png')
  const placeholderPath = fileToDataUrl(placeholderFilePath) ?? ''

  const logoFilePath = path.join(process.cwd(), 'public', 'ti_logo_final_2024.png')
  const companyLogo = fileToDataUrl(logoFilePath) ?? undefined

  // Preparar data del manual
  const manualData = {
    sections,
    screenshots,
    placeholderPath,
    metadata: {
      generatedAt: new Date().toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      version: '1.0.0',
      companyLogo,
    },
  }

  const totalEntries = sections.reduce((acc, s) => acc + s.entries.length, 0)
  console.log(`Secciones: ${sections.length}, Entries: ${totalEntries}, Screenshots: ${Object.keys(screenshots).length}`)

  // Renderizar PDF
  const pdfBuffer = await renderToBuffer(
    React.createElement(UserManualDocument, { data: manualData }) as any
  )

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`Manual generado en ${duration}s, tamaño: ${(pdfBuffer.length / 1024).toFixed(0)}KB`)

  // Guardar en caché
  saveToCache(pdfBuffer)

  return pdfBuffer
}

/**
 * Endpoint GET /api/manual
 * Retorna el manual de usuario en PDF
 */
export async function GET(req: NextRequest) {
  try {
    let pdfBuffer: Buffer
    let fromCache = false

    // Verificar caché (24h TTL)
    if (isCacheValid()) {
      const cached = readFromCache()
      if (cached) {
        pdfBuffer = cached
        fromCache = true
      } else {
        pdfBuffer = await generateManual()
      }
    } else {
      pdfBuffer = await generateManual()
    }

    // Retornar PDF (convert Buffer to Uint8Array for NextResponse compatibility)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Manual_Usuario_ADSLab_${Date.now()}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
        'X-Cache': fromCache ? 'HIT' : 'MISS',
        'Cache-Control': 'public, max-age=86400', // 24h
      },
    })
  } catch (error) {
    console.error('❌ Error generando manual PDF:', error)

    return new NextResponse(
      JSON.stringify({
        error: 'Error generando el manual PDF',
        message: error instanceof Error ? error.message : 'Error desconocido',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}

/**
 * Endpoint DELETE /api/manual
 * Limpia el caché del manual (útil para desarrollo)
 */
export async function DELETE(req: NextRequest) {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE)
      console.log('🗑️ Caché del manual eliminado')
    }

    return new NextResponse(
      JSON.stringify({ message: 'Caché eliminado correctamente' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('❌ Error eliminando caché:', error)

    return new NextResponse(
      JSON.stringify({
        error: 'Error eliminando caché',
        message: error instanceof Error ? error.message : 'Error desconocido',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
