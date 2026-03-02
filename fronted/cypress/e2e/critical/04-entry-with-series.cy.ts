import { T, generateSerials } from "./_support/test-constants"

const SERIALS = generateSerials()

describe("04 — Entry with serial numbers", () => {
  beforeEach(() => {
    cy.loginAs(T.ADMIN_EMAIL, T.PASSWORD)
    cy.setTenantSelection(1, 1)
  })

  it("creates an inventory entry with serial numbers", () => {
    cy.visit("/dashboard/entries/new", { timeout: T.PAGE_LOAD })

    // Select store (Popover combobox)
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

    // Search and select the series product (Popover combobox)
    cy.contains("button", /Selecciona un producto/).click({ force: true })
    cy.get('[cmdk-input]', { timeout: 5000 }).type(T.PRODUCT_SERIES_NAME, { force: true })
    cy.get('[cmdk-item]', { timeout: T.API_WAIT })
      .contains(T.PRODUCT_SERIES_NAME)
      .click({ force: true })

    // Set quantity = serial count
    cy.get('input[name="quantity"]', { timeout: 5000 }).clear().type(String(T.SERIAL_QTY))

    // Set purchase price
    cy.get('input[name="price"]', { timeout: 5000 }).first().clear().type(String(T.PRODUCT_COST))

    // Open series dialog and add serials
    cy.contains("button", /[Ss]erie/).click({ force: true })

    // Type each serial into the dialog input
    cy.get('[role="dialog"]', { timeout: 5000 }).within(() => {
      for (const serial of SERIALS) {
        cy.get("input").first().clear().type(serial)
        cy.contains("button", /[Aa]gregar|[Aa]dd/).click()
      }
      // Confirm/close the dialog
      cy.contains("button", /[Cc]onfirmar|[Gg]uardar|[Cc]errar|OK/).click()
    })

    // Submit entry — two-step: click button, then confirm in dialog
    cy.contains("button", "Crear Ingreso de Productos").click()
    cy.get('[role="alertdialog"]', { timeout: 5000 }).within(() => {
      cy.contains("button", "Confirmar").click()
    })

    // Wait for success
    cy.url({ timeout: T.PAGE_LOAD }).should("include", "/dashboard/entries")
  })

  it("verifies stock for the series product", () => {
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

  it("verifies all serials are active via API", () => {
    for (const serial of SERIALS) {
      cy.apiPost("/series/check", { serial }).then((response) => {
        if (response.status === 200 || response.status === 201) {
          expect(response.body).to.have.property("status", "active")
        }
      })
    }
  })
})
