/**
 * Tests para el enhanced matcher y expansión de vocabulario
 *
 * Ejecutar: npm test enhanced-matcher
 */

import { findMatchingEntries, normalizeText } from "../enhanced-matcher"
import { allHelpEntries } from "../index"

describe("Enhanced Matcher - Expansión de Vocabulario", () => {
  describe("Coincidencias exactas", () => {
    it("debe encontrar 'Como registro una nueva venta'", () => {
      const results = findMatchingEntries(
        "Como registro una nueva venta",
        allHelpEntries,
      )
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe("sales-new")
      expect(results[0].score).toBeGreaterThan(0.8)
    })
  })

  describe("Variaciones coloquiales", () => {
    it("debe entender 'como vendo algo'", () => {
      const results = findMatchingEntries("como vendo algo", allHelpEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe("sales-new")
      expect(results[0].matchType).toMatch(/alias|keyword|intent/)
    })

    it("debe entender 'necesito facturar'", () => {
      const results = findMatchingEntries("necesito facturar", allHelpEntries)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe("sales-new")
    })

    it("debe entender 'quiero cobrar a un cliente'", () => {
      const results = findMatchingEntries(
        "quiero cobrar a un cliente",
        allHelpEntries,
      )
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].entry.id).toBe("sales-new")
    })
  })

  describe("Términos regionales (Perú)", () => {
    it("debe entender 'como saco una boleta'", () => {
      const results = findMatchingEntries("como saco una boleta", allHelpEntries)
      expect(results.length).toBeGreaterThan(0)
      // Debería relacionarse con ventas
      const salesRelated = results.some((r) => r.entry.id.startsWith("sales"))
      expect(salesRelated).toBe(true)
    })

    it("debe entender 'emitir comprobante'", () => {
      const results = findMatchingEntries("emitir comprobante", allHelpEntries)
      expect(results.length).toBeGreaterThan(0)
      const salesRelated = results.some((r) => r.entry.id.startsWith("sales"))
      expect(salesRelated).toBe(true)
    })
  })

  describe("Preguntas con errores ortográficos", () => {
    it("debe tolerar 'como ago una venta' (sin h)", () => {
      const results = findMatchingEntries("como ago una venta", allHelpEntries)
      expect(results.length).toBeGreaterThan(0)
      // Fuzzy matching debería encontrar algo
      expect(results[0].score).toBeGreaterThan(0.5)
    })
  })

  describe("Búsqueda por keywords", () => {
    it("debe encontrar por keyword 'inventario'", () => {
      const results = findMatchingEntries("inventario", allHelpEntries)
      expect(results.length).toBeGreaterThan(0)
      const inventoryRelated = results.some((r) =>
        r.entry.id.startsWith("inventory"),
      )
      expect(inventoryRelated).toBe(true)
    })

    it("debe encontrar por keyword 'stock'", () => {
      const results = findMatchingEntries("stock", allHelpEntries)
      expect(results.length).toBeGreaterThan(0)
      const inventoryRelated = results.some((r) =>
        r.entry.id.startsWith("inventory"),
      )
      expect(inventoryRelated).toBe(true)
    })

    it("debe encontrar por keyword 'producto'", () => {
      const results = findMatchingEntries("producto", allHelpEntries)
      expect(results.length).toBeGreaterThan(0)
      const productRelated = results.some((r) =>
        r.entry.id.startsWith("products"),
      )
      expect(productRelated).toBe(true)
    })
  })

  describe("Detección de intención", () => {
    it("debe detectar intención de crear algo", () => {
      const queries = [
        "como creo un producto",
        "necesito agregar un cliente",
        "quiero registrar una venta",
        "donde creo una categoria",
      ]

      queries.forEach((query) => {
        const results = findMatchingEntries(query, allHelpEntries, 0.4)
        expect(results.length).toBeGreaterThan(0)
        // Debería encontrar entradas relacionadas con "create/add/new"
        const hasCreateIntent = results.some((r) =>
          ["create", "new", "add", "registro"].some((keyword) =>
            r.entry.id.includes(keyword),
          ),
        )
        expect(hasCreateIntent).toBe(true)
      })
    })

    it("debe detectar intención de editar algo", () => {
      const queries = [
        "como edito un producto",
        "necesito modificar una categoria",
        "quiero cambiar el precio",
      ]

      queries.forEach((query) => {
        const results = findMatchingEntries(query, allHelpEntries, 0.4)
        expect(results.length).toBeGreaterThan(0)
        // Debería encontrar entradas relacionadas con "edit/modify/update"
        const hasEditIntent = results.some((r) =>
          ["edit", "modify", "update", "cambio"].some((keyword) =>
            r.entry.id.includes(keyword) ||
            r.entry.question.toLowerCase().includes(keyword),
          ),
        )
        expect(hasEditIntent).toBe(true)
      })
    })
  })

  describe("Normalización de texto", () => {
    it("debe remover tildes correctamente", () => {
      expect(normalizeText("Cómo creo una cotización")).toBe(
        "como creo una cotizacion",
      )
      expect(normalizeText("añadir categoría")).toBe("anadir categoria")
    })

    it("debe remover puntuación", () => {
      expect(normalizeText("¿Cómo hago una venta?")).toBe("como hago una venta")
      expect(normalizeText("¡Necesito ayuda!")).toBe("necesito ayuda")
    })

    it("debe convertir a minúsculas", () => {
      expect(normalizeText("VENTA NUEVA")).toBe("venta nueva")
    })
  })

  describe("Ranking por relevancia", () => {
    it("debe ordenar resultados por score descendente", () => {
      const results = findMatchingEntries("venta", allHelpEntries)
      expect(results.length).toBeGreaterThan(1)

      // Verificar que los scores están en orden descendente
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score)
      }
    })

    it("debe priorizar coincidencias exactas sobre fuzzy", () => {
      const exact = findMatchingEntries("Como registro una nueva venta", allHelpEntries)
      const fuzzy = findMatchingEntries("registro venta", allHelpEntries)

      expect(exact[0].score).toBeGreaterThan(fuzzy[0].score)
    })
  })

  describe("Casos de uso reales", () => {
    const testCases = [
      { query: "donde veo el inventario", expectedId: "inventory-view" },
      { query: "como agrego un proveedor", expectedId: "providers-add" },
      { query: "necesito hacer una cotizacion", expectedId: "quotes-create" },
      { query: "quiero ver las ventas", expectedId: "sales-history" },
      { query: "como cambio el precio", expectedId: "products-prices" },
    ]

    testCases.forEach(({ query, expectedId }) => {
      it(`debe encontrar "${expectedId}" para "${query}"`, () => {
        const results = findMatchingEntries(query, allHelpEntries, 0.4)
        expect(results.length).toBeGreaterThan(0)

        const found = results.some((r) => r.entry.id.includes(expectedId))
        if (!found) {
          console.log(`Top results for "${query}":`, results.slice(0, 3).map(r => ({
            id: r.entry.id,
            score: r.score,
            matchType: r.matchType
          })))
        }
        expect(found).toBe(true)
      })
    })
  })

  describe("Umbral de coincidencia", () => {
    it("no debe retornar resultados con score muy bajo (< 0.3)", () => {
      const results = findMatchingEntries(
        "xyz123 palabra inventada",
        allHelpEntries,
        0.3,
      )
      // Puede retornar algo por fuzzy matching, pero con score bajo
      results.forEach((r) => {
        expect(r.score).toBeGreaterThanOrEqual(0.3)
      })
    })

    it("debe retornar resultados de calidad con umbral alto (>= 0.7)", () => {
      const results = findMatchingEntries(
        "como registro una venta",
        allHelpEntries,
        0.7,
      )
      expect(results.length).toBeGreaterThan(0)
      results.forEach((r) => {
        expect(r.score).toBeGreaterThanOrEqual(0.7)
      })
    })
  })
})
