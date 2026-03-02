import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  validateExtractedSeries,
  type ExtractedProduct,
} from "./series-batch-validator"

// Mock the entries.api module
vi.mock("../entries.api", () => ({
  batchCheckSeries: vi.fn(),
}))

import { batchCheckSeries } from "../entries.api"
const mockBatchCheck = vi.mocked(batchCheckSeries)

// ── Helper ─────────────────────────────────────────────────────────

function makeProduct(
  overrides: Partial<ExtractedProduct> = {}
): ExtractedProduct {
  return {
    name: "Producto Test",
    quantity: 1,
    price: 100,
    priceSell: 150,
    category_name: "Sin categoria",
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────

describe("validateExtractedSeries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("retorna vacío cuando no hay series", async () => {
    const products: ExtractedProduct[] = [
      makeProduct({ name: "Mouse" }),
      makeProduct({ name: "Teclado" }),
    ]

    const result = await validateExtractedSeries(products)

    expect(result.conflicts).toEqual([])
    expect(result.internalDuplicates).toEqual([])
    expect(mockBatchCheck).not.toHaveBeenCalled()
  })

  it("retorna vacío con series vacías (arrays vacíos)", async () => {
    const products: ExtractedProduct[] = [
      makeProduct({ series: [] }),
      makeProduct({ series: [] }),
    ]

    const result = await validateExtractedSeries(products)

    expect(result.conflicts).toEqual([])
    expect(result.internalDuplicates).toEqual([])
    expect(mockBatchCheck).not.toHaveBeenCalled()
  })

  it("detecta duplicados internos entre productos", async () => {
    mockBatchCheck.mockResolvedValue([
      { serial: "ABC001", exists: false },
      { serial: "XYZ999", exists: false },
      { serial: "DUP123", exists: false },
    ])

    const products: ExtractedProduct[] = [
      makeProduct({ name: "Mouse", series: ["ABC001", "DUP123"] }),
      makeProduct({ name: "Teclado", series: ["XYZ999", "DUP123"] }),
    ]

    const result = await validateExtractedSeries(products)

    expect(result.internalDuplicates).toHaveLength(1)
    expect(result.internalDuplicates[0]).toEqual({
      serial: "DUP123",
      productIndexA: 0,
      productIndexB: 1,
    })
  })

  it("detecta series ya existentes en el sistema", async () => {
    mockBatchCheck.mockResolvedValue([
      { serial: "AAA111", exists: true },
      { serial: "BBB222", exists: false },
      { serial: "CCC333", exists: true },
    ])

    const products: ExtractedProduct[] = [
      makeProduct({ name: "Mouse", series: ["AAA111", "BBB222"] }),
      makeProduct({ name: "Teclado", series: ["CCC333"] }),
    ]

    const result = await validateExtractedSeries(products)

    expect(result.conflicts).toHaveLength(2)
    expect(result.conflicts[0].serial).toBe("AAA111")
    expect(result.conflicts[0].productIndex).toBe(0)
    expect(result.conflicts[0].exists).toBe(true)
    expect(result.conflicts[1].serial).toBe("CCC333")
    expect(result.conflicts[1].productIndex).toBe(1)
  })

  it("detecta ambos: duplicados internos y existentes", async () => {
    mockBatchCheck.mockResolvedValue([
      { serial: "SER-A", exists: true },
      { serial: "SER-B", exists: false },
      { serial: "SER-C", exists: false },
    ])

    const products: ExtractedProduct[] = [
      makeProduct({ name: "Producto A", series: ["SER-A", "SER-B"] }),
      makeProduct({ name: "Producto B", series: ["SER-B", "SER-C"] }),
    ]

    const result = await validateExtractedSeries(products)

    // SER-A exists in backend
    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].serial).toBe("SER-A")

    // SER-B is duplicated internally
    expect(result.internalDuplicates).toHaveLength(1)
    expect(result.internalDuplicates[0].serial).toBe("SER-B")
  })

  it("envía una sola llamada API con serials únicos", async () => {
    mockBatchCheck.mockResolvedValue([
      { serial: "UNO", exists: false },
      { serial: "DOS", exists: false },
      { serial: "TRES", exists: false },
    ])

    const products: ExtractedProduct[] = [
      makeProduct({ series: ["UNO", "DOS"] }),
      makeProduct({ series: ["DOS", "TRES"] }), // DOS repetido
    ]

    await validateExtractedSeries(products)

    expect(mockBatchCheck).toHaveBeenCalledTimes(1)
    // Debe enviar 3 serials únicos, no 4
    const calledWith = mockBatchCheck.mock.calls[0][0]
    expect(calledWith).toHaveLength(3)
    expect(new Set(calledWith).size).toBe(3)
  })

  it("trima espacios en las series", async () => {
    mockBatchCheck.mockResolvedValue([
      { serial: "ABC", exists: false },
    ])

    const products: ExtractedProduct[] = [
      makeProduct({ series: ["  ABC  "] }),
    ]

    await validateExtractedSeries(products)

    expect(mockBatchCheck).toHaveBeenCalledWith(["ABC"])
  })

  it("maneja un solo producto con múltiples series", async () => {
    mockBatchCheck.mockResolvedValue([
      { serial: "S1", exists: false },
      { serial: "S2", exists: true },
      { serial: "S3", exists: false },
    ])

    const products: ExtractedProduct[] = [
      makeProduct({ series: ["S1", "S2", "S3"] }),
    ]

    const result = await validateExtractedSeries(products)

    expect(result.conflicts).toHaveLength(1)
    expect(result.conflicts[0].serial).toBe("S2")
    expect(result.conflicts[0].productIndex).toBe(0)
    expect(result.internalDuplicates).toHaveLength(0)
  })

  it("mapea conflictos a todos los productos que tienen esa serie", async () => {
    // Misma serie en 3 productos
    mockBatchCheck.mockResolvedValue([
      { serial: "SHARED", exists: true },
    ])

    const products: ExtractedProduct[] = [
      makeProduct({ name: "A", series: ["SHARED"] }),
      makeProduct({ name: "B", series: ["SHARED"] }),
      makeProduct({ name: "C", series: ["SHARED"] }),
    ]

    const result = await validateExtractedSeries(products)

    // La serie SHARED está en los 3 productos
    const sharedConflicts = result.conflicts.filter(
      (c) => c.serial === "SHARED"
    )
    expect(sharedConflicts).toHaveLength(3)
    expect(sharedConflicts.map((c) => c.productIndex).sort()).toEqual([0, 1, 2])
  })

  it("sin conflictos cuando todas las series son nuevas y únicas", async () => {
    mockBatchCheck.mockResolvedValue([
      { serial: "NEW-1", exists: false },
      { serial: "NEW-2", exists: false },
      { serial: "NEW-3", exists: false },
    ])

    const products: ExtractedProduct[] = [
      makeProduct({ series: ["NEW-1"] }),
      makeProduct({ series: ["NEW-2"] }),
      makeProduct({ series: ["NEW-3"] }),
    ]

    const result = await validateExtractedSeries(products)

    expect(result.conflicts).toEqual([])
    expect(result.internalDuplicates).toEqual([])
  })
})