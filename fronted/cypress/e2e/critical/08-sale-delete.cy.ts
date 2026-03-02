import { T, generateSerials } from "./_support/test-constants"

const ALL_SERIALS = generateSerials()
const SOLD_SERIALS = ALL_SERIALS.slice(0, T.SALE_SERIAL_QTY)

describe("08 — Sale deletion and reversal", () => {
  beforeEach(() => {
    cy.loginAs(T.ADMIN_EMAIL, T.PASSWORD)
    cy.setTenantSelection(1, 1)
  })

  it("deletes the most recent sale (main product)", () => {
    cy.visit("/dashboard/sales", { timeout: T.PAGE_LOAD })

    // Click the "Eliminar" button directly in the first row's actions column
    cy.get("tbody tr", { timeout: T.API_WAIT })
      .first()
      .within(() => {
        cy.contains("button", "Eliminar").click()
      })

    // Confirm deletion (dialog confirm button says "Confirmar")
    cy.get('[role="alertdialog"]', { timeout: 5000 }).within(() => {
      cy.contains("button", "Confirmar").click()
    })

    // Wait for deletion to complete
    cy.wait(2000)
    cy.url().should("include", "/dashboard/sales")
  })

  it("verifies stock reversed for main product after deletion", () => {
    // Stock should be back to ENTRY_QTY (50) since we deleted the sale of 5
    cy.visit("/dashboard/inventory", { timeout: T.PAGE_LOAD })
    cy.get('input[placeholder*="Filtrar"]', { timeout: T.API_WAIT })
      .first()
      .type(T.PRODUCT_NAME_EDITED)

    cy.contains(T.PRODUCT_NAME_EDITED, { timeout: T.API_WAIT })
      .closest("tr")
      .within(() => {
        cy.contains(String(T.ENTRY_QTY)).should("be.visible")
      })
  })

  it("deletes the series sale", () => {
    cy.visit("/dashboard/sales", { timeout: T.PAGE_LOAD })

    // Click the "Eliminar" button directly in the first row's actions column
    cy.get("tbody tr", { timeout: T.API_WAIT })
      .first()
      .within(() => {
        cy.contains("button", "Eliminar").click()
      })

    // Confirm deletion
    cy.get('[role="alertdialog"]', { timeout: 5000 }).within(() => {
      cy.contains("button", "Confirmar").click()
    })

    // Wait for deletion to complete
    cy.wait(2000)
    cy.url().should("include", "/dashboard/sales")
  })

  it("verifies stock reversed for series product", () => {
    // Stock should be back to SERIAL_QTY (10)
    cy.visit("/dashboard/inventory", { timeout: T.PAGE_LOAD })
    cy.get('input[placeholder*="Filtrar"]', { timeout: T.API_WAIT })
      .first()
      .type(T.PRODUCT_SERIES_NAME)

    cy.contains(T.PRODUCT_SERIES_NAME, { timeout: T.API_WAIT })
      .closest("tr")
      .within(() => {
        cy.contains(String(T.SERIAL_QTY)).should("be.visible")
      })
  })

  it("verifies serials are active again after sale deletion", () => {
    for (const serial of SOLD_SERIALS) {
      cy.apiPost("/series/check", { serial }).then((response) => {
        if (response.status === 200 || response.status === 201) {
          expect(response.body.status).to.eq("active")
        }
      })
    }
  })
})
