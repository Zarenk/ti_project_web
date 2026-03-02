import { T } from "./_support/test-constants"

describe("02 — Product CRUD", () => {
  before(() => {
    cy.loginAs(T.ADMIN_EMAIL, T.PASSWORD)
    cy.setTenantSelection(1, 1)
  })

  beforeEach(() => {
    // Restore token from previous test (Cypress clears cookies between tests)
    cy.loginAs(T.ADMIN_EMAIL, T.PASSWORD)
    cy.setTenantSelection(1, 1)
  })

  it("creates a new product", () => {
    cy.visit("/dashboard/products/new", { timeout: T.PAGE_LOAD })

    // Wait for the product form to render (may take time in dev mode)
    cy.get('input[name="name"]', { timeout: T.API_WAIT }).should("exist").type(T.PRODUCT_NAME)

    // Fill purchase price
    cy.get('input[name="price"]').clear().type(String(T.PRODUCT_PRICE))

    // Fill sell price
    cy.get('input[name="priceSell"]').clear().type(String(T.PRODUCT_PRICE_SELL))

    // Select category (shadcn Select component)
    cy.contains("Seleccione una categoria", { timeout: T.API_WAIT }).click({ force: true })
    cy.get('[role="option"]', { timeout: 5000 }).contains(T.CATEGORY_NAME).click({ force: true })

    // Submit
    cy.contains("button", "Crear Producto").click()

    // Wait for success (redirect or toast)
    cy.url({ timeout: T.PAGE_LOAD }).should("include", "/dashboard/products")

    // Verify product appears in list
    cy.visit("/dashboard/products", { timeout: T.PAGE_LOAD })
    cy.contains(T.PRODUCT_NAME, { timeout: T.API_WAIT }).should("be.visible")
  })

  it("edits the product name and price", () => {
    cy.visit("/dashboard/products", { timeout: T.PAGE_LOAD })

    // Open the dropdown menu (⋮) for the product row
    cy.contains("td", T.PRODUCT_NAME, { timeout: T.API_WAIT })
      .closest("tr")
      .find("td:last-child button")
      .scrollIntoView()
      .click({ force: true })

    // Click "Editar" in the dropdown menu (force: true in case menu is near edge)
    cy.get('[role="menuitem"]', { timeout: 5000 })
      .contains("Editar")
      .click({ force: true })

    // Wait for edit page to load
    cy.url({ timeout: T.PAGE_LOAD }).should("include", "/edit")

    // Wait for form to render
    cy.get('input[name="name"]', { timeout: T.API_WAIT }).should("exist")

    // Update name
    cy.get('input[name="name"]').clear().type(T.PRODUCT_NAME_EDITED)

    // Update sell price
    cy.get('input[name="priceSell"]').clear().type(String(T.PRODUCT_PRICE_EDITED))

    // Submit
    cy.contains("button", "Actualizar Producto").click()

    // Wait for success
    cy.url({ timeout: T.PAGE_LOAD }).should("include", "/dashboard/products")

    // Verify updated name in list
    cy.visit("/dashboard/products", { timeout: T.PAGE_LOAD })
    cy.contains(T.PRODUCT_NAME_EDITED, { timeout: T.API_WAIT }).should("be.visible")
  })

  it("creates a product to be deleted", () => {
    cy.visit("/dashboard/products/new", { timeout: T.PAGE_LOAD })

    // Wait for form to render
    cy.get('input[name="name"]', { timeout: T.API_WAIT }).should("exist").type(T.PRODUCT_DELETE_NAME)
    cy.get('input[name="price"]').clear().type("50")
    cy.get('input[name="priceSell"]').clear().type("60")

    cy.contains("Seleccione una categoria", { timeout: T.API_WAIT }).click({ force: true })
    cy.get('[role="option"]', { timeout: 5000 }).contains(T.CATEGORY_NAME).click({ force: true })

    cy.contains("button", "Crear Producto").click()
    cy.url({ timeout: T.PAGE_LOAD }).should("include", "/dashboard/products")
  })

  it("deletes the deletable product", () => {
    cy.visit("/dashboard/products", { timeout: T.PAGE_LOAD })
    cy.contains("td", T.PRODUCT_DELETE_NAME, { timeout: T.API_WAIT }).should("be.visible")

    // Open the dropdown menu (⋮) for the product row
    cy.contains("td", T.PRODUCT_DELETE_NAME)
      .closest("tr")
      .find("td:last-child button")
      .scrollIntoView()
      .click({ force: true })

    // Click "Eliminar" in the dropdown menu (opens AlertDialog)
    cy.get('[role="menuitem"]', { timeout: 5000 })
      .contains("Eliminar")
      .click({ force: true })

    // Confirm deletion in AlertDialog
    cy.get('[role="alertdialog"]', { timeout: 5000 })
      .should("be.visible")
      .within(() => {
        cy.contains("button", "Eliminar").click()
      })

    // Wait for deletion to complete (toast + refresh)
    cy.wait(2000)

    // Verify deleted product is gone
    cy.contains("td", T.PRODUCT_DELETE_NAME).should("not.exist")

    // Verify the other product still exists
    cy.contains(T.PRODUCT_NAME_EDITED, { timeout: T.API_WAIT }).should("be.visible")
  })

  it("creates the series-tracking product", () => {
    cy.visit("/dashboard/products/new", { timeout: T.PAGE_LOAD })

    // Wait for form to render
    cy.get('input[name="name"]', { timeout: T.API_WAIT }).should("exist").type(T.PRODUCT_SERIES_NAME)
    cy.get('input[name="price"]').clear().type(String(T.PRODUCT_COST))
    cy.get('input[name="priceSell"]').clear().type(String(T.PRODUCT_PRICE_SELL))

    cy.contains("Seleccione una categoria", { timeout: T.API_WAIT }).click({ force: true })
    cy.get('[role="option"]', { timeout: 5000 }).contains(T.CATEGORY_NAME).click({ force: true })

    cy.contains("button", "Crear Producto").click()
    cy.url({ timeout: T.PAGE_LOAD }).should("include", "/dashboard/products")

    // Verify
    cy.visit("/dashboard/products", { timeout: T.PAGE_LOAD })
    cy.contains(T.PRODUCT_SERIES_NAME, { timeout: T.API_WAIT }).should("be.visible")
  })
})
