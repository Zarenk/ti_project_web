/**
 * Script de testing automatizado para Fase 1 mejoras del chatbot
 * Ejecutar: npx ts-node scripts/test-chatbot-improvements.ts
 *
 * Valida las 6 mejoras implementadas:
 * 1. Normalización de caracteres repetidos
 * 2. Courtesy conversacional (frustración/confusión)
 * 3. Sinónimos UI extendidos
 * 4. Detección de patterns ambiguos
 * 5. Sección Troubleshooting (lazy loading)
 * 6. Sistema de Pre-requisitos
 */

import { normalizeRepeatedChars, autoCorrect } from '../src/data/help/fuzzy-matcher'
import { detectPrerequisitesInQuery } from '../src/data/help/prerequisites'
import { DOMAIN_SYNONYMS } from '../src/data/help/synonyms'
import { ambiguousQuestionPatterns } from '../src/data/help/advanced-patterns'
import { courtesySection } from '../src/data/help/sections/courtesy'
import { troubleshootingSection } from '../src/data/help/sections/troubleshooting'

interface TestCase {
  name: string
  input: string
  expected: any
  actual?: any
  passed?: boolean
  details?: string
}

const tests: TestCase[] = []

function logTest(emoji: string, message: string) {
  console.log(`${emoji} ${message}`)
}

function addTest(test: TestCase) {
  tests.push(test)
  return test
}

// ========== TEST 1: Normalización de caracteres ==========
console.log('\n═══════════════════════════════════════════════════════')
console.log('🧪 TEST 1: Normalización de caracteres repetidos')
console.log('═══════════════════════════════════════════════════════\n')

const normalizationTests = [
  { input: 'ayudaaaa', expected: 'ayuda' },
  { input: 'urgenteeee', expected: 'urgente' },
  { input: 'holaaaaa', expected: 'hola' },
  { input: 'graciassss', expected: 'gracias' },
  { input: 'inventariooooo', expected: 'inventario' },
  { input: 'ventaaaa', expected: 'venta' },
  { input: 'productooo stockkk', expected: 'producto stock' },
  { input: 'nooo entiendooo', expected: 'no entiendo' },
]

normalizationTests.forEach((t) => {
  const actual = normalizeRepeatedChars(t.input)
  const passed = actual === t.expected
  addTest({
    name: `Normalize "${t.input}"`,
    input: t.input,
    expected: t.expected,
    actual,
    passed,
  })
  logTest(passed ? '✅' : '❌', `"${t.input}" → "${actual}" (expected: "${t.expected}")`)
})

// ========== TEST 2: Autocorrect con normalización ==========
console.log('\n═══════════════════════════════════════════════════════')
console.log('🧪 TEST 2: Autocorrect integrado con normalización')
console.log('═══════════════════════════════════════════════════════\n')

const autocorrectTests = [
  { input: 'ventaaa', shouldCorrect: false, reason: 'Ya normalizado, no hay typo' },
  { input: 'imventario', shouldCorrect: true, reason: 'Typo: inventario' },
  { input: 'produucto', shouldCorrect: true, reason: 'Typo: producto' },
  { input: 'cotisacion', shouldCorrect: true, reason: 'Typo: cotización' },
]

autocorrectTests.forEach((t) => {
  const result = autoCorrect(t.input)
  const passed = result.changed === t.shouldCorrect
  addTest({
    name: `Autocorrect "${t.input}"`,
    input: t.input,
    expected: t.shouldCorrect,
    actual: result.changed,
    passed,
    details: `${t.reason}. Corrected to: "${result.corrected}"`,
  })
  logTest(
    passed ? '✅' : '❌',
    `"${t.input}" → changed: ${result.changed}, corrected: "${result.corrected}" (expected change: ${t.shouldCorrect})`
  )
})

// ========== TEST 3: Courtesy Entries (nuevas) ==========
console.log('\n═══════════════════════════════════════════════════════')
console.log('🧪 TEST 3: Courtesy conversacional (frustración/confusión)')
console.log('═══════════════════════════════════════════════════════\n')

const expectedCourtesyIds = [
  'courtesy-confusion',
  'courtesy-negative-feedback',
  'courtesy-human-contact',
]

expectedCourtesyIds.forEach((expectedId) => {
  const entry = courtesySection.entries.find((e) => e.id === expectedId)
  const passed = !!entry
  addTest({
    name: `Courtesy entry "${expectedId}" exists`,
    input: expectedId,
    expected: true,
    actual: passed,
    passed,
    details: entry ? `${entry.aliases.length} aliases, answer length: ${entry.answer.length} chars` : 'Not found',
  })
  logTest(passed ? '✅' : '❌', `Entry "${expectedId}" exists: ${passed}`)
})

// Verificar aliases específicos
const courtesyAliasTests = [
  { entryId: 'courtesy-confusion', alias: 'no entiendo' },
  { entryId: 'courtesy-negative-feedback', alias: 'no me sirve' },
  { entryId: 'courtesy-human-contact', alias: 'quiero hablar con alguien' },
]

courtesyAliasTests.forEach((t) => {
  const entry = courtesySection.entries.find((e) => e.id === t.entryId)
  const hasAlias = entry?.aliases.includes(t.alias) ?? false
  const passed = hasAlias
  addTest({
    name: `Alias "${t.alias}" in ${t.entryId}`,
    input: t.alias,
    expected: true,
    actual: hasAlias,
    passed,
  })
  logTest(passed ? '✅' : '❌', `"${t.alias}" is in ${t.entryId}: ${hasAlias}`)
})

// ========== TEST 4: Sinónimos UI ==========
console.log('\n═══════════════════════════════════════════════════════')
console.log('🧪 TEST 4: Sinónimos UI extendidos')
console.log('═══════════════════════════════════════════════════════\n')

const synonymTests = [
  { term: 'boton', shouldExist: true },
  { term: 'icono', shouldExist: true },
  { term: 'menu', shouldExist: true },
  { term: 'pestana', shouldExist: true },
  { term: 'ventana', shouldExist: true },
  { term: 'mouse', shouldExist: true },
  { term: 'printear', shouldExist: true },
  { term: 'loguear', shouldExist: true },
  { term: 'loading', shouldExist: true },
  { term: 'cachear', shouldExist: true },
]

synonymTests.forEach((t) => {
  const exists = t.term in DOMAIN_SYNONYMS
  const synonyms = exists ? DOMAIN_SYNONYMS[t.term as keyof typeof DOMAIN_SYNONYMS] : []
  const passed = exists === t.shouldExist
  addTest({
    name: `Synonym "${t.term}"`,
    input: t.term,
    expected: t.shouldExist,
    actual: exists,
    passed,
    details: exists ? `Synonyms: ${synonyms.join(', ')}` : 'Not found',
  })
  logTest(passed ? '✅' : '❌', `"${t.term}" exists: ${exists} ${exists ? `(${synonyms.join(', ')})` : ''}`)
})

// ========== TEST 5: Patterns Ambiguos ==========
console.log('\n═══════════════════════════════════════════════════════')
console.log('🧪 TEST 5: Detección de patterns ambiguos')
console.log('═══════════════════════════════════════════════════════\n')

const ambiguousTests = [
  { query: 'como lo hago', shouldBeAmbiguous: true },
  { query: 'como la uso', shouldBeAmbiguous: true },
  { query: 'esto que es', shouldBeAmbiguous: true },
  { query: 'eso que hace', shouldBeAmbiguous: true },
  { query: 'esta mal', shouldBeAmbiguous: true },
  { query: 'no funciona', shouldBeAmbiguous: true },
  { query: 'no me sale', shouldBeAmbiguous: true },
  { query: 'me da error', shouldBeAmbiguous: true },
  { query: 'como crear un producto', shouldBeAmbiguous: false }, // Claro
  { query: 'como hacer una venta', shouldBeAmbiguous: false }, // Claro
]

ambiguousTests.forEach((t) => {
  const matchedPattern = ambiguousQuestionPatterns.find((p) => p.pattern.test(t.query))
  const isAmbiguous = !!matchedPattern
  const passed = isAmbiguous === t.shouldBeAmbiguous
  addTest({
    name: `Ambiguous "${t.query}"`,
    input: t.query,
    expected: t.shouldBeAmbiguous,
    actual: isAmbiguous,
    passed,
    details: matchedPattern ? `Pattern matched: ${matchedPattern.pattern}` : 'No pattern matched',
  })
  logTest(passed ? '✅' : '❌', `"${t.query}" → ambiguous: ${isAmbiguous} (expected: ${t.shouldBeAmbiguous})`)
})

// ========== TEST 6: Troubleshooting Section ==========
console.log('\n═══════════════════════════════════════════════════════')
console.log('🧪 TEST 6: Sección Troubleshooting')
console.log('═══════════════════════════════════════════════════════\n')

const expectedTroubleshootingIds = [
  'error-no-stock',
  'product-not-found',
  'product-not-in-pdf',
  'save-error',
  'permission-denied',
  'slow-system',
  'cant-delete',
  'logout-unexpected',
  'print-not-working',
  'forgot-password',
]

expectedTroubleshootingIds.forEach((expectedId) => {
  const entry = troubleshootingSection.entries.find((e) => e.id === expectedId)
  const passed = !!entry
  addTest({
    name: `Troubleshooting entry "${expectedId}" exists`,
    input: expectedId,
    expected: true,
    actual: passed,
    passed,
    details: entry
      ? `${entry.aliases.length} aliases, ${entry.steps?.length || 0} steps, answer length: ${entry.answer.length} chars`
      : 'Not found',
  })
  logTest(passed ? '✅' : '❌', `Entry "${expectedId}" exists: ${passed}`)
})

// Verificar que troubleshooting section tiene metadata correcta
const troubleshootingMetaTest = {
  name: 'Troubleshooting section metadata',
  input: 'troubleshooting',
  expected: { id: 'troubleshooting', label: 'Resolución de Problemas' },
  actual: { id: troubleshootingSection.id, label: troubleshootingSection.label },
  passed: troubleshootingSection.id === 'troubleshooting' && troubleshootingSection.label === 'Resolución de Problemas',
}
addTest(troubleshootingMetaTest)
logTest(
  troubleshootingMetaTest.passed ? '✅' : '❌',
  `Section metadata correct: ${troubleshootingMetaTest.passed}`
)

// ========== TEST 7: Prerequisites ==========
console.log('\n═══════════════════════════════════════════════════════')
console.log('🧪 TEST 7: Detección de pre-requisitos')
console.log('═══════════════════════════════════════════════════════\n')

const prereqTests = [
  { query: 'como hago una venta', expectedAction: 'sales-new' },
  { query: 'quiero hacer mi primera venta', expectedAction: 'sales-new' },
  { query: 'quiero registrar una entrada', expectedAction: 'entries-new' },
  { query: 'como creo una entrada', expectedAction: 'entries-new' },
  { query: 'como hago una cotización', expectedAction: 'quotes-new' },
  { query: 'quiero generar una cotización', expectedAction: 'quotes-new' },
  { query: 'quiero transferir productos', expectedAction: 'inventory-transfer' },
  { query: 'como genero el catálogo', expectedAction: 'catalog-create' },
  { query: 'como veo reportes de ventas', expectedAction: 'reports-sales' },
  { query: 'como crear un producto', expectedAction: null }, // No requiere prerequisite
  { query: 'ayudame con el inventario', expectedAction: null }, // No requiere prerequisite
]

prereqTests.forEach((t) => {
  const prereq = detectPrerequisitesInQuery(t.query)
  const actual = prereq?.actionId || null
  const passed = actual === t.expectedAction
  addTest({
    name: `Prerequisite "${t.query}"`,
    input: t.query,
    expected: t.expectedAction,
    actual,
    passed,
    details: prereq ? `Requires: ${prereq.requires.join(', ')}, Message: "${prereq.message.substring(0, 50)}..."` : 'No prerequisite',
  })
  logTest(passed ? '✅' : '❌', `"${t.query}" → action: ${actual} (expected: ${t.expectedAction})`)
})

// ========== RESUMEN ==========
console.log('\n═══════════════════════════════════════════════════════')
console.log('📊 RESUMEN DE TESTS')
console.log('═══════════════════════════════════════════════════════\n')

const totalTests = tests.length
const passedTests = tests.filter((t) => t.passed).length
const failedTests = totalTests - passedTests
const successRate = ((passedTests / totalTests) * 100).toFixed(1)

console.log(`Total tests:    ${totalTests}`)
console.log(`✅ Passed:      ${passedTests}`)
console.log(`❌ Failed:      ${failedTests}`)
console.log(`Success rate:   ${successRate}%`)

// Desglose por categoría
const categories = [
  { name: 'Normalización', tests: tests.slice(0, 8) },
  { name: 'Autocorrect', tests: tests.slice(8, 12) },
  { name: 'Courtesy', tests: tests.slice(12, 18) },
  { name: 'Sinónimos', tests: tests.slice(18, 28) },
  { name: 'Patterns Ambiguos', tests: tests.slice(28, 38) },
  { name: 'Troubleshooting', tests: tests.slice(38, 50) },
  { name: 'Prerequisites', tests: tests.slice(50) },
]

console.log('\n📈 DESGLOSE POR CATEGORÍA:\n')
categories.forEach((cat) => {
  const catPassed = cat.tests.filter((t) => t.passed).length
  const catTotal = cat.tests.length
  const catRate = ((catPassed / catTotal) * 100).toFixed(0)
  const statusEmoji = catRate === '100' ? '✅' : catRate >= '80' ? '⚠️' : '❌'
  console.log(`  ${statusEmoji} ${cat.name.padEnd(20)} ${catPassed}/${catTotal} (${catRate}%)`)
})

if (failedTests > 0) {
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('❌ TESTS FALLIDOS - DETALLES')
  console.log('═══════════════════════════════════════════════════════\n')

  tests
    .filter((t) => !t.passed)
    .forEach((t, idx) => {
      console.log(`${idx + 1}. ${t.name}`)
      console.log(`   Input:    ${t.input}`)
      console.log(`   Expected: ${JSON.stringify(t.expected)}`)
      console.log(`   Actual:   ${JSON.stringify(t.actual)}`)
      if (t.details) {
        console.log(`   Details:  ${t.details}`)
      }
      console.log('')
    })
} else {
  console.log('\n🎉 TODOS LOS TESTS PASARON!')
  console.log('\n✅ Las 6 mejoras de Fase 1 están funcionando correctamente.')
  console.log('✅ El sistema está listo para avanzar a Fase 2.')
}

console.log('\n═══════════════════════════════════════════════════════')
console.log(`🏁 Testing completado - Exit code: ${failedTests > 0 ? 1 : 0}`)
console.log('═══════════════════════════════════════════════════════\n')

// Exit code
process.exit(failedTests > 0 ? 1 : 0)
