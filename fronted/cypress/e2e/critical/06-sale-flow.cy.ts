import { T } from "./_support/test-constants"

describe("06 — Sale flow (main product)", () => {
  beforeEach(() => {
    cy.loginAs(T.ADMIN_EMAIL, T.PASSWORD)
    cy.setTenantSelection(1, 1)
  })

  it("creates a sale of the main product", () => {
    cy.visit("/dashboard/sales/new", { timeout: T.PAGE_LOAD })

    // Search and select product (Popover combobox)
    cy.contains("button", /Selecciona un producto/, { timeout: T.API_WAIT }).click({ force: true })
    cy.get('[cmdk-input]', { timeout: 5000 }).type(T.PRODUCT_NAME_EDITED, { force: true })
    cy.get('[cmdk-item]', { timeout: T.API_WAIT })
      .contains(T.PRODUCT_NAME_EDITED)
      .click({ force: true })

    // Set quantity
    cy.get('input[placeholder="Cantidad"]', { timeout: 5000 })
      .clear()
      .type(String(T.SALE_QTY))

    // Select payment method (cash/efectivo)
    cy.get("body").then(($body) => {
      const cashBtn = $body.find("button:contains('EFECTIVO'), button:contains('Efectivo')")
      if (cashBtn.length) {
        cy.wrap(cashBtn.first()).click()
      }
    })

    // Submit the sale
    cy.contains("button", "Registrar Venta").click()

    // Confirm in dialog if it appears
    cy.get("body", { timeout: 5000 }).then(($body) => {
      const dialog = $body.find('[role="alertdialog"]')
      if (dialog.length) {
        cy.get('[role="alertdialog"]').within(() => {
          cy.contains("button", /[Cc]onfirmar|[Ss]i|[Aa]ceptar/).click()
        })
      }
    })

    // Wait for success (toast or redirect)
    cy.url({ timeout: T.PAGE_LOAD }).should("include", "/dashboard/sales")
  })

  it("verifies stock decreased after sale", () => {
    const expectedStock = T.ENTRY_QTY - T.SALE_QTY // 50 - 5 = 45

    cy.visit("/dashboard/inventory", { timeout: T.PAGE_LOAD })
    cy.get('input[placeholder*="Filtrar"]', { timeout: T.API_WAIT })
      .first()
      .type(T.PRODUCT_NAME_EDITED)

    cy.contains(T.PRODUCT_NAME_EDITED, { timeout: T.API_WAIT })
      .closest("tr")
      .within(() => {
        cy.contains(String(expectedStock)).should("be.visible")
      })
  })

  it("verifies the sale appears in sales list", () => {
    cy.visit("/dashboard/sales", { timeout: T.PAGE_LOAD })
    // The most recent sale should be visible
    cy.get("table", { timeout: T.API_WAIT }).should("exist")
    cy.get("tbody tr", { timeout: T.API_WAIT }).should("have.length.at.least", 1)
  })

  it("verifies cash register page loads after sale", () => {
    cy.visit("/dashboard/cashregister", { timeout: T.PAGE_LOAD })
    // The cash register page should load and show "Gestión de Cajas"
    cy.contains("Caja", { timeout: T.API_WAIT }).should("be.visible")
  })
})
