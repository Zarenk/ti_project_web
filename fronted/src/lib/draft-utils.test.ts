import { describe, it, expect, beforeEach, vi } from "vitest"
import { clearFormDrafts, isDraftExpired, DRAFT_TTL_MS } from "./draft-utils"

describe("DRAFT_TTL_MS", () => {
  it("es exactamente 24 horas en milisegundos", () => {
    expect(DRAFT_TTL_MS).toBe(24 * 60 * 60 * 1000)
    expect(DRAFT_TTL_MS).toBe(86_400_000)
  })
})

describe("clearFormDrafts", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("elimina claves con prefijos de draft", () => {
    localStorage.setItem("sales-draft:v1:1:1:1", '{"version":1}')
    localStorage.setItem("entry-draft:v1:2:1:1", '{"version":1}')

    clearFormDrafts()

    expect(localStorage.getItem("sales-draft:v1:1:1:1")).toBeNull()
    expect(localStorage.getItem("entry-draft:v1:2:1:1")).toBeNull()
  })

  it("no elimina claves que no son de draft", () => {
    localStorage.setItem("token", "jwt-abc")
    localStorage.setItem("theme", "dark")
    localStorage.setItem("other-key", "value")

    clearFormDrafts()

    expect(localStorage.getItem("token")).toBe("jwt-abc")
    expect(localStorage.getItem("theme")).toBe("dark")
    expect(localStorage.getItem("other-key")).toBe("value")
  })

  it("maneja localStorage vacio sin error", () => {
    expect(() => clearFormDrafts()).not.toThrow()
  })

  it("elimina claves de los 4 prefijos", () => {
    localStorage.setItem("sales-draft:v1:1:1:1", "{}")
    localStorage.setItem("sales-context:v1:1:1:1", "{}")
    localStorage.setItem("entry-draft:v1:2:1:1", "{}")
    localStorage.setItem("entry-context:v1:2:1:1", "{}")
    localStorage.setItem("token", "keep-me")

    clearFormDrafts()

    expect(localStorage.getItem("sales-draft:v1:1:1:1")).toBeNull()
    expect(localStorage.getItem("sales-context:v1:1:1:1")).toBeNull()
    expect(localStorage.getItem("entry-draft:v1:2:1:1")).toBeNull()
    expect(localStorage.getItem("entry-context:v1:2:1:1")).toBeNull()
    expect(localStorage.getItem("token")).toBe("keep-me")
  })

  it("elimina multiples claves del mismo prefijo", () => {
    localStorage.setItem("sales-draft:v1:1:1:1", "{}")
    localStorage.setItem("sales-draft:v1:2:3:4", "{}")
    localStorage.setItem("sales-draft:v1:99:10:5", "{}")

    clearFormDrafts()

    expect(localStorage.getItem("sales-draft:v1:1:1:1")).toBeNull()
    expect(localStorage.getItem("sales-draft:v1:2:3:4")).toBeNull()
    expect(localStorage.getItem("sales-draft:v1:99:10:5")).toBeNull()
  })

  it("no falla si localStorage lanza error", () => {
    const originalKey = localStorage.key.bind(localStorage)
    vi.spyOn(localStorage, "key").mockImplementation(() => {
      throw new Error("Storage error")
    })

    expect(() => clearFormDrafts()).not.toThrow()

    vi.restoreAllMocks()
  })
})

describe("isDraftExpired", () => {
  it("retorna true si savedAt es undefined", () => {
    expect(isDraftExpired(undefined)).toBe(true)
  })

  it("retorna true si savedAt no es number", () => {
    expect(isDraftExpired("string" as unknown as number | undefined)).toBe(true)
    expect(isDraftExpired(null as unknown as number | undefined)).toBe(true)
  })

  it("retorna true si el draft tiene mas de 24 horas", () => {
    const twentyFiveHoursAgo = Date.now() - 25 * 60 * 60 * 1000
    expect(isDraftExpired(twentyFiveHoursAgo)).toBe(true)
  })

  it("retorna false si el draft tiene menos de 24 horas", () => {
    const oneHourAgo = Date.now() - 1 * 60 * 60 * 1000
    expect(isDraftExpired(oneHourAgo)).toBe(false)
  })

  it("retorna false si el draft es reciente (1 minuto)", () => {
    const oneMinuteAgo = Date.now() - 60_000
    expect(isDraftExpired(oneMinuteAgo)).toBe(false)
  })

  it("retorna false si savedAt es ahora mismo", () => {
    expect(isDraftExpired(Date.now())).toBe(false)
  })

  it("retorna true justo despues del limite de 24h", () => {
    const justExpired = Date.now() - DRAFT_TTL_MS - 1
    expect(isDraftExpired(justExpired)).toBe(true)
  })

  it("retorna false justo antes del limite de 24h", () => {
    const almostExpired = Date.now() - DRAFT_TTL_MS + 1000
    expect(isDraftExpired(almostExpired)).toBe(false)
  })
})
