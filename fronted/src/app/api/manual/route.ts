import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { UserManualDocument } from './UserManualDocument'
import { HELP_SECTIONS } from '@/data/help'
import fs from 'fs'
import path from 'path'

// Configuración de caché
const CACHE_DIR = path.join(process.cwd(), '.next', 'cache')
const CACHE_FILE = path.join(CACHE_DIR, 'user-manual.pdf')
const CACHE_DURATION = 1000 * 60 * 60 * 24 // 24 horas

/**
 * Carga recursivamente todos los screenshots del directorio /public/help
 */
function loadScreenshots(): Record<string, string> {
  const helpDir = path.join(process.cwd(), 'public', 'help')
  const screenshots: Record<string, string> = {}

  // Agregar placeholder por defecto
  screenshots['/help/placeholder-screenshot.png'] = path.join(
    helpDir,
    'placeholder-screenshot.png'
  )

  function scanDir(dir: string, prefix = '') {
    try {
      const files = fs.readdirSync(dir)

      files.forEach((file) => {
        const fullPath = path.join(dir, file)
        const stat = fs.statSync(fullPath)

        if (stat.isDirectory()) {
          // Escanear subdirectorio
          scanDir(fullPath, `${prefix}${file}/`)
        } else if (
          file.endsWith('.png') ||
          file.endsWith('.jpg') ||
          file.endsWith('.jpeg')
        ) {
          // Agregar imagen al mapa
          const key = `/help/${prefix}${file}`
          screenshots[key] = fullPath
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
  console.log('📝 Generando manual PDF...')
  const startTime = Date.now()

  // Cargar screenshots
  const screenshots = loadScreenshots()
  console.log(`📷 Screenshots cargados: ${Object.keys(screenshots).length}`)

  // Filtrar secciones (excluir courtesy)
  const sections = HELP_SECTIONS.filter(
    (s) => s.id !== 'courtesy' && s.entries.length > 0
  )

  console.log(`📚 Secciones incluidas: ${sections.length}`)
  console.log(
    `📄 Total de entries: ${sections.reduce((acc, s) => acc + s.entries.length, 0)}`
  )

  // Preparar data del manual
  const manualData = {
    sections,
    screenshots,
    metadata: {
      generatedAt: new Date().toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      version: '1.0.0',
      companyLogo: path.join(process.cwd(), 'public', 'ti_logo_final_2024.png'),
    },
  }

  // Renderizar PDF
  const pdfBuffer = await renderToBuffer(
    <UserManualDocument data={manualData} />
  )

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  console.log(`✅ Manual generado en ${duration}s`)

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

    // Verificar caché
    if (isCacheValid()) {
      console.log('⚡ Usando manual desde caché')
      const cached = readFromCache()
      if (cached) {
        pdfBuffer = cached
        fromCache = true
      } else {
        // Caché corrupto, regenerar
        pdfBuffer = await generateManual()
      }
    } else {
      // Caché expirado o no existe, generar nuevo
      pdfBuffer = await generateManual()
    }

    // Retornar PDF
    return new NextResponse(pdfBuffer, {
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
