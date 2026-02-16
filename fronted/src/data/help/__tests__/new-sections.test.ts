/**
 * Tests para las nuevas secciones: Settings y Public Store
 * Verifica que el conocimiento del chatbot está completo y funcional
 */

import { describe, test, expect } from '@jest/globals'
import { HELP_SECTIONS, allHelpEntries, resolveSection } from '../index'
import { detectCurrentSection, getSectionDisplayName, getContextualSuggestions } from '../route-detection'
import { findMatchingEntries } from '../enhanced-matcher'
import { validateQuery, generateSectionExplanation, isSectionQuestion } from '../query-validation'

describe('🆕 New Sections - Settings & Public Store', () => {

  describe('📋 Section Registration', () => {
    test('Settings section should be registered', () => {
      const settingsSection = HELP_SECTIONS.find(s => s.id === 'settings')
      expect(settingsSection).toBeDefined()
      expect(settingsSection?.label).toBe('Configuración del Sistema')
      expect(settingsSection?.entries.length).toBeGreaterThan(10)
    })

    test('Public Store section should be registered', () => {
      const storeSection = HELP_SECTIONS.find(s => s.id === 'public-store')
      expect(storeSection).toBeDefined()
      expect(storeSection?.label).toBe('Tienda en Línea')
      expect(storeSection?.entries.length).toBeGreaterThan(10)
    })

    test('All new entries should be in allHelpEntries', () => {
      const settingsEntries = allHelpEntries.filter(e => e.section === 'settings')
      const storeEntries = allHelpEntries.filter(e => e.section === 'public-store')

      expect(settingsEntries.length).toBeGreaterThan(10)
      expect(storeEntries.length).toBeGreaterThan(10)
    })
  })

  describe('🗺️ Route Detection', () => {
    test('/dashboard/options should map to settings', () => {
      const section = resolveSection('/dashboard/options')
      expect(section).toBe('settings')
    })

    test('/store should map to public-store', () => {
      const section = resolveSection('/store')
      expect(section).toBe('public-store')
    })

    test('/cart should map to public-store', () => {
      const section = resolveSection('/cart')
      expect(section).toBe('public-store')
    })

    test('detectCurrentSection should work for /dashboard/options', () => {
      const context = detectCurrentSection('/dashboard/options')
      expect(context.section).toBe('settings')
      expect(context.breadcrumb).toContain('Dashboard')
      expect(context.breadcrumb).toContain('Options')
    })

    test('detectCurrentSection should work for /store', () => {
      const context = detectCurrentSection('/store')
      expect(context.section).toBe('public-store')
    })

    test('getSectionDisplayName should return friendly names', () => {
      expect(getSectionDisplayName('settings')).toBe('Configuración')
      expect(getSectionDisplayName('public-store')).toBe('Tienda en Línea')
    })
  })

  describe('💬 Settings Section - Query Matching', () => {
    const settingsEntries = allHelpEntries.filter(e => e.section === 'settings')

    test('Should find entry about company configuration', () => {
      const results = findMatchingEntries('cómo configuro mi empresa', settingsEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('settings-company')
      expect(results[0].score).toBeGreaterThan(0.7)
    })

    test('Should find entry about logo change', () => {
      const results = findMatchingEntries('cómo cambio el logo', settingsEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('settings-logo')
      expect(results[0].score).toBeGreaterThan(0.7)
    })

    test('Should find entry about theme/dark mode', () => {
      const results = findMatchingEntries('modo oscuro', settingsEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('settings-theme')
    })

    test('Should find entry about backups', () => {
      const results = findMatchingEntries('cómo hago un respaldo', settingsEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('settings-backup')
      expect(results[0].score).toBeGreaterThan(0.7)
    })

    test('Should find entry about restore', () => {
      const results = findMatchingEntries('restaurar backup', settingsEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('settings-restore')
    })

    test('Should find entry about electronic invoicing', () => {
      const results = findMatchingEntries('facturación electrónica', settingsEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('settings-invoice')
    })

    test('Should find entry about printer configuration', () => {
      const results = findMatchingEntries('configurar impresora', settingsEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('settings-printer')
    })

    test('Should find entry about currency', () => {
      const results = findMatchingEntries('cambiar moneda', settingsEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('settings-currency')
    })

    test('Should find entry about tax configuration', () => {
      const results = findMatchingEntries('configurar impuestos', settingsEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('settings-tax')
    })

    test('Should handle typos with fuzzy matching', () => {
      const results = findMatchingEntries('konfigurar inpresora', settingsEntries)
      expect(results.length).toBeGreaterThan(0)
      // Should still find printer config despite typos
    })
  })

  describe('🛒 Public Store Section - Query Matching', () => {
    const storeEntries = allHelpEntries.filter(e => e.section === 'public-store')

    test('Should find entry about browsing products', () => {
      const results = findMatchingEntries('cómo veo los productos', storeEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('store-browse')
    })

    test('Should find entry about search', () => {
      const results = findMatchingEntries('cómo busco un producto', storeEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('store-search')
      expect(results[0].score).toBeGreaterThan(0.7)
    })

    test('Should find entry about filters', () => {
      const results = findMatchingEntries('filtrar por precio', storeEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('store-filter')
    })

    test('Should find entry about product details', () => {
      const results = findMatchingEntries('ver detalles del producto', storeEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('store-product-details')
    })

    test('Should find entry about shopping cart', () => {
      const results = findMatchingEntries('cómo funciona el carrito', storeEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('store-cart')
      expect(results[0].score).toBeGreaterThan(0.7)
    })

    test('Should find entry about stock availability', () => {
      const results = findMatchingEntries('hay stock disponible', storeEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('store-stock')
    })

    test('Should find entry about prices and taxes', () => {
      const results = findMatchingEntries('precio incluye impuestos', storeEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('store-prices')
    })

    test('Should find entry about favorites', () => {
      const results = findMatchingEntries('guardar productos favoritos', storeEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('store-favorites')
    })

    test('Should find entry about payment methods', () => {
      const results = findMatchingEntries('métodos de pago', storeEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('store-payment-methods')
    })

    test('Should find entry about delivery', () => {
      const results = findMatchingEntries('envío a domicilio', storeEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('store-delivery')
    })

    test('Should handle customer-oriented language', () => {
      const results = findMatchingEntries('cómo compro', storeEntries)
      expect(results.length).toBeGreaterThan(0)
      // Should find cart or checkout related entries
    })
  })

  describe('🎯 Contextual Suggestions', () => {
    test('Settings section should have contextual suggestions', () => {
      const suggestions = getContextualSuggestions('settings')
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions).toContain('¿Cómo configuro la empresa?')
      expect(suggestions).toContain('¿Dónde cambio el logo?')
      expect(suggestions).toContain('¿Cómo activo la facturación electrónica?')
    })

    test('Public Store section should have contextual suggestions', () => {
      const suggestions = getContextualSuggestions('public-store')
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions).toContain('¿Cómo busco un producto?')
      expect(suggestions).toContain('¿Cómo filtro por categoría o precio?')
      expect(suggestions).toContain('¿Cómo funciona el carrito de compras?')
    })
  })

  describe('📝 Section Explanations', () => {
    test('Should generate explanation for settings section', () => {
      const explanation = generateSectionExplanation('settings')
      expect(explanation).toContain('Configuración')
      expect(explanation).toContain('empresa')
      expect(explanation.length).toBeGreaterThan(50)
    })

    test('Should generate explanation for public-store section', () => {
      const explanation = generateSectionExplanation('public-store')
      expect(explanation).toContain('Tienda en Línea')
      expect(explanation).toContain('productos')
      expect(explanation).toContain('carrito')
      expect(explanation.length).toBeGreaterThan(50)
    })

    test('Should detect section questions', () => {
      expect(isSectionQuestion('qué hace esta sección')).toBe(true)
      expect(isSectionQuestion('para qué sirve esta parte')).toBe(true)
      expect(isSectionQuestion('dónde estoy')).toBe(true)
      expect(isSectionQuestion('qué puedo hacer aquí')).toBe(true)
    })
  })

  describe('✅ Query Validation', () => {
    test('Settings queries should be valid', () => {
      const validation1 = validateQuery('cómo configuro la empresa')
      expect(validation1.isValid).toBe(true)

      const validation2 = validateQuery('cambiar el logo')
      expect(validation2.isValid).toBe(true)

      const validation3 = validateQuery('respaldo de datos')
      expect(validation3.isValid).toBe(true)
    })

    test('Store queries should be valid', () => {
      const validation1 = validateQuery('cómo busco productos')
      expect(validation1.isValid).toBe(true)

      const validation2 = validateQuery('agregar al carrito')
      expect(validation2.isValid).toBe(true)

      const validation3 = validateQuery('métodos de pago')
      expect(validation3.isValid).toBe(true)
    })
  })

  describe('📊 Coverage Analysis', () => {
    test('Settings section should have comprehensive coverage', () => {
      const settingsSection = HELP_SECTIONS.find(s => s.id === 'settings')
      expect(settingsSection).toBeDefined()

      const topics = settingsSection!.entries.map(e => e.id)

      // Verificar que cubre los temas principales
      expect(topics).toContain('settings-company')
      expect(topics).toContain('settings-logo')
      expect(topics).toContain('settings-theme')
      expect(topics).toContain('settings-backup')
      expect(topics).toContain('settings-restore')
      expect(topics).toContain('settings-invoice')
      expect(topics).toContain('settings-printer')
      expect(topics).toContain('settings-currency')
      expect(topics).toContain('settings-tax')
      expect(topics).toContain('settings-reset')
    })

    test('Public Store section should have comprehensive coverage', () => {
      const storeSection = HELP_SECTIONS.find(s => s.id === 'public-store')
      expect(storeSection).toBeDefined()

      const topics = storeSection!.entries.map(e => e.id)

      // Verificar que cubre el flujo completo de compra
      expect(topics).toContain('store-browse')
      expect(topics).toContain('store-search')
      expect(topics).toContain('store-filter')
      expect(topics).toContain('store-product-details')
      expect(topics).toContain('store-cart')
      expect(topics).toContain('store-stock')
      expect(topics).toContain('store-payment-methods')
      expect(topics).toContain('store-delivery')
    })

    test('Each entry should have required fields', () => {
      const settingsEntries = allHelpEntries.filter(e => e.section === 'settings')
      const storeEntries = allHelpEntries.filter(e => e.section === 'public-store')

      const allNewEntries = [...settingsEntries, ...storeEntries]

      allNewEntries.forEach(entry => {
        expect(entry.id).toBeTruthy()
        expect(entry.question).toBeTruthy()
        expect(entry.answer).toBeTruthy()
        expect(entry.keywords).toBeDefined()
        expect(Array.isArray(entry.keywords)).toBe(true)
        expect(entry.section).toBeTruthy()
        expect(['settings', 'public-store']).toContain(entry.section!)
      })
    })

    test('Entries should have aliases for better matching', () => {
      const settingsEntries = allHelpEntries.filter(e => e.section === 'settings')
      const storeEntries = allHelpEntries.filter(e => e.section === 'public-store')

      const allNewEntries = [...settingsEntries, ...storeEntries]

      const entriesWithAliases = allNewEntries.filter(e => e.aliases && e.aliases.length > 0)

      // Al menos el 80% de las entradas deberían tener aliases
      const aliasesRate = entriesWithAliases.length / allNewEntries.length
      expect(aliasesRate).toBeGreaterThan(0.8)
    })
  })

  describe('🔄 Integration Tests', () => {
    test('Settings section should integrate with existing help system', () => {
      const allSections = HELP_SECTIONS.map(s => s.id)
      expect(allSections).toContain('settings')

      // Verificar que no rompe otras secciones
      expect(allSections).toContain('general')
      expect(allSections).toContain('inventory')
      expect(allSections).toContain('products')
      expect(allSections).toContain('sales')
    })

    test('Public Store section should integrate with existing help system', () => {
      const allSections = HELP_SECTIONS.map(s => s.id)
      expect(allSections).toContain('public-store')

      // Verificar que no duplica stores (internal stores management)
      expect(allSections).toContain('stores')
      expect(allSections.filter(s => s.includes('store')).length).toBe(2)
    })

    test('Route mapping should not conflict', () => {
      // /dashboard/options debe mapear a settings, no a general
      expect(resolveSection('/dashboard/options')).toBe('settings')
      expect(resolveSection('/dashboard/options')).not.toBe('general')

      // /store debe mapear a public-store, no a stores
      expect(resolveSection('/store')).toBe('public-store')
      expect(resolveSection('/store')).not.toBe('stores')

      // /dashboard/stores debe seguir mapeando a stores (internal)
      expect(resolveSection('/dashboard/stores')).toBe('stores')
    })
  })

  describe('🎭 Real-World Scenarios', () => {
    test('Scenario: New admin wants to configure company', () => {
      const query = 'necesito configurar los datos de mi empresa'
      const settingsEntries = allHelpEntries.filter(e => e.section === 'settings')
      const results = findMatchingEntries(query, settingsEntries)

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('settings-company')
      expect(results[0].entry.answer).toContain('RUC')
      expect(results[0].entry.answer).toContain('dirección')
    })

    test('Scenario: Admin wants to customize branding', () => {
      const query = 'quiero personalizar el logo y los colores'
      const settingsEntries = allHelpEntries.filter(e => e.section === 'settings')
      const results = findMatchingEntries(query, settingsEntries)

      expect(results.length).toBeGreaterThan(0)
      // Should find either logo or theme entries
      expect(['settings-logo', 'settings-theme']).toContain(results[0].entry.id)
    })

    test('Scenario: Customer wants to find a product', () => {
      const query = 'cómo encuentro una laptop'
      const storeEntries = allHelpEntries.filter(e => e.section === 'public-store')
      const results = findMatchingEntries(query, storeEntries)

      expect(results.length).toBeGreaterThan(0)
      expect(['store-search', 'store-browse', 'store-filter']).toContain(results[0].entry.id)
    })

    test('Scenario: Customer wants to buy something', () => {
      const query = 'cómo compro un producto'
      const storeEntries = allHelpEntries.filter(e => e.section === 'public-store')
      const results = findMatchingEntries(query, storeEntries)

      expect(results.length).toBeGreaterThan(0)
      expect(['store-cart', 'store-payment-methods']).toContain(results[0].entry.id)
    })

    test('Scenario: Customer asks about delivery time', () => {
      const query = 'cuánto demora el envío'
      const storeEntries = allHelpEntries.filter(e => e.section === 'public-store')
      const results = findMatchingEntries(query, storeEntries)

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe('store-delivery')
    })
  })

  describe('🚀 Performance Tests', () => {
    test('Should find settings entries quickly', () => {
      const start = Date.now()
      const settingsEntries = allHelpEntries.filter(e => e.section === 'settings')
      const results = findMatchingEntries('configurar empresa', settingsEntries)
      const duration = Date.now() - start

      expect(results.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(100) // Should complete in < 100ms
    })

    test('Should find store entries quickly', () => {
      const start = Date.now()
      const storeEntries = allHelpEntries.filter(e => e.section === 'public-store')
      const results = findMatchingEntries('buscar producto', storeEntries)
      const duration = Date.now() - start

      expect(results.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(100) // Should complete in < 100ms
    })
  })
})

describe('📈 Overall System Health', () => {
  test('Total number of sections should be 20+', () => {
    expect(HELP_SECTIONS.length).toBeGreaterThanOrEqual(20)
  })

  test('Total number of help entries should be 200+', () => {
    expect(allHelpEntries.length).toBeGreaterThanOrEqual(200)
  })

  test('All entries should have unique IDs', () => {
    const ids = allHelpEntries.map(e => e.id)
    const uniqueIds = new Set(ids)
    expect(ids.length).toBe(uniqueIds.size)
  })

  test('All sections should have entries', () => {
    HELP_SECTIONS.forEach(section => {
      expect(section.entries.length).toBeGreaterThan(0)
    })
  })
})
