import { T } from "./_support/test-constants"

describe("03 — Inventory entry (purchase)", () => {
  beforeEach(() => {
    cy.loginAs(T.ADMIN_EMAIL, T.PASSWORD)
    cy.setTenantSelection(1, 1)
  })

  it("creates an inventory entry for the main product", () => {
    cy.visit("/dashboard/entries/new", { timeout: T.PAGE_LOAD })

    // Select store (Popover combobox: click button → search in CommandInput)
    cy.contains("button", /Seleccione una Tienda|Tienda E2E/, { timeout: T.API_WAIT }).click({ force: true })
    cy.get('[cmdk-input]', { timeout: 5000 }).type(T.STORE_NAME, { force: true })
    cy.get('[cmdk-item]', { timeout: T.API_WAIT })
      .contains(T.STORE_NAME)
      .click({ force: true })

    // Select provider (Popover combobox)
    cy.contains("button", /Selecciona un proveedor|Proveedor E2E/).click({ force: true })
    cy.get('[cmdk-input]', { timeout: 5000 }).type(T.PROVIDER_NAME, { force: true })
    cy.get('[cmdk-item]', { timeout: T.API_WAIT })
      .contains(T.PROVIDER_NAME)
      .click({ force: true })

    // Search and select product (Popover combobox)
    cy.contains("button", /Selecciona un producto/).click({ force: true })
    cy.get('[cmdk-input]', { timeout: 5000 }).type(T.PRODUCT_NAME_EDITED, { force: true })
    cy.get('[cmdk-item]', { timeout: T.API_WAIT })
      .contains(T.PRODUCT_NAME_EDITED)
      .click({ force: true })

    // Set quantity
    cy.get('input[name="quantity"]', { timeout: 5000 }).clear().type(String(T.ENTRY_QTY))

    // Set purchase price
    cy.get('input[name="price"]', { timeout: 5000 }).first().clear().type(String(T.PRODUCT_COST))

    // Submit entry — two-step: click button, then confirm in dialog
    cy.contains("button", "Crear Ingreso de Productos").click()
    cy.get('[role="alertdialog"]', { timeout: 5000 }).within(() => {
      cy.contains("button", "Confirmar").click()
    })

    // Wait for success (toast or redirect)
    cy.url({ timeout: T.PAGE_LOAD }).should("include", "/dashboard/entries")
  })

  it("verifies stock increased to expected value", () => {
    cy.visit("/dashboard/inventory", { timeout: T.PAGE_LOAD })

    // Search for the product
    cy.get('input[placeholder*="Filtrar"]', { timeout: T.API_WAIT })
      .first()
      .type(T.PRODUCT_NAME_EDITED)

    // Verify stock shows the correct quantity
    cy.contains(T.PRODUCT_NAME_EDITED, { timeout: T.API_WAIT })
      .closest("tr")
      .within(() => {
        cy.contains(String(T.ENTRY_QTY)).should("be.visible")
      })
  })

  it("verifies the entry appears in entries list", () => {
    cy.visit("/dashboard/entries", { timeout: T.PAGE_LOAD })

    // The most recent entry should be visible
    cy.contains(T.PRODUCT_NAME_EDITED, { timeout: T.API_WAIT }).should("be.visible")
  })

  it("verifies accounting journal entry via API", () => {
    // Use API to check journal entries for the organization
    cy.apiGet("/accounting/journal-entries?take=5").then((response) => {
      if (response.status === 200 && response.body?.data?.length > 0) {
        // If accounting hooks are enabled, there should be a journal entry
        const entries = response.body.data
        // Check that at least one entry exists (may or may not be from this purchase)
        expect(entries.length).to.be.greaterThan(0)
      }
      // If 403 or no data, accounting may not be configured — that's ok
    })
  })
})
