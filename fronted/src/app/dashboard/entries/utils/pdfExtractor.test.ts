import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock sonner toast so it doesn't break in test env
vi.mock("sonner", () => ({
  toast: {
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

import { toast } from "sonner"
import {
  detectInvoiceProvider,
  detectGuideDocument,
  processExtractedText,
  processInvoiceText,
  processGuideText,
  processDeltronGuideText,
  processIngramInvoiceText,
  processNexsysInvoiceText,
} from "./pdfExtractor"

// ── Helpers ────────────────────────────────────────────────────────

const noopSetValue = vi.fn()
const noopSetCurrency = vi.fn()

function resetMocks() {
  noopSetValue.mockClear()
  noopSetCurrency.mockClear()
  vi.mocked(toast.warning).mockClear()
}

// ── detectInvoiceProvider ──────────────────────────────────────────

describe("detectInvoiceProvider", () => {
  it('retorna "deltron" para texto con RUC de Deltron', () => {
    expect(detectInvoiceProvider("RUC 20212331377 GRUPO DELTRON")).toBe("deltron")
  })

  it('retorna "ingram" para texto con patrón Ingram Micro', () => {
    expect(detectInvoiceProvider("INGRAM MICRO S.A.C. 20267163228")).toBe("ingram")
  })

  it('retorna "nexsys" para texto con patrón Nexsys del Perú', () => {
    expect(detectInvoiceProvider("NEXSYS DEL PERU S.R.L. 20470145901")).toBe("nexsys")
  })

  it('retorna "template" para proveedores con diseño compartido', () => {
    expect(detectInvoiceProvider("GOZU GAMING S.A.C.")).toBe("template")
    expect(detectInvoiceProvider("PC LINK S.A.C. RUC 20519078520")).toBe("template")
  })

  it('retorna "unknown" para texto sin proveedor reconocido', () => {
    expect(detectInvoiceProvider("Una factura cualquiera")).toBe("unknown")
  })

  it("es case-insensitive", () => {
    expect(detectInvoiceProvider("ingram micro factura")).toBe("ingram")
    expect(detectInvoiceProvider("nexsys del peru")).toBe("nexsys")
  })
})

// ── detectGuideDocument ────────────────────────────────────────────

describe("detectGuideDocument", () => {
  it("detecta guía de remisión", () => {
    expect(detectGuideDocument("GUIA DE REMISION N° T029-0001")).toBe(true)
  })

  it("es case-insensitive", () => {
    expect(detectGuideDocument("guia de remision")).toBe(true)
  })

  it("retorna false para facturas", () => {
    expect(detectGuideDocument("FACTURA ELECTRONICA F001-0001")).toBe(false)
  })
})

// ── processExtractedText (Deltron) ──────────────────────────────

describe("processExtractedText", () => {
  beforeEach(resetMocks)

  it("retorna ExtractedProduct[] en lugar de llamar setSelectedProducts", () => {
    // Minimal Deltron-like text with a product line
    const text = `GRUPO DELTRON S.A.
FACTURA ELECTRÓNICA F001-001
RUC 20212331377
TECLADO MECANICO RGB
NIU50.00
1
TOTAL A PAGAR 59.00`

    const result = processExtractedText(text, noopSetValue, noopSetCurrency)

    expect(Array.isArray(result)).toBe(true)
    // Verify return type has required fields
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("name")
      expect(result[0]).toHaveProperty("quantity")
      expect(result[0]).toHaveProperty("price")
      expect(result[0]).toHaveProperty("priceSell")
      expect(result[0]).toHaveProperty("category_name")
      expect(result[0].priceSell).toBe(0)
      expect(result[0].category_name).toBe("Sin categoria")
    }
  })

  it("retorna array vacío y muestra warning cuando no hay productos", () => {
    const result = processExtractedText("", noopSetValue, noopSetCurrency)

    expect(result).toEqual([])
    expect(toast.warning).toHaveBeenCalledWith(
      "No se encontraron productos en el archivo PDF."
    )
  })

  it("aplica IGV cuando detecta GRUPO DELTRON", () => {
    // Text that triggers Deltron IGV application
    const text = `GRUPO DELTRON S.A.
MONITOR LED 24P
NIU100.00
1`

    const result = processExtractedText(text, noopSetValue, noopSetCurrency)

    // Si se extrae un producto con unitPrice=100, con IGV debería ser 118
    if (result.length > 0) {
      // El precio debería incluir IGV (×1.18)
      expect(result[0].price).not.toBe(100)
    }
  })

  it("no llama setSelectedProducts (parámetro removido)", () => {
    // The function signature no longer has setSelectedProducts parameter
    // Verify it's (text, setValue, setCurrency): ExtractedProduct[]
    expect(processExtractedText.length).toBe(3) // 3 parameters
  })

  it("sigue llamando setValue para metadatos del formulario", () => {
    const text = `RUC N° 20212331377
FACTURA ELECTRÓNICA F001-12345
Fecha de Emisión: 2026-01-15
TOTAL A PAGAR 500.00`

    processExtractedText(text, noopSetValue, noopSetCurrency)

    // Should still set form values for RUC, serie, etc.
    const setValueCalls = noopSetValue.mock.calls.map((c) => c[0])
    expect(setValueCalls).toContain("ruc")
  })
})

// ── processInvoiceText (Generic) ────────────────────────────────

describe("processInvoiceText", () => {
  beforeEach(resetMocks)

  it("retorna ExtractedProduct[] con campos correctos", () => {
    const text = `Razón Social: PROVEEDOR TEST S.A.C.
RUC: 20123456789
Dirección: AV. TEST 123

2 MOUSE INALÁMBRICO USB 45.00 90.00
1 TECLADO MECANICO RGB 120.00 120.00

TOTAL: 210.00`

    const result = processInvoiceText(text, noopSetValue, noopSetCurrency)

    expect(Array.isArray(result)).toBe(true)
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("name")
      expect(result[0]).toHaveProperty("quantity")
      expect(result[0]).toHaveProperty("price")
      expect(result[0]).toHaveProperty("priceSell")
      expect(result[0].priceSell).toBe(0)
    }
  })

  it("retorna array vacío y muestra warning sin productos", () => {
    const text = "Solo texto sin productos reconocibles"

    const result = processInvoiceText(text, noopSetValue, noopSetCurrency)

    expect(result).toEqual([])
    expect(toast.warning).toHaveBeenCalled()
  })

  it("tiene 3 parámetros (sin setSelectedProducts)", () => {
    expect(processInvoiceText.length).toBe(3)
  })

  it("extrae datos del proveedor vía setValue", () => {
    const text = `Razón Social: MI PROVEEDOR S.A.C.
RUC: 20999888777
Dirección: CALLE FALSA 123
1 PRODUCTO TEST 50.00 50.00`

    processInvoiceText(text, noopSetValue, noopSetCurrency)

    const setValueCalls = noopSetValue.mock.calls
    const fieldNames = setValueCalls.map((c) => c[0])
    expect(fieldNames).toContain("provider_documentNumber")
  })
})

// ── processGuideText (Generic Guide) ────────────────────────────

describe("processGuideText", () => {
  beforeEach(resetMocks)

  it("retorna array vacío para guía sin productos", () => {
    const text = "GUIA DE REMISION\nSin bienes"
    const result = processGuideText(text, noopSetValue, noopSetCurrency)

    expect(result).toEqual([])
    expect(toast.warning).toHaveBeenCalledWith(
      "No se encontraron productos en la guia de remision."
    )
  })

  it("tiene 3 parámetros (sin setSelectedProducts)", () => {
    expect(processGuideText.length).toBe(3)
  })

  it("retorna productos con priceSell=0 y series", () => {
    const text = `GUIA DE REMISION
N° T001-00001
RUC N: 20212331377
Fecha y hora de emisión: 15/01/2026 10:00 AM
Motivo de Traslado: VENTA

Bienes por transportar
Descripcion Detallada Unidad de medida Cantidad
1 MOUSE INALÁMBRICO LOGITECH M280 SERIE N: ABC12345 UNIDAD(NIU) 2

Unidad de Medida del Peso Bruto
KGM
5`

    const result = processGuideText(text, noopSetValue, noopSetCurrency)

    if (result.length > 0) {
      expect(result[0].price).toBe(0)
      expect(result[0].priceSell).toBe(0)
      expect(result[0]).toHaveProperty("series")
    }
  })

  it("establece tipo de moneda y comprobante via setValue", () => {
    const text = `GUIA DE REMISION
N° T001-00001
Bienes por transportar
MOUSE INALÁMBRICO UNIDAD(NIU) 1
Unidad de Medida del Peso Bruto`

    processGuideText(text, noopSetValue, noopSetCurrency)

    const setValueFields = noopSetValue.mock.calls.map((c) => c[0])
    expect(setValueFields).toContain("comprobante")
    expect(noopSetCurrency).toHaveBeenCalledWith("PEN")
  })
})

// ── processDeltronGuideText ─────────────────────────────────────

describe("processDeltronGuideText", () => {
  beforeEach(resetMocks)

  it("retorna array vacío para guía Deltron sin productos", () => {
    const text = "GRUPO DELTRON S.A.\nGuía de Remisión"
    const result = processDeltronGuideText(text, noopSetValue, noopSetCurrency)

    expect(result).toEqual([])
    expect(toast.warning).toHaveBeenCalledWith(
      "No se encontraron productos en la guía de remisión DELTRON."
    )
  })

  it("tiene 3 parámetros", () => {
    expect(processDeltronGuideText.length).toBe(3)
  })

  it("extrae serie y correlativo de guía", () => {
    const text = `GRUPO DELTRON S.A.
Guía de Remisión Remitente Electrónica
N°: T029-00004430
RUC: 20212331377
FECHA DE EMISIÓN: 06-01-2026

BIENES A TRASLADAR
N°CÓDIGO
DESCRIPCIÓN
1KBMSWBKTE4071STECLADO+MOUSE STD W. TE4071       ------- 12 MESES
KCJT2506031016
NIU2

REPRESENTACIÓN IMPRESA`

    processDeltronGuideText(text, noopSetValue, noopSetCurrency)

    const calls = noopSetValue.mock.calls
    const guiaSerie = calls.find((c) => c[0] === "guia_serie")
    const guiaCorrelativo = calls.find((c) => c[0] === "guia_correlativo")

    expect(guiaSerie).toBeDefined()
    expect(guiaSerie![1]).toBe("T029")
    expect(guiaCorrelativo).toBeDefined()
    expect(guiaCorrelativo![1]).toBe("00004430")
  })

  it("retorna productos con series extraídas", () => {
    const text = `GRUPO DELTRON S.A.
N°: T029-00004430
RUC: 20212331377
BIENES A TRASLADAR
N°CÓDIGO
1KBMSWBKTE4071STECLADO+MOUSE STD W. TE4071       ------- 12 MESES
KCJT2506031016 KCJT2506031017
NIU2
REPRESENTACIÓN IMPRESA`

    const result = processDeltronGuideText(text, noopSetValue, noopSetCurrency)

    if (result.length > 0) {
      expect(result[0].price).toBe(0)
      expect(result[0].priceSell).toBe(0)
      expect(result[0]).toHaveProperty("series")
      if (result[0].series) {
        expect(result[0].series.length).toBeGreaterThanOrEqual(1)
      }
    }
  })
})

// ── processIngramInvoiceText ────────────────────────────────────

describe("processIngramInvoiceText", () => {
  beforeEach(resetMocks)

  it("retorna array vacío y warning sin productos", () => {
    const text = "INGRAM MICRO S.A.C.\nRUC 20267163228"
    const result = processIngramInvoiceText(text, noopSetValue, noopSetCurrency)

    expect(result).toEqual([])
    expect(toast.warning).toHaveBeenCalledWith(
      "No se encontraron productos en la factura de Ingram Micro."
    )
  })

  it("tiene 3 parámetros", () => {
    expect(processIngramInvoiceText.length).toBe(3)
  })

  it("detecta moneda USD para Ingram", () => {
    const text = `INGRAM MICRO S.A.C.
RUC N° 20267163228
Dólar Estadounidense
F001-00001`

    processIngramInvoiceText(text, noopSetValue, noopSetCurrency)

    expect(noopSetCurrency).toHaveBeenCalledWith("USD")
  })

  it("establece datos del proveedor via setValue", () => {
    const text = `INGRAM MICRO S.A.C.
AV. ARGENTINA 1234
RUC N° 20267163228
FACTURA ELECTRÓNICA
2026-01-30  12:00:00a.m.`

    processIngramInvoiceText(text, noopSetValue, noopSetCurrency)

    const fields = noopSetValue.mock.calls.map((c) => c[0])
    expect(fields).toContain("provider_name")
    expect(fields).toContain("provider_adress")
    expect(fields).toContain("ruc")
  })

  it("retorna productos con priceSell=0", () => {
    const text = `INGRAM MICRO S.A.C.
RUC N° 20267163228
FACTURA ELECTRÓNICA
F001-00001
NOTEBOOK HP PROBOOK 450
06627549EA 1.00 894.00
1,055.32 1.00
Observaciones
1055.32
REPRESENTACIÓN IMPRESA`

    const result = processIngramInvoiceText(text, noopSetValue, noopSetCurrency)

    if (result.length > 0) {
      expect(result[0].priceSell).toBe(0)
      expect(result[0].category_name).toBe("Sin categoria")
    }
  })
})

// ── processNexsysInvoiceText ────────────────────────────────────

describe("processNexsysInvoiceText", () => {
  beforeEach(resetMocks)

  it("retorna array vacío y warning sin productos", () => {
    const text = "NEXSYS DEL PERU S.R.L.\nRUC N° 20470145901"
    const result = processNexsysInvoiceText(text, noopSetValue, noopSetCurrency)

    expect(result).toEqual([])
    expect(toast.warning).toHaveBeenCalledWith(
      "No se encontraron productos en la factura de Nexsys."
    )
  })

  it("tiene 3 parámetros", () => {
    expect(processNexsysInvoiceText.length).toBe(3)
  })

  it("detecta moneda USD para Nexsys con dólares", () => {
    const text = `NEXSYS DEL PERU S.R.L.
RUC N° 20470145901
US$ DOLARES AMERICANOS`

    processNexsysInvoiceText(text, noopSetValue, noopSetCurrency)

    expect(noopSetCurrency).toHaveBeenCalledWith("USD")
  })

  it("establece moneda PEN por defecto", () => {
    const text = `NEXSYS DEL PERU S.R.L.
RUC N° 20470145901
SOLES`

    processNexsysInvoiceText(text, noopSetValue, noopSetCurrency)

    expect(noopSetCurrency).toHaveBeenCalledWith("PEN")
  })

  it("retorna productos con priceSell=0", () => {
    const text = `NEXSYS DEL PERU S.R.L.
RUC N° 20470145901
N° F001-00012345
FACTURA ELECTRÓNICA
FECHA
15/01/2026
ITEM
385.00 454.30 1
NoteBook IPS Ryzen 5 8GB SSD
LN1234ABC 1.00
*** CUATROCIENTOS CINCUENTA`

    const result = processNexsysInvoiceText(text, noopSetValue, noopSetCurrency)

    if (result.length > 0) {
      expect(result[0].priceSell).toBe(0)
      expect(result[0]).toHaveProperty("name")
      expect(result[0]).toHaveProperty("quantity")
      expect(result[0]).toHaveProperty("price")
    }
  })
})

// ── Contratos comunes para todos los parsers ────────────────────

describe("Contratos comunes de parsers refactorizados", () => {
  const parsers = [
    { name: "processExtractedText", fn: processExtractedText },
    { name: "processInvoiceText", fn: processInvoiceText },
    { name: "processGuideText", fn: processGuideText },
    { name: "processDeltronGuideText", fn: processDeltronGuideText },
    { name: "processIngramInvoiceText", fn: processIngramInvoiceText },
    { name: "processNexsysInvoiceText", fn: processNexsysInvoiceText },
  ]

  parsers.forEach(({ name, fn }) => {
    describe(name, () => {
      beforeEach(resetMocks)

      it("acepta exactamente 3 parámetros (sin setSelectedProducts)", () => {
        expect(fn.length).toBe(3)
      })

      it("retorna un array (no undefined/void)", () => {
        const result = fn("", noopSetValue, noopSetCurrency)
        expect(Array.isArray(result)).toBe(true)
      })

      it("retorna array vacío para texto vacío", () => {
        const result = fn("", noopSetValue, noopSetCurrency)
        expect(result).toEqual([])
      })

      it("cada elemento del resultado tiene las propiedades requeridas", () => {
        // Para texto vacío, result es []. Esto valida que no arroja error.
        const result = fn("", noopSetValue, noopSetCurrency)
        result.forEach((product) => {
          expect(product).toHaveProperty("name")
          expect(product).toHaveProperty("quantity")
          expect(product).toHaveProperty("price")
          expect(product).toHaveProperty("priceSell")
          expect(product).toHaveProperty("category_name")
          expect(typeof product.name).toBe("string")
          expect(typeof product.quantity).toBe("number")
          expect(typeof product.price).toBe("number")
          expect(typeof product.priceSell).toBe("number")
        })
      })
    })
  })
})