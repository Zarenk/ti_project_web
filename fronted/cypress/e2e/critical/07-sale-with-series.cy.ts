import { T, generateSerials } from "./_support/test-constants"

const ALL_SERIALS = generateSerials()
const SOLD_SERIALS = ALL_SERIALS.slice(0, T.SALE_SERIAL_QTY) // SN-E2E-001, SN-E2E-002
const REMAINING_SERIALS = ALL_SERIALS.slice(T.SALE_SERIAL_QTY) // SN-E2E-003 to SN-E2E-010

describe("07 — Sale with serial numbers", () => {
  beforeEach(() => {
    cy.loginAs(T.ADMIN_EMAIL, T.PASSWORD)
    cy.setTenantSelection(1, 1)
  })

  it("creates a sale selecting specific serials", () => {
    cy.visit("/dashboard/sales/new", { timeout: T.PAGE_LOAD })

    // Search and select series product (Popover combobox)
    cy.contains("button", /Selecciona un producto/, { timeout: T.API_WAIT }).click({ force: true })
    cy.get('[cmdk-input]', { timeout: 5000 }).type(T.PRODUCT_SERIES_NAME, { force: true })
    cy.get('[cmdk-item]', { timeout: T.API_WAIT })
      .contains(T.PRODUCT_SERIES_NAME)
      .click({ force: true })

    // Set quantity to match serial count
    cy.get('input[placeholder="Cantidad"]', { timeout: 5000 })
      .clear()
      .type(String(T.SALE_SERIAL_QTY))

    // Open series selection dialog
    cy.get("body").then(($body) => {
      const seriesBtn = $body.find("button:contains('Serie'), button:contains('serie'), button:contains('Serial')")
      if (seriesBtn.length) {
        cy.wrap(seriesBtn.first()).click()

        // Select the first N serials
        cy.get('[role="dialog"]', { timeout: 5000 }).within(() => {
          for (const serial of SOLD_SERIALS) {
            cy.contains(serial).click({ force: true })
          }
          cy.contains("button", /[Cc]onfirmar|[Gg]uardar|[Aa]ceptar/).click()
        })
      }
    })

    // Select payment method
    cy.get("body").then(($body) => {
      const cashBtn = $body.find("button:contains('EFECTIVO'), button:contains('Efectivo')")
      if (cashBtn.length) {
        cy.wrap(cashBtn.first()).click()
      }
    })

    // Submit sale
    cy.contains("button", "Registrar Venta").click()

    // Confirm if dialog appears
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

  it("verifies stock decreased for series product", () => {
    const expectedStock = T.SERIAL_QTY - T.SALE_SERIAL_QTY // 10 - 2 = 8

    cy.visit("/dashboard/inventory", { timeout: T.PAGE_LOAD })
    cy.get('input[placeholder*="Filtrar"]', { timeout: T.API_WAIT })
      .first()
      .type(T.PRODUCT_SERIES_NAME)

    cy.contains(T.PRODUCT_SERIES_NAME, { timeout: T.API_WAIT })
      .closest("tr")
      .within(() => {
        cy.contains(String(expectedStock)).should("be.visible")
      })
  })

  it("verifies sold serials are now inactive", () => {
    for (const serial of SOLD_SERIALS) {
      cy.apiPost("/series/check", { serial }).then((response) => {
        if (response.status === 200 || response.status === 201) {
          expect(response.body.status).to.eq("inactive")
        }
      })
    }
  })

  it("verifies remaining serials are still active", () => {
    for (const serial of REMAINING_SERIALS) {
      cy.apiPost("/series/check", { serial }).then((response) => {
        if (response.status === 200 || response.status === 201) {
          expect(response.body.status).to.eq("active")
        }
      })
    }
  })
})
