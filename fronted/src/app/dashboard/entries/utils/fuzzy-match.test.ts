import { describe, it, expect } from "vitest"
import {
  normalizeForMatch,
  computeSimilarity,
  findBestMatches,
} from "./fuzzy-match"

// ── normalizeForMatch ──────────────────────────────────────────────

describe("normalizeForMatch", () => {
  it("convierte a mayúsculas", () => {
    expect(normalizeForMatch("teclado mouse")).toBe("TECLADO MOUSE")
  })

  it("reemplaza separadores por espacio", () => {
    expect(normalizeForMatch("TECLADO+MOUSE_WIRELESS")).toBe(
      "TECLADO MOUSE WIRELESS"
    )
    expect(normalizeForMatch("SSD/HDD-500GB")).toBe("SSD HDD 500GB")
  })

  it("colapsa múltiples espacios", () => {
    expect(normalizeForMatch("MOUSE   INALÁMBRICO   USB")).toBe(
      "MOUSE INALÁMBRICO USB"
    )
  })

  it("elimina espacios al inicio y final", () => {
    expect(normalizeForMatch("  MONITOR LED  ")).toBe("MONITOR LED")
  })

  it("maneja cadena vacía", () => {
    expect(normalizeForMatch("")).toBe("")
  })

  it("maneja caracteres especiales combinados", () => {
    expect(normalizeForMatch("FUENTE(500W)[80+PLUS]")).toBe(
      "FUENTE 500W 80 PLUS"
    )
  })
})

// ── computeSimilarity ──────────────────────────────────────────────

describe("computeSimilarity", () => {
  it("retorna 1.0 para strings idénticos", () => {
    expect(computeSimilarity("MOUSE LOGITECH M280", "MOUSE LOGITECH M280")).toBe(1.0)
  })

  it("retorna 1.0 para strings que difieren solo en case/separadores", () => {
    expect(computeSimilarity("mouse-logitech-m280", "MOUSE LOGITECH M280")).toBe(1.0)
  })

  it("retorna score alto (>0.7) para nombres muy similares", () => {
    const score = computeSimilarity(
      "TECLADO+MOUSE STD W. TE4071",
      "TECLADO MOUSE STD WIRELESS TE4071"
    )
    expect(score).toBeGreaterThan(0.7)
  })

  it("retorna score bajo (<0.3) para nombres completamente diferentes", () => {
    const score = computeSimilarity("MONITOR LED 27 PULGADAS", "CABLE USB TIPO C")
    expect(score).toBeLessThan(0.3)
  })

  it("retorna score medio para nombres parcialmente similares", () => {
    const score = computeSimilarity(
      "MEMORIA RAM DDR4 16GB",
      "MEMORIA DDR4 8GB"
    )
    expect(score).toBeGreaterThan(0.4)
    expect(score).toBeLessThan(0.9)
  })

  it("maneja strings vacíos sin error", () => {
    expect(computeSimilarity("", "")).toBe(1.0)
    const score = computeSimilarity("MONITOR", "")
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(1)
  })

  it("detecta coincidencia de model codes", () => {
    const withModel = computeSimilarity(
      "SSD KINGSTON SA400 480GB",
      "DISCO SOLIDO KINGSTON SA400 480GB"
    )
    const withoutModel = computeSimilarity(
      "SSD KINGSTON 480GB",
      "DISCO SOLIDO SAMSUNG 480GB"
    )
    // La versión con model code SA400 coincidente debería puntuar más
    expect(withModel).toBeGreaterThan(withoutModel)
  })

  it("score siempre está entre 0 y 1", () => {
    const testPairs = [
      ["ABC", "XYZ"],
      ["MOUSE", "MOUSE INALAMBRICO"],
      ["A", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"],
      ["123", "456"],
    ]
    for (const [a, b] of testPairs) {
      const score = computeSimilarity(a, b)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    }
  })
})

// ── findBestMatches ──────────────────────────────────────────────

describe("findBestMatches", () => {
  const existingProducts = [
    { id: 1, name: "MOUSE LOGITECH M280 WIRELESS", price: 45, priceSell: 65 },
    { id: 2, name: "TECLADO MECANICO REDRAGON K552", price: 120, priceSell: 170 },
    { id: 3, name: "MONITOR LED LG 24 PULGADAS", price: 500, priceSell: 650 },
    { id: 4, name: "CABLE HDMI 2.0 3 METROS", price: 15, priceSell: 25 },
    { id: 5, name: "MEMORIA RAM DDR4 16GB KINGSTON", price: 180, priceSell: 220 },
    { id: 6, name: "SSD KINGSTON SA400 480GB", price: 150, priceSell: 200 },
    { id: 7, name: "MOUSE LOGITECH M280 NEGRO", price: 42, priceSell: 60 },
  ]

  it("retorna matches ordenados por score descendente", () => {
    const matches = findBestMatches("MOUSE LOGITECH M280", existingProducts)
    expect(matches.length).toBeGreaterThan(0)
    for (let i = 1; i < matches.length; i++) {
      expect(matches[i - 1].score).toBeGreaterThanOrEqual(matches[i].score)
    }
  })

  it("el mejor match es el producto más similar", () => {
    const matches = findBestMatches("MOUSE LOGITECH M280 WIRELESS", existingProducts)
    expect(matches[0].product.id).toBe(1) // Exacto
  })

  it("múltiples variantes del mismo producto puntúan alto", () => {
    const matches = findBestMatches("MOUSE LOGITECH M280", existingProducts)
    const logitechMatches = matches.filter((m) =>
      m.product.name.includes("LOGITECH M280")
    )
    expect(logitechMatches.length).toBe(2) // M280 WIRELESS y M280 NEGRO
    logitechMatches.forEach((m) => {
      expect(m.score).toBeGreaterThan(0.7)
    })
  })

  it("respeta el threshold mínimo", () => {
    const matches = findBestMatches("XYZABC NADA QUE VER", existingProducts, 5, 0.5)
    // No debería haber matches con score >= 0.5 para un nombre random
    matches.forEach((m) => {
      expect(m.score).toBeGreaterThanOrEqual(0.5)
    })
  })

  it("respeta maxResults", () => {
    const matches = findBestMatches("MOUSE", existingProducts, 2, 0.1)
    expect(matches.length).toBeLessThanOrEqual(2)
  })

  it("retorna array vacío si no hay matches sobre el threshold", () => {
    const matches = findBestMatches("PRODUCTO INEXISTENTE ZZZZZ", existingProducts, 5, 0.9)
    expect(matches).toEqual([])
  })

  it("retorna array vacío si la lista de productos está vacía", () => {
    const matches = findBestMatches("MOUSE LOGITECH", [])
    expect(matches).toEqual([])
  })

  it("incluye datos del producto original en el resultado", () => {
    const matches = findBestMatches("SSD KINGSTON SA400", existingProducts)
    expect(matches.length).toBeGreaterThan(0)
    const ssdMatch = matches.find((m) => m.product.id === 6)
    expect(ssdMatch).toBeDefined()
    expect(ssdMatch!.product.price).toBe(150)
    expect(ssdMatch!.product.priceSell).toBe(200)
  })

  it("funciona con threshold 0 (retorna todos)", () => {
    const matches = findBestMatches("ALGO", existingProducts, 100, 0)
    expect(matches.length).toBe(existingProducts.length)
  })

  it("auto-vincula (score >= 0.85) para nombre exacto con variación menor", () => {
    const matches = findBestMatches("MOUSE LOGITECH M280 WIRELESS", existingProducts)
    expect(matches[0].score).toBeGreaterThanOrEqual(0.85)
  })
})