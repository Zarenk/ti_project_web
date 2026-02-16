#!/usr/bin/env node
/**
 * Script para ejecutar y reportar pruebas de las nuevas secciones del chatbot
 *
 * Uso: node scripts/test-new-sections.mjs
 */

import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

console.log('🧪 ===== EJECUTANDO PRUEBAS DE NUEVAS SECCIONES =====\n')

// Colores para consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${msg}${colors.reset}`)
}

// Verificaciones estáticas
log.header('📋 FASE 1: Verificaciones Estáticas')

const checks = []

try {
  log.info('Verificando archivos creados...')

  const files = [
    'fronted/src/data/help/sections/settings.ts',
    'fronted/src/data/help/sections/public-store.ts',
    'fronted/src/data/help/__tests__/new-sections.test.ts',
  ]

  files.forEach(file => {
    const fullPath = join(projectRoot, file)
    try {
      execSync(`test -f "${fullPath}"`, { stdio: 'ignore' })
      log.success(`Archivo existe: ${file}`)
      checks.push({ name: `Archivo ${file}`, passed: true })
    } catch {
      log.error(`Archivo NO existe: ${file}`)
      checks.push({ name: `Archivo ${file}`, passed: false })
    }
  })
} catch (error) {
  log.error(`Error en verificación de archivos: ${error.message}`)
}

// Contar entradas en las nuevas secciones
log.header('📊 FASE 2: Análisis de Contenido')

try {
  log.info('Contando entradas en settings.ts...')

  const settingsContent = execSync(
    `grep -c '"id":' "${join(projectRoot, 'fronted/src/data/help/sections/settings.ts')}" || echo 0`,
    { encoding: 'utf-8' }
  ).trim()

  const settingsCount = parseInt(settingsContent) || 0
  log.info(`Settings tiene ${settingsCount} entradas`)

  if (settingsCount >= 14) {
    log.success(`Settings: ${settingsCount}/14 entradas ✓`)
    checks.push({ name: 'Settings entries >= 14', passed: true, value: settingsCount })
  } else {
    log.warn(`Settings: ${settingsCount}/14 entradas (esperadas al menos 14)`)
    checks.push({ name: 'Settings entries >= 14', passed: false, value: settingsCount })
  }
} catch (error) {
  log.warn('No se pudo contar entradas de settings')
}

try {
  log.info('Contando entradas en public-store.ts...')

  const storeContent = execSync(
    `grep -c '"id":' "${join(projectRoot, 'fronted/src/data/help/sections/public-store.ts')}" || echo 0`,
    { encoding: 'utf-8' }
  ).trim()

  const storeCount = parseInt(storeContent) || 0
  log.info(`Public Store tiene ${storeCount} entradas`)

  if (storeCount >= 13) {
    log.success(`Public Store: ${storeCount}/13 entradas ✓`)
    checks.push({ name: 'Public Store entries >= 13', passed: true, value: storeCount })
  } else {
    log.warn(`Public Store: ${storeCount}/13 entradas (esperadas al menos 13)`)
    checks.push({ name: 'Public Store entries >= 13', passed: false, value: storeCount })
  }
} catch (error) {
  log.warn('No se pudo contar entradas de public-store')
}

// Verificar imports en index.ts
log.header('🔗 FASE 3: Verificación de Integración')

try {
  log.info('Verificando imports en index.ts...')

  const indexPath = join(projectRoot, 'fronted/src/data/help/index.ts')

  const hasSettingsImport = execSync(
    `grep -q "import.*settingsSection" "${indexPath}" && echo "true" || echo "false"`,
    { encoding: 'utf-8' }
  ).trim()

  const hasStoreImport = execSync(
    `grep -q "import.*publicStoreSection" "${indexPath}" && echo "true" || echo "false"`,
    { encoding: 'utf-8' }
  ).trim()

  if (hasSettingsImport === 'true') {
    log.success('settingsSection importado en index.ts')
    checks.push({ name: 'Settings import', passed: true })
  } else {
    log.error('settingsSection NO importado en index.ts')
    checks.push({ name: 'Settings import', passed: false })
  }

  if (hasStoreImport === 'true') {
    log.success('publicStoreSection importado en index.ts')
    checks.push({ name: 'Public Store import', passed: true })
  } else {
    log.error('publicStoreSection NO importado en index.ts')
    checks.push({ name: 'Public Store import', passed: false })
  }
} catch (error) {
  log.warn('No se pudo verificar imports')
}

// Verificar route mappings
try {
  log.info('Verificando route mappings...')

  const routeDetectionPath = join(projectRoot, 'fronted/src/data/help/route-detection.ts')

  const hasOptionsRoute = execSync(
    `grep -q "'/dashboard/options': 'settings'" "${routeDetectionPath}" && echo "true" || echo "false"`,
    { encoding: 'utf-8' }
  ).trim()

  const hasStoreRoute = execSync(
    `grep -q "'/store': 'public-store'" "${routeDetectionPath}" && echo "true" || echo "false"`,
    { encoding: 'utf-8' }
  ).trim()

  if (hasOptionsRoute === 'true') {
    log.success('/dashboard/options → settings mapeado')
    checks.push({ name: '/dashboard/options route', passed: true })
  } else {
    log.error('/dashboard/options NO mapeado')
    checks.push({ name: '/dashboard/options route', passed: false })
  }

  if (hasStoreRoute === 'true') {
    log.success('/store → public-store mapeado')
    checks.push({ name: '/store route', passed: true })
  } else {
    log.error('/store NO mapeado')
    checks.push({ name: '/store route', passed: false })
  }
} catch (error) {
  log.warn('No se pudo verificar route mappings')
}

// Verificar tooltip en HelpMascot.tsx
try {
  log.info('Verificando tooltip en HelpMascot.tsx...')

  const mascotPath = join(projectRoot, 'fronted/src/components/help/HelpMascot.tsx')

  const hasTooltipImport = execSync(
    `grep -q "import.*Tooltip" "${mascotPath}" && echo "true" || echo "false"`,
    { encoding: 'utf-8' }
  ).trim()

  const hasTooltipUsage = execSync(
    `grep -q "<Tooltip>" "${mascotPath}" && echo "true" || echo "false"`,
    { encoding: 'utf-8' }
  ).trim()

  if (hasTooltipImport === 'true' && hasTooltipUsage === 'true') {
    log.success('Tooltip integrado en HelpMascot.tsx')
    checks.push({ name: 'Tooltip integration', passed: true })
  } else {
    log.error('Tooltip NO integrado correctamente')
    checks.push({ name: 'Tooltip integration', passed: false })
  }
} catch (error) {
  log.warn('No se pudo verificar tooltip')
}

// Generar reporte
log.header('📈 FASE 4: Generando Reporte')

const passedChecks = checks.filter(c => c.passed).length
const totalChecks = checks.length
const passRate = Math.round((passedChecks / totalChecks) * 100)

console.log('\n' + '='.repeat(70))
console.log(`${colors.bold}REPORTE DE VERIFICACIÓN${colors.reset}`)
console.log('='.repeat(70))
console.log(`Total de Verificaciones: ${totalChecks}`)
console.log(`Pasadas: ${colors.green}${passedChecks}${colors.reset}`)
console.log(`Falladas: ${colors.red}${totalChecks - passedChecks}${colors.reset}`)
console.log(`Tasa de Éxito: ${passRate >= 90 ? colors.green : passRate >= 70 ? colors.yellow : colors.red}${passRate}%${colors.reset}`)
console.log('='.repeat(70))

// Detalles de las verificaciones
console.log(`\n${colors.bold}Detalles:${colors.reset}`)
checks.forEach((check, idx) => {
  const status = check.passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`
  const value = check.value !== undefined ? ` (${check.value})` : ''
  console.log(`  ${idx + 1}. ${status} - ${check.name}${value}`)
})

// Recomendaciones
const failedChecks = checks.filter(c => !c.passed)
if (passRate < 100) {
  console.log(`\n${colors.yellow}⚠ RECOMENDACIONES:${colors.reset}`)

  failedChecks.forEach(check => {
    console.log(`  • Revisar: ${check.name}`)
  })
}

// Próximos pasos
console.log(`\n${colors.bold}📋 PRÓXIMOS PASOS:${colors.reset}`)
console.log(`  1. Revisar la guía de pruebas: docs/PRUEBAS_NUEVAS_SECCIONES.md`)
console.log(`  2. Ejecutar tests automatizados (cuando Jest esté configurado):`)
console.log(`     ${colors.blue}cd fronted && npm test -- new-sections.test.ts${colors.reset}`)
console.log(`  3. Realizar pruebas manuales del tooltip y detección de secciones`)
console.log(`  4. Verificar en navegador que el chatbot responde correctamente`)

// Guardar reporte en archivo
const reportPath = join(projectRoot, 'docs', 'REPORTE_VERIFICACION_NUEVAS_SECCIONES.md')

const mdReport = `# 📊 Reporte de Verificación - Nuevas Secciones

**Fecha:** ${new Date().toLocaleDateString('es-ES')}
**Hora:** ${new Date().toLocaleTimeString('es-ES')}

## Resumen

- **Total de Verificaciones:** ${totalChecks}
- **Pasadas:** ${passedChecks} ✓
- **Falladas:** ${totalChecks - passedChecks} ✗
- **Tasa de Éxito:** ${passRate}%

## Resultados Detallados

${checks.map((check, idx) => {
  const status = check.passed ? '✅' : '❌'
  const value = check.value !== undefined ? ` (\`${check.value}\`)` : ''
  return `${idx + 1}. ${status} **${check.name}**${value}`
}).join('\n')}

## Estado General

${passRate >= 90 ? '✅ **EXCELENTE** - Todas las verificaciones pasaron o casi todas.' :
  passRate >= 70 ? '⚠️ **ACEPTABLE** - La mayoría de verificaciones pasaron, pero hay áreas de mejora.' :
  '❌ **REQUIERE ATENCIÓN** - Varias verificaciones fallaron. Revisar implementación.'}

${passRate < 100 ? `## Verificaciones Fallidas

${checks.filter(c => !c.passed).map(check => `- ❌ ${check.name}`).join('\n')}

## Recomendaciones

${failedChecks.map(check => `- Revisar y corregir: **${check.name}**`).join('\n')}
` : '## ✅ Todas las Verificaciones Pasaron\n\nExcelente trabajo! Todas las verificaciones estáticas pasaron correctamente.'}

## Próximos Pasos

1. ✅ Verificaciones estáticas completadas
2. ⏭️ Ejecutar tests automatizados con Jest
3. ⏭️ Pruebas manuales del tooltip
4. ⏭️ Pruebas manuales de detección de secciones
5. ⏭️ Pruebas de integración en navegador

---

**Generado por:** test-new-sections.mjs
**Versión:** 1.0.0
`

writeFileSync(reportPath, mdReport, 'utf-8')
log.success(`Reporte guardado: docs/REPORTE_VERIFICACION_NUEVAS_SECCIONES.md`)

// Código de salida
console.log('')
if (passRate >= 90) {
  log.success('Verificación completada exitosamente!')
  process.exit(0)
} else if (passRate >= 70) {
  log.warn('Verificación completada con advertencias')
  process.exit(0)
} else {
  log.error('Verificación completada con errores')
  process.exit(1)
}
